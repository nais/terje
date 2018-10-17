import {V1RoleBinding} from '@kubernetes/client-node';
import * as http from 'http';

export interface RbacApiRoleBindingResponse {
    response: http.IncomingMessage;
    body: V1RoleBinding;
}
