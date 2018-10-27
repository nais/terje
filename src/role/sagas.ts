import {KubeConfig, RbacAuthorization_v1Api, V1Role} from '@kubernetes/client-node';
import {RbacApiRoleResponse} from './types';
import {call} from 'redux-saga/effects'
import {createRole} from './creator';

import parentLogger from "../logger";
import { delay } from 'redux-saga';

const logger = parentLogger.child({module: 'role'});

const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

export function* fetchRole(name: string, namespace: string) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.readNamespacedRole], name, namespace);
           yield delay(100)
        logger.debug('fetched role', response.body.metadata.name);

        return response.body;
    } catch (e) {
        if (e.response.statusCode == 404) {
            logger.debug('did not find  role ', name, 'in namespace', namespace, ' will create it.');
            return createRole(name, namespace);
        } else {
            logger.warn('could not fetch role due to unhandled exception', e, e.stack);
            return
        }
    }
}

export function* replaceRole(role: V1Role) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.replaceNamespacedRole], role.metadata.name, role.metadata.namespace, role);
            yield delay(100)

        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            logger.info('updated Role for team: %s in namespace: %s', role.metadata.name, role.metadata.namespace);
            return true;
        } else {
            logger.warn('failed to replace role', response.response.statusMessage);
        }
    } catch (e) {
        logger.warn('caught exception while replacing role', e, e.stack);
    }

    return false;
}
