import {fetchRole, replaceRole} from './sagas';
import {call} from 'redux-saga/effects';
import {createRole} from "./creator";
import {KubeConfig, RbacAuthorization_v1Api} from "@kubernetes/client-node";

import parentLogger from "../logger";

const logger = parentLogger.child({module: 'resourcewatcher'});

const team = 'unittest';
const roleName = `team-${team}`;
const namespace = 'namespace';
const role = createRole(roleName, namespace);

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
logger.info(kubeConfig);
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

test('test fetch role saga', () => {
    const mockRoleResponse = {body: role};

    const gen = fetchRole(roleName, namespace);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.readNamespacedRole], roleName, namespace)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        role
    );

    expect(gen.next().done).toBe(true);
});

test('test create or update role saga', () => {
    const mockRoleResponse = {
        response: {
            statusCode: 200,
        },
        body: role
    };

    const gen = replaceRole(role);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], roleName, namespace, role)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        true
    );

    expect(gen.next().done).toBe(true);
});

test('test create or update role saga error handling', () => {
    const mockRoleResponse = {
        response: {
            statusCode: 401,
            statusMessage: "Unauthorized"
        }
    };

    const gen = replaceRole(role);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], roleName, namespace, role)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        false
    );

    expect(gen.next().done).toBe(true);
});
