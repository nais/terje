import {KubeConfig, RbacAuthorization_v1Api} from '@kubernetes/client-node';
import {TerjeCache} from '../types'
import {getRegisteredTeamsFromSharepoint} from './azure'

import parentLogger from "../logger";
import {createRoleBindingResource} from "./creator";

const logger = parentLogger.child({module: 'rolebinding'});

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

function createRoleBinding(team: string, groupId: string, namespace: string) {
    const roleBinding = createRoleBindingResource(team, groupId, namespace);

    try {
        rbacApi.replaceNamespacedRoleBinding('nais:team:' + team, namespace, roleBinding)
            .then((response) => {
                if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
                    logger.info('updated RoleBinding for team: %s in namespace: %s', team, namespace);
                } else {
                    logger.warn('failed while updating RoleBinding for team: %s, response was: %s', team, JSON.stringify(response));
                }
            }).catch(logger.warn);
    } catch (e) {
        logger.warn('caught exception while replacing RoleBinding ', e.stack);
    }
}

export async function syncRoleBinding(cache: TerjeCache, team: string, namespace: string) {
    if (!cache.hasOwnProperty('groups')) {
        cache['groups'] = await getRegisteredTeamsFromSharepoint()
        cache['groups']['_timestamp'] = String((new Date).getTime)
        logger.info("updated AD group cache")
    }

    if (!cache['groups'].hasOwnProperty(team)) {
        const lastUpdate = Number(cache['groups']['_timestamp'])
        const now = (new Date).getTime()
        
        if (now - lastUpdate > 600) {
            cache['groups'] = await getRegisteredTeamsFromSharepoint()
            cache['groups']['_timestamp'] = String(now)
            logger.info("updated AD group cache")
        }
    }

    if (cache['groups'].hasOwnProperty(team)) {
        createRoleBinding(team, cache['groups'][team], namespace);
    } else {
        logger.warn("unable to create RoleBinding for team: %s, AD group not found.", team);
    }
}