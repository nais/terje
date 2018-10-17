import {KubeConfig, RbacAuthorization_v1Api} from '@kubernetes/client-node';
import {ApplicationTokenCredentials, loginWithServicePrincipalSecret} from 'ms-rest-azure';
import {GraphRbacManagementClient} from 'azure-graph';
import {ADGroup, GroupListResult} from "azure-graph/lib/models";
import NodeCache from 'node-cache'

import parentLogger from "../logger";
import {createRoleBindingResource} from "./creator";

const logger = parentLogger.child({module: 'role'});

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

// In memory cache

function cacheGroupIds(oldCache: NodeCache, callback: (newCache: NodeCache) => void) {
    return function (err: Error, groupList: GroupListResult) {
        if (err) {
            logger.warn("Error while caching group ids, error was: ", err);
            throw err;
        }

        groupList.forEach((group: ADGroup) => {
            if (group.mail) {
                let team = group.mail.substr(0, group.mail.indexOf("@")).toLowerCase();
                oldCache.set(team, group.objectId);
            }
        });

        if (callback) {
            return callback(oldCache);
        }
    }
}

function withUpdatedCache(callback: (err: Error, groupListResult: GroupListResult) => void) {
    const appId = process.env['AZURE_AD_SERVICE_PRINCIPAL_APP_ID'];
    const password = process.env['AZURE_AD_SERVICE_PRINCIPAL_PASSWORD'];
    const tenantId = process.env['AZURE_AD_SERVICE_PRINCIPAL_TENANT'];

    loginWithServicePrincipalSecret(appId, password, tenantId, {tokenAudience: 'graph'},
        (err: Error, credentials: ApplicationTokenCredentials) => {
            if (err) {
                logger.warn("Failed get service principal token, error was: %s", err);
                throw err
            }

            let graphClient = new GraphRbacManagementClient(credentials, tenantId);
            return graphClient.groups.list({filter: "startswith(mail, 'team')"}, callback);
        });
}

export function createRoleBinding(groupName: string, groupId: string, namespace: string) {
    let roleBinding = createRoleBindingResource(groupName, groupId, namespace);

    try {
        const response = rbacApi.createNamespacedRoleBinding(roleBinding.metadata.namespace, roleBinding);
        logger.info('response when creating rolebinding', response);
    } catch (e) {
        logger.info('caught exception while replacing RoleBinding ', e);
    }

    return false;
}

export function syncRoleBinding(cache: NodeCache, groupName: string, namespace: string) {
    cache.get(groupName, (err: Error, groupId: string) => {
        if (err) {
            logger.warn("Error while syncing role binding, error was: ", err);
            throw err;
        }

        if (groupId) {
            createRoleBinding(groupName, groupId, namespace);
        } else {
            withUpdatedCache(cacheGroupIds(cache, (newCache: NodeCache) => {
                newCache.get(groupName, (err: Error, groupId: string) => {
                    if (groupId) {
                        createRoleBinding(groupName, groupId, namespace);
                    } else {
                        logger.warn("Unable to find groupId for groupName:", groupName)
                    }
                });
            }));
        }
    });
}
