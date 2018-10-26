import {KubeConfig, RbacAuthorization_v1Api, V1Role} from '@kubernetes/client-node'
import {RbacApiRoleResponse, ResourceAction, RoleState, selectRoleState} from './types'
import {call, put, take, select} from 'redux-saga/effects'
import {createRole} from './creator'

import parentLogger from "../logger"
import { delay } from 'bluebird'

const logger = parentLogger.child({module: 'role'})

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api)

export function* addResourceToState(event: ResourceAction) {
    logger.debug("putting event in store", event)
    yield put(event)
}

export function* syncRoles(rolesInCluster: [V1Role], state: RoleState) {
    for (let namespace of Object.keys(state)) {
        const rolesInNamespace = rolesInCluster.filter(role => role.metadata.namespace == namespace)
        for (let team of Object.keys(state[namespace])) {
            const roleInState = state[namespace][team]
            const roleInCluster = rolesInNamespace.filter(role => role.metadata.name == roleInState.metadata.name)
            if (roleInCluster.length == 0) {
                yield call(replaceRole, roleInState)
            } else if (JSON.stringify(roleInState.rules) != JSON.stringify(roleInCluster[0].rules)) {
                yield call(replaceRole, roleInState)
            } else {
                // roles are equal
            }
        }
    }
}

export function* keepRolesInSync() {
    while (true) {
        const state: RoleState = yield select(selectRoleState)
        const rolesInCluster = yield call(fetchRoles)
        logger.debug("roleState", state)
        logger.debug("roles in cluster managed by terje:", rolesInCluster)

        yield call(syncRoles, rolesInCluster, state)
        yield delay(60*1000)
    }
}

export function* fetchRoles() {
    try {
        const response = yield call([rbacApi, rbacApi.listRoleForAllNamespaces])
        const rolesInCluster = response.body.items.filter((role: V1Role) => {
            return role && role.metadata && role.metadata.labels &&
                role.metadata.labels.hasOwnProperty('managed-by') &&
                role.metadata.labels['managed-by'] === 'terje'
        })

        return rolesInCluster
    } catch (e) {
        logger.warn('could not fetch roles due to unhandled exception', e)
        return
    }
}

export function* replaceRole(role: V1Role) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.replaceNamespacedRole], role.metadata.name, role.metadata.namespace, role)

        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            logger.info('updated Role for team: %s in namespace: %s', role.metadata.name, role.metadata.namespace)
            return true
        } else {
            logger.warn('failed to replace role', response.response.statusMessage)
        }
    } catch (e) {
        logger.warn('caught exception while replacing role', e, e.stack)
    }

    return false
}
