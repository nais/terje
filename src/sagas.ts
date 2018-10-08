import {all, call, cancelled, take} from "redux-saga/effects";
import {watchApiResources} from "./resourcewatcher/eventChannel";
import {addResourceToRole, removeResourceFromRole} from "./role/rolecreator";
import {fetchRole, replaceRole} from "./role/sagas";
import {EVENT_RESOURCE_ADDED, EVENT_RESOURCE_DELETED, EVENT_RESOURCE_MODIFIED} from "./resourcewatcher/events";
import {V1ObjectMeta, V1Role} from "@kubernetes/client-node";

import parentLogger from "./logger";

const logger = parentLogger.child({module: 'main'});

export function* handleResourceEvent(event: { type: string, metadata: V1ObjectMeta }) {
    logger.info("Saga got event for resource", event.metadata.name, "in namespace", event.metadata.namespace);

    let resourceType = getResourceTypeFromSelfLink(event.metadata.selfLink);
    let team = getTeamFromMetadata(event.metadata.labels);
    if (!(team)) {
        logger.info("Empty team name label, skipping");
        return
    }

    const role = yield call(fetchRole, 'nais:team:' + team, event.metadata.namespace);

    let updatedRole: V1Role = undefined;

    switch (event.type) {
        case EVENT_RESOURCE_ADDED:
            updatedRole = addResourceToRole(role, resourceType, event.metadata.name);
            break;
        case EVENT_RESOURCE_DELETED:
            updatedRole = removeResourceFromRole(role, resourceType, event.metadata.name);
            break;
        case EVENT_RESOURCE_MODIFIED:
            updatedRole = addResourceToRole(role, resourceType, event.metadata.name);
            // remove resource from other roles
            break;
        default:
            logger.info('invalid event type:', event);
            return;

    }

    yield call(replaceRole, updatedRole);
}

function* watchResourceEvents() {
    const resourceEventsChannel = yield call(watchApiResources);

    try {
        while (true) {
            try {
                let event = yield take(resourceEventsChannel);
                yield handleResourceEvent(event);
            } catch (e) {
                logger.warn("failed while processing even: %s", e)
            }
        }
    } finally {
        if (yield cancelled()) {
            resourceEventsChannel.close();
            logger.info('Metadata event channel cancelled');
        }
    }
}


export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
    ])
}

function getTeamFromMetadata(labels: { [key: string]: string }): string {
    if (labels) {
        if (labels.hasOwnProperty("team")) {
            return labels.team;
        }
    }
}

function getResourceTypeFromSelfLink(selfLink: string) {
    // Example selfLink: '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj'

    let parts = selfLink.split('/');
    return parts[parts.length - 2]
}
