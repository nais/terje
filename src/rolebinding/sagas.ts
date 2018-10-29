import { Core_v1Api, KubeConfig, RbacAuthorization_v1Api, V1ClusterRoleBinding, V1RoleBinding } from '@kubernetes/client-node';
import { delay } from 'redux-saga';
import { call } from 'redux-saga/effects';
import { byLabelValueCaseInsensitive } from '../helpers';
import parentLogger from "../logger";
import { getRegisteredTeamsFromSharepoint } from './azure';
import { createClusterRoleBindingResource, createRoleBindingResource } from "./creator";
import { Group } from './types';
import deepEqual = require('deep-equal');

const logger = parentLogger.child({ module: 'rolebinding' })

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api)
const coreApi = kubeConfig.makeApiClient(Core_v1Api)

function* createOrUpdateRoleBinding(roleBinding: V1RoleBinding) {
    try {
        const response =
            yield call([rbacApi, rbacApi.replaceNamespacedRoleBinding], roleBinding.metadata.name, roleBinding.metadata.namespace, roleBinding)
        yield delay(100)
        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            return true
        } else {
            logger.warn('failed to replace RoleBinding', response.response.statusMessage)
        }
    } catch (e) {
        logger.warn('caught exception while replacing roleBinding', e, e.stack)
    }
}

function* createOrUpdateClusterRoleBinding(clusterRoleBinding: V1ClusterRoleBinding) {
    try {
        const response =
            yield call([rbacApi, rbacApi.replaceClusterRoleBinding], clusterRoleBinding.metadata.name, clusterRoleBinding)
        yield delay(100)
        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            logger.debug('create ClusterRoleBinding', clusterRoleBinding)
            return true
        } else {
            logger.warn('failed to replace ClusterRoleBinding', response.response.statusMessage)
        }
    } catch (e) {
        logger.warn('caught exception while replacing ClusterRoleBinding', e, e.stack)
    }
}

async function fetchNamespaces() {
    const response = await coreApi.listNamespace()
    if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
        return response.body.items
            .filter(byLabelValueCaseInsensitive('terje', 'enabled'))
            .map(namespace => namespace.metadata.name)
    }
    else {
        logger.warn("failed getting namespaces, reponse was: ", response)
        return []
    }
}

function* syncClusterRoleBindings(clusterRoleBindingsInCluster: V1ClusterRoleBinding[], teams: Group[]) {
    logger.info("Syncing ClusterRoleBindings")
    const updatedClusterRoleBindings: string[] = []
    const equalClusterRoleBindings: string[] = []

    for (let team of teams) {
        const clusterRoleBindingsToCreate: V1ClusterRoleBinding[] = [
            createClusterRoleBindingResource(`nais:team:${team.team}`, 'nais:team', 'ClusterRole', [{ name: team.team, type: 'User' }, { name: team.id, type: 'Group' }]),
            createClusterRoleBindingResource(`nais:team:${team.team}:view`, 'view', 'ClusterRole', [{ name: team.team, type: 'User' }, { name: team.id, type: 'Group' }])
        ]

        for (let clusterRoleBindingToCreate of clusterRoleBindingsToCreate) {
            const existingClusterRoleBindings = clusterRoleBindingsInCluster.filter(crb => crb.metadata.name === clusterRoleBindingToCreate.metadata.name)

            if (existingClusterRoleBindings.length === 0) {
                updatedClusterRoleBindings.push(`${clusterRoleBindingToCreate.metadata.name}`)
                yield call(createOrUpdateClusterRoleBinding, clusterRoleBindingToCreate)
            } else if (!deepEqual(clusterRoleBindingToCreate.roleRef, existingClusterRoleBindings[0].roleRef) ||
                !deepEqual(clusterRoleBindingToCreate.subjects, existingClusterRoleBindings[0].subjects)) {
                updatedClusterRoleBindings.push(`${clusterRoleBindingToCreate.metadata.name}`)
                yield call(createOrUpdateClusterRoleBinding, clusterRoleBindingToCreate)
            } else {
                equalClusterRoleBindings.push(`${clusterRoleBindingToCreate.metadata.name}`)
            }
        }
    }

    logger.info(`Updated ${updatedClusterRoleBindings.length} ClusterRoleBindings: ${updatedClusterRoleBindings}`)
    logger.info(`Skipped ${equalClusterRoleBindings.length} equal ClusterRoleBindings: ${equalClusterRoleBindings}`)
}

function* syncRoleBindings(namespaces: string[], roleBindingsInCluster: V1RoleBinding[], teams: Group[]) {
    logger.info("Syncing RoleBindings")
    const updatedRoleBindings: string[] = []
    const equalRoleBindings: string[] = []

    for (let namespace of namespaces) {
        const roleBindingsInNamespace = roleBindingsInCluster.filter(roleBinding => roleBinding.metadata.namespace == namespace)
        for (let team of teams) {
            const roleBindingToCreate = createRoleBindingResource(`nais:team:${team.team}`, `nais:team:${team.team}`, 'Role', [{ name: team.id, type: 'Group' }], namespace)
            const roleBindingInNamespace = roleBindingsInNamespace.filter(roleBinding => roleBinding.metadata.name == roleBindingToCreate.metadata.name)

            if (roleBindingInNamespace.length === 0) {
                updatedRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else if (!deepEqual(roleBindingToCreate.roleRef, roleBindingInNamespace[0].roleRef) ||
                !deepEqual(roleBindingToCreate.subjects, roleBindingInNamespace[0].subjects)) {
                updatedRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else {
                equalRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
            }
        }
    }

    logger.info(`Updated ${updatedRoleBindings.length} RoleBindings: ${updatedRoleBindings}`)
    logger.info(`Skipped ${equalRoleBindings.length} equal RoleBindings: ${equalRoleBindings}`)
}

export function* fetchRoleBindings() {
    try {
        const response = yield call([rbacApi, rbacApi.listRoleBindingForAllNamespaces])
        const roleBindingsInCluster = response.body.items.filter(byLabelValueCaseInsensitive('managed-by', 'terje'))

        return roleBindingsInCluster
    } catch (e) {
        logger.warn('could not fetch RoleBindings due to unhandled exception', e)
        return
    }
}

export function* fetchClusterRoleBindings() {
    try {
        const response = yield call([rbacApi, rbacApi.listClusterRoleBinding])
        const clusterRoleBindingsInCluster = response.body.items.filter(byLabelValueCaseInsensitive('managed-by', 'terje'))

        return clusterRoleBindingsInCluster
    } catch (e) {
        logger.warn('could not fetch ClusterRoleBindings due to unhandled exception', e)
        return
    }
}

export function* keepRoleBindingsInSync() {
    let teams: Group[]
    let namespaces: string[]
    let roleBindingsInCluster: V1RoleBinding[]
    let clusterRoleBindingsInCluster: V1ClusterRoleBinding[]

    while (true) {
        try {
            teams = yield getRegisteredTeamsFromSharepoint()
            namespaces = yield fetchNamespaces()
            roleBindingsInCluster = yield fetchRoleBindings();
            clusterRoleBindingsInCluster = yield fetchClusterRoleBindings();
            logger.debug("groups", teams)
            logger.debug("namespaces", namespaces)
            yield call(syncClusterRoleBindings, clusterRoleBindingsInCluster, teams)
            yield call(syncRoleBindings, namespaces, roleBindingsInCluster, teams)
        } catch (e) {
            logger.warn("error caught while syncing groups", e)
        }

        yield delay(1000 * 60)
    }
}
