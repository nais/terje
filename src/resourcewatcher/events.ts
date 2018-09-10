import {ResourceMetadataAction} from './types';
import {V1ObjectMeta} from '@kubernetes/client-node';

export const EVENT_RESOURCE_ADDED = 'RESOURCE_ADDED';
export const EVENT_RESOURCE_DELETED = 'RESOURCE_DELETED';
export const EVENT_RESOURCE_MODIFIED = 'RESOURCE_MODIFIED';

export function resourceAdded(metadata: V1ObjectMeta): ResourceMetadataAction {
    return {
        type: EVENT_RESOURCE_ADDED,
        metadata: metadata,
    }
}

export function resourceDeleted(metadata: V1ObjectMeta): ResourceMetadataAction {
    return {
        type: EVENT_RESOURCE_DELETED,
        metadata: metadata,
    }
}

export function resourceModified(metadata: V1ObjectMeta): ResourceMetadataAction {
    return {
        type: EVENT_RESOURCE_MODIFIED,
        metadata: metadata,
    }
}
