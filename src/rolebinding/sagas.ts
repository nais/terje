import { Core_v1Api, KubeConfig, RbacAuthorization_v1Api, V1Namespace, V1RoleBinding } from '@kubernetes/client-node';
import { delay } from 'redux-saga';
import { call } from 'redux-saga/effects';
import { byLabelValueCaseInsensitive } from '../helpers';
import parentLogger from "../logger";
import { getRegisteredTeamsFromSharepoint } from './azure';
import { createRoleBindingResource } from "./creator";
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
        if (response.response.statuscode >= 200 && response.response.statuscode < 300) {
            return true
        } else {
            logger.warn('failed to replace roleBinding', response.response.statusmessage)
        }
    } catch (e) {
        logger.warn('caught exception while replacing roleBinding', e, e.stack)
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

function* syncRoleBindings(namespaces: string[], roleBindingsInCluster: V1RoleBinding[], teams: Group[]) {
    logger.info("Syncing RoleBindings")
    const updatedRoleBindings: string[] = []
    const equalRoleBindings: string[] = []

    for (let namespace of namespaces) {
        const roleBindingsInNamespace = roleBindingsInCluster.filter(roleBinding => roleBinding.metadata.namespace == namespace)
        for (let team of teams) {
            const roleBindingToCreate = createRoleBindingResource(team.team, team.id, namespace)
            const roleBindingInNamespace = roleBindingsInNamespace.filter(roleBinding => roleBinding.metadata.name == roleBindingToCreate.metadata.name)

            if (roleBindingInNamespace.length === 0) {
                equalRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else if (!deepEqual(roleBindingToCreate.roleRef, roleBindingInNamespace[0].roleRef) ||
                !deepEqual(roleBindingToCreate.subjects, roleBindingInNamespace[0].subjects)) {
                equalRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
                yield call(createOrUpdateRoleBinding, roleBindingToCreate)
            } else {
                equalRoleBindings.push(`${roleBindingToCreate.metadata.name}${roleBindingToCreate.metadata.namespace}`)
            }
        }
    }

    logger.info(`Updated ${updatedRoleBindings.length} roleBindings: ${updatedRoleBindings}`)
    logger.info(`Skipped ${equalRoleBindings.length} equal roleBindings: ${equalRoleBindings}`)
}

export function* fetchRoleBindings() {
    try {
        const response = yield call([rbacApi, rbacApi.listRoleBindingForAllNamespaces])
        const roleBindingsInCluster = response.body.items.filter(byLabelValueCaseInsensitive('managed-by', 'terje'))

        return roleBindingsInCluster
    } catch (e) {
        logger.warn('could not fetch rolebindings due to unhandled exception', e)
        return
    }
}

export function* keepRoleBindingsInSync() {
    let teams: [Group]
    let namespaces: [string]
    let roleBindingsInCluster: [V1RoleBinding]

    while (true) {
        try {
            teams = yield getRegisteredTeamsFromSharepoint()
            namespaces = yield fetchNamespaces()
            roleBindingsInCluster = yield fetchRoleBindings();
            logger.debug("groups", teams)
            logger.debug("namespaces", namespaces)
            yield call(syncRoleBindings, namespaces, roleBindingsInCluster, teams)
        } catch (e) {
            logger.warn("error caught while syncing groups", e)
        }

        yield delay(1000 * 60)
    }
}
