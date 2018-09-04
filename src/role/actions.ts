import {V1Role} from "@kubernetes/client-node";
import {RoleAction} from "./types";
import {ErrorAction, NamespacedResourceAction, State} from "../types";
import {Action} from "redux";

const BASE = "ROLES";
export const FETCH_ROLE = `${BASE}/FETCH`;
export const FETCH_ROLE_FAILED = `${BASE}/FETCH_FAILED`;
export const SAVE_FETCHED_ROLE = `${BASE}/SAVE_FETCHED`;
export const CREATE_OR_UPDATE_ROLE = `${BASE}/CREATE_OR_UPDATE`;
export const CREATE_OR_UPDATE_ROLE_SUCCESS = `${BASE}/CREATE_OR_UPDATE_SUCCESS`;
export const CREATE_OR_UPDATE_ROLE_FAILED = `${BASE}/CREATE_OR_UPDATE_FAILED`;
export const DISCARD_ROLE = `${BASE}/DISCARD_ROLE`;

export function fetchRole(name: string, namespace: string): NamespacedResourceAction {
    return {
        type: FETCH_ROLE,
        name: name,
        namespace: namespace,
    }
}

export function fetchRoleFailed(e: string): ErrorAction {
    return {
        type: FETCH_ROLE_FAILED,
        error: e,
    }
}

export function saveFetchedRole(role: V1Role): RoleAction {
    return {
        type: SAVE_FETCHED_ROLE,
        role: role,
    }
}

export function createOrUpdateRole(role: V1Role): RoleAction {
    return {
        type: CREATE_OR_UPDATE_ROLE,
        role: role,
    }
}

export function createOrUpdateRoleSuccess(role: V1Role): RoleAction {
    return {
        type: CREATE_OR_UPDATE_ROLE_SUCCESS,
        role: role,
    }
}

export function createOrUpdateRoleFailed(error: string): ErrorAction {
    return {
        type: CREATE_OR_UPDATE_ROLE_FAILED,
        error: error,
    }
}

export function discardRole(): Action {
    return {
        type: DISCARD_ROLE,
    }
}

export function getRole(state: State): V1Role {
    return state.role.role
}
