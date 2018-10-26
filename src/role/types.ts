import {V1Role, V1ObjectMeta} from '@kubernetes/client-node'
import * as http from 'http'

export interface RbacApiRoleResponse {
    response: http.IncomingMessage
    body: V1Role
}

export type ResourceAction = {type: string, metadata: V1ObjectMeta}
export type RoleState = {[namespace: string]: {[team: string]: V1Role}}
export const selectRoleState = (state: {role: RoleState}) => state.role