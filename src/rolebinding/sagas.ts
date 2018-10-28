import { Core_v1Api, KubeConfig, RbacAuthorization_v1Api } from '@kubernetes/client-node';
import { delay } from 'redux-saga';
import { call } from 'redux-saga/effects';
import { byLabelValueCaseInsensitive } from '../helpers';
import parentLogger from "../logger";
import { getRegisteredTeamsFromSharepoint } from './azure';
import { createRoleBindingResource } from "./creator";
import { Group } from './types';

const logger = parentLogger.child({ module: 'rolebinding' })

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api)
const coreApi = kubeConfig.makeApiClient(Core_v1Api)

function createRoleBinding(team: string, groupId: string, namespace: string) {
    const roleBinding = createRoleBindingResource(team, groupId, namespace)

    try {
        rbacApi.replaceNamespacedRoleBinding('nais:team:' + team, namespace, roleBinding)
            .then((response) => {
                if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
                    logger.info('updated RoleBinding for team: %s in namespace: %s', team, namespace)
                } else {
                    logger.warn('failed while updating RoleBinding', response)
                }
            }).catch(error => {
                if (error.body && error.body.message) {
                    logger.warn("failed to update RoleBinding because:", error.body.message)
                } else {
                    logger.warn("unexpected error while updating RoleBinding", error)
                }
            })
    } catch (e) {
        logger.warn('caught exception while replacing RoleBinding', e, e.stack)
    }
}

async function getNamespaces() {
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

export function* keepRoleBindingsInSync() {
    let groups: [Group]
    let namespaces: [string]

    while (true) {
        try {
            groups = yield getRegisteredTeamsFromSharepoint()
            namespaces = yield getNamespaces()
            logger.debug("groups", groups)
            logger.debug("namespaces", namespaces)

            for (let namespace of namespaces) {
                for (let group of groups) {
                    yield call(createRoleBinding, group.team, group.id, namespace)
                }
            }
        } catch (e) {
            logger.warn("error caught while syncing groups", e)
        }

        yield delay(1000 * 60)
    }
}
