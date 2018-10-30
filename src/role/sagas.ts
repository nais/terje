import { KubeConfig, RbacAuthorization_v1Api, V1Role } from '@kubernetes/client-node';
import deepEqual from 'deep-equal';
import { call, put, select } from 'redux-saga/effects';
import { byLabelValueCaseInsensitive } from '../helpers';
import parentLogger from "../logger";
import { RbacApiRoleResponse, ResourceAction, RoleState, selectRoleState } from './types';
import { delay } from 'redux-saga';


const logger = parentLogger.child({ module: 'role' })

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api)

export function* addResourceToState(event: ResourceAction) {
    logger.debug("putting event in store", event)
    yield put(event)
}

export function* syncRoles(rolesInCluster: [V1Role], state: RoleState) {
    logger.info("Syncing Roles")
    const updatedRoles = []
    const equalRoles = []

    for (let namespace of Object.keys(state)) {
        const rolesInNamespace = rolesInCluster.filter(role => role.metadata.namespace == namespace)
        for (let team of Object.keys(state[namespace])) {
            const roleInState = state[namespace][team]
            const roleInCluster = rolesInNamespace.filter(role => role.metadata.name == roleInState.metadata.name)
            if (roleInCluster.length == 0) {
                yield call(createOrUpdateRole, roleInState)
                updatedRoles.push(`${roleInState.metadata.name}.${roleInState.metadata.namespace}`)
            } else if (!deepEqual(roleInState.rules, roleInCluster[0].rules)) {
                yield call(createOrUpdateRole, roleInState)
                updatedRoles.push(`${roleInState.metadata.name}.${roleInState.metadata.namespace}`)
            } else {
                equalRoles.push(`${roleInState.metadata.name}.${roleInState.metadata.namespace}`)
            }
        }
    }

    logger.info(`Updated ${updatedRoles.length} roles`)
    logger.info(`Skipped ${equalRoles.length} equal roles`)
}

export function* keepRolesInSync() {
    while (true) {
        const state: RoleState = yield select(selectRoleState)
        const rolesInCluster : V1Role[] = yield call(fetchRoles)
        logger.debug("roleState", state)
        logger.debug("roles in cluster managed by terje:", rolesInCluster.map(r => `${r.metadata.name}.${r.metadata.namespace}`))

        yield call(syncRoles, rolesInCluster, state)
        yield delay(60 * 1000)
    }
}

export function* createOrUpdateRole(role: V1Role) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.replaceNamespacedRole], role.metadata.name, role.metadata.namespace, role)
        yield delay(100)
        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            return true
        } else {
            logger.warn('failed to replace role', response.response.statusMessage)
        }
    } catch (e) {
        logger.warn('caught exception while replacing role', e, e.stack)
    }

    return false
}

export function* fetchRoles() {
    try {
        const response = yield call([rbacApi, rbacApi.listRoleForAllNamespaces])
        const rolesInCluster = response.body.items.filter(byLabelValueCaseInsensitive('managed-by', 'terje'))

        return rolesInCluster
    } catch (e) {
        logger.warn('could not fetch roles due to unhandled exception', e)
        return
    }
}