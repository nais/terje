import {
    CREATE_OR_UPDATE_ROLE,
    createOrUpdateRoleFailed,
    createOrUpdateRoleSuccess,
    FETCH_ROLE,
    fetchRoleFailed,
    saveFetchedRole
} from "./actions";
import {NamespacedResourceAction} from "../types";
import {KubeConfig, RbacAuthorization_v1Api} from "@kubernetes/client-node";
import {RbacApiRoleResponse, RoleAction} from "./types";
import {call, put, takeLatest} from 'redux-saga/effects'


const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

export function* doFetchRole(action: NamespacedResourceAction) {
    try {
        const response: RbacApiRoleResponse = yield call([rbacApi, rbacApi.readNamespacedRole], action.name, action.namespace);
        console.log("fetched role", response.body.metadata.name);
        yield put(saveFetchedRole(response.body));
    } catch (e) {
        if (e.response.statusCode == 404) {
            console.log("no existing role found for", action.name, "in namespace", action.namespace);
        } else {
            console.log("could not fetch role due to unhandled exception,", e);
        }

        yield put(fetchRoleFailed(e));
        return;
    }
}

export function* onFetchRole() {
    yield takeLatest(FETCH_ROLE, doFetchRole);
}

export function* doCreateOrUpdateRole(action: RoleAction) {
    try {
        const response: RbacApiRoleResponse = yield call([rbacApi, rbacApi.replaceNamespacedRole], action.role.metadata.name, action.role.metadata.namespace, action.role);
        const statusCode: number = response.response.statusCode;
        if (statusCode >= 200 && statusCode < 300) {
            console.log("successfully replaced role", action.role.metadata.name);
            yield put(createOrUpdateRoleSuccess(response.body));
        } else {
            console.log("failed to replace role", response.response.statusMessage);
            yield put(createOrUpdateRoleFailed(response.response.statusMessage));
        }
    } catch (e) {
        console.log("caught exception while replacing role ", e);
        yield put(createOrUpdateRoleFailed(e));
        return;
    }
}

export function* onCreateOrUpdateRole() {
    yield takeLatest(CREATE_OR_UPDATE_ROLE, doCreateOrUpdateRole);
}
