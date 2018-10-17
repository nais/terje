import {fetchRole, replaceRole} from './role/sagas';
import {call} from 'redux-saga/effects';
import {V1ObjectMeta} from '@kubernetes/client-node';
import {handleResourceEvent} from './sagas';
import {EVENT_RESOURCE_ADDED, EVENT_RESOURCE_DELETED} from './resourcewatcher/events';
import {addResourceToRole, createRole} from "./role/creator";
import {syncRoleBinding} from "./rolebinding/sagas";
import NodeCache from "node-cache";

test('test resource create event leads to fetchRole and replaceRole sagas', () => {
    const metadata = new V1ObjectMeta();
    metadata.name = 'debug-68cffcddb-vrstj';
    metadata.namespace = 'namespace';
    metadata.labels = {'team': 'aura'};
    metadata.selfLink = '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj';

    const event = {
        type: EVENT_RESOURCE_ADDED,
        metadata: metadata
    };

    const mockRoleResponse = createRole('nais:team:aura', metadata.namespace);
    addResourceToRole(mockRoleResponse, 'pods', metadata.name);

    const cache = new NodeCache();
    const gen = handleResourceEvent(event, cache);

    expect(gen.next().value).toEqual(
        call(fetchRole, 'nais:team:' + metadata.labels['team'], metadata.namespace)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        call(replaceRole, mockRoleResponse)
    );

    expect(gen.next().value).toEqual(
        call(syncRoleBinding, cache, metadata.labels['team'], metadata.namespace)
    );

    expect(gen.next().done).toBeTruthy();
});

test('test resource deleted event leads to fetchRole and replaceRole sagas', () => {
    const metadata = new V1ObjectMeta();
    metadata.name = 'debug-68cffcddb-vrstj';
    metadata.namespace = 'namespace';
    metadata.labels = {'team': 'aura'};
    metadata.selfLink = '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj';

    const mockRoleResponse = createRole('nais:team:aura', metadata.namespace);
    addResourceToRole(mockRoleResponse, 'pods', metadata.name);

    const event = {
        type: EVENT_RESOURCE_DELETED,
        metadata: metadata
    };

    const cache = new NodeCache();
    const gen = handleResourceEvent(event, cache);

    expect(gen.next().value).toEqual(
        call(fetchRole, 'nais:team:' + metadata.labels['team'], metadata.namespace)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        call(replaceRole, mockRoleResponse)
    );

    expect(gen.next().value).toEqual(
        call(syncRoleBinding, cache, metadata.labels['team'], metadata.namespace)
    );

    expect(gen.next().done).toBeTruthy();
});
