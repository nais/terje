import { Core_v1Api, KubeConfig, RbacAuthorization_v1Api, V1ClusterRoleBinding, V1RoleBinding, V1Namespace } from '@kubernetes/client-node';
import { delay } from 'redux-saga';
import { call } from 'redux-saga/effects';
import { byLabelValueCaseInsensitive } from '../helpers';
import parentLogger from "../logger";
import { getRegisteredTeamsFromSharepoint } from './azure';
import { createClusterRoleBindingResource, createRoleBindingResource } from "./creator";
import { Group } from './types';
import deepEqual = require('deep-equal');
import promClient from 'prom-client'

const rbCreatedCounter = new promClient.Counter({name: "rolebinding_created_counter", help: "Amount of created RoleBindings"})
const rbFailedCounter = new promClient.Counter({name: "rolebinding_failed_counter", help: "Amount of failed RoleBindings"})
const crbCreatedCounter = new promClient.Counter({name: "clusterrolebinding_created_counter", help: "Amount of created ClusterRoleBindings"})
const crbFailedCounter = new promClient.Counter({name: "clusterrolebinding_failed_counter", help: "Amount of failed ClusterRoleBindings"})
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
            rbCreatedCounter.inc()
            return true
        } else if (response.response.statusCode == 404) {
            rbFailedCounter.inc()
            return false
        } else {
            rbFailedCounter.inc()
            logger.warn('failed to replace RoleBinding', response.response.statusMessage)
        }
    } catch (e) {
        rbFailedCounter.inc()
        if (e.hasOwnProperty('response') && e.response.statusCode == 404) {
            return false
        }
        logger.warn('caught exception while replacing RoleBinding', e, e.stack)
    }
}

function* createOrUpdateClusterRoleBinding(clusterRoleBinding: V1ClusterRoleBinding) {
    try {
        const response =
            yield call([rbacApi, rbacApi.replaceClusterRoleBinding], clusterRoleBinding.metadata.name, clusterRoleBinding)
        yield delay(100)
        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            crbCreatedCounter.inc()
            logger.debug('create ClusterRoleBinding', clusterRoleBinding)
            return true
        } else {
            crbFailedCounter.inc()
            logger.warn('failed to replace ClusterRoleBinding', response.response.statusMessage)
        }
    } catch (e) {
        crbFailedCounter.inc()
        logger.warn('caught exception while replacing ClusterRoleBinding', e, e.stack)
    }
}

async function fetchNamespaces() {
    const response = await coreApi.listNamespace()
    if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
        return response.body.items
            .filter(byLabelValueCaseInsensitive('terje', 'enabled'))
            .map((namespace: V1Namespace) => namespace.metadata.name)
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

    logger.info(`Updated ${updatedClusterRoleBindings.length} ClusterRoleBindings`)
    logger.info(`Skipped ${equalClusterRoleBindings.length} equal ClusterRoleBindings`)
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
                updatedRoleBindings.push(`${roleBindingToCreate.metadata.name}.${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else if (!deepEqual(roleBindingToCreate.roleRef, roleBindingInNamespace[0].roleRef) ||
                !deepEqual(roleBindingToCreate.subjects, roleBindingInNamespace[0].subjects)) {
                updatedRoleBindings.push(`${roleBindingToCreate.metadata.name}.${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else {
                equalRoleBindings.push(`${roleBindingToCreate.metadata.name}.${roleBindingToCreate.metadata.namespace}`)
            }
        }
    }

    logger.info(`Updated ${updatedRoleBindings.length} RoleBindings`)
    logger.info(`Skipped ${equalRoleBindings.length} equal RoleBindings`)
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

    logger.info("Sleeping for 2 minutes before syncing to let the role state populate")
    yield delay(60*2*1000)
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
