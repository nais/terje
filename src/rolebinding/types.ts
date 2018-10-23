import {V1RoleBinding} from '@kubernetes/client-node';
import * as http from 'http';

export interface RbacApiRoleBindingResponse {
    response: http.IncomingMessage;
    body: V1RoleBinding;
}

export interface Group { id: string, team: string }
export interface ADGroup { fields: { GruppeID: string } }