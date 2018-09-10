import {V1ObjectMeta} from '@kubernetes/client-node';

export interface ResourceMetadataAction {
    type: string,
    metadata: V1ObjectMeta
}
