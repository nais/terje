import {RoleState} from "./role/types";
import {V1ObjectMeta} from "@kubernetes/client-node";

export interface NamespacedResourceAction {type: string, name: string, namespace: string}
export interface ErrorAction { type: string, error: string }
export interface ResourceMetadataAction {type: string, metadata: V1ObjectMeta}

export interface State {
    role: RoleState,
}

