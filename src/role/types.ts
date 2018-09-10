import {V1Role} from '@kubernetes/client-node';
import * as http from 'http';

export interface RbacApiRoleResponse {
    response: http.IncomingMessage;
    body: V1Role;
}
