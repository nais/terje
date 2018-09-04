import {V1Role} from "@kubernetes/client-node";
import {ErrorAction, NamespacedResourceAction} from "../types";
import * as http from "http";

export interface RoleState {
    role: V1Role,
    error: string,
}

export interface RoleAction {
    type: string,
    role: V1Role,
}

export interface RbacApiRoleResponse {
    response: http.IncomingMessage;
    body: V1Role;
}

export type RoleActions = RoleAction | NamespacedResourceAction | ErrorAction;
