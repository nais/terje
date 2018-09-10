import {KubeConfig, RbacAuthorization_v1Api, V1Role} from '@kubernetes/client-node';
import {RbacApiRoleResponse} from './types';
import {call} from 'redux-saga/effects'
import {createRole} from './creator';


const kubeConfig = new KubeConfig();
kubeConfig.loadFromDefault();
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api);

export function* fetchRole(name: string, namespace: string) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.readNamespacedRole], name, namespace);
        console.log('fetched role', response.body.metadata.name);

        return response.body;
    } catch (e) {
        if (e.response.statusCode == 404) {
            console.log('did not find  role ', name, 'in namespace', namespace, ' will create it.');
            return createRole(name, namespace);
        } else {
            console.log('could not fetch role due to unhandled exception,', e);
            return
        }
    }
}

export function* replaceRole(role: V1Role) {
    try {
        const response: RbacApiRoleResponse =
            yield call([rbacApi, rbacApi.replaceNamespacedRole], role.metadata.name, role.metadata.namespace, role);

        if (response.response.statusCode >= 200 && response.response.statusCode < 300) {
            console.log('successfully replaced role', role.metadata.name);
            return true;
        } else {
            console.log('failed to replace role', response.response.statusMessage);
        }
    } catch (e) {
        console.log('caught exception while replacing role ', e);
    }

    return false;
}
