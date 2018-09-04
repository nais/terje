import {RoleAction, RoleActions, RoleState} from "./types";
import {CREATE_OR_UPDATE_ROLE, DISCARD_ROLE, FETCH_ROLE, FETCH_ROLE_FAILED, SAVE_FETCHED_ROLE} from "./actions";
import {ErrorAction} from "../types";

export function role(state: RoleState = {role: null, error: ""}, action: RoleActions): RoleState {
    switch (action.type) {
        case FETCH_ROLE:
            return {
                role: null,
                error: "",
            };
        case CREATE_OR_UPDATE_ROLE:
            return {
                role: (<RoleAction> action).role,
                error: "",
            };
        case SAVE_FETCHED_ROLE:
            return {
                role: (<RoleAction> action).role,
                error: "",
            };
        case FETCH_ROLE_FAILED:
            return {
                role: null,
                error: (<ErrorAction> action).error,
            };
        case DISCARD_ROLE:
            return {
                role: null,
                error: "",
            };
        default:
            return state
    }
}
