import {doCreateOrUpdateRole, doFetchRole} from "./sagas";
import {call, put} from "redux-saga/effects";
import {
    createOrUpdateRole,
    createOrUpdateRoleFailed,
    createOrUpdateRoleSuccess,
    fetchRole,
    saveFetchedRole
} from "./actions";
import {createRole} from "./rolecreator";
import {KubeConfig, RbacAuthorization_v1Api} from "@kubernetes/client-node";

const team = 'unittest';
const roleName = `team-${team}`;
const namespace = 'namespace';
const role = createRole(team, namespace);

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

test('test fetch role saga', () => {
    const fetchRoleAction = fetchRole(roleName, namespace);
    const mockRoleResponse = {body: role};

    const gen = doFetchRole(fetchRoleAction);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.readNamespacedRole], roleName, namespace)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        put(saveFetchedRole(role))
    );

    expect(gen.next().done).toBe(true);
});

test('test create or update role saga', () => {
    const createOrUpdateRoleAction = createOrUpdateRole(role);
    const mockRoleResponse = {
        response: {
            statusCode: 200,
        },
        body: role
    };

    const gen = doCreateOrUpdateRole(createOrUpdateRoleAction);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], roleName, namespace, role)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        put(createOrUpdateRoleSuccess(role))
    );

    expect(gen.next().done).toBe(true);
});

test('test create or update role saga error handling', () => {
    const createOrUpdateRoleAction = createOrUpdateRole(role);
    const mockRoleResponse = {
        response: {
            statusCode: 401,
            statusMessage: "Unauthorized"
        }
    };

    const gen = doCreateOrUpdateRole(createOrUpdateRoleAction);
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], roleName, namespace, role)
    );

    expect(gen.next(mockRoleResponse).value).toEqual(
        put(createOrUpdateRoleFailed(mockRoleResponse.response.statusMessage))
    );

    expect(gen.next().done).toBe(true);
});
