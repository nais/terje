import { V1ObjectMeta, V1Role } from '@kubernetes/client-node'
import { addResourceToRole, removeResourceFromRole, createRole } from './creator'
import { getResourceTypeFromSelfLink, getTeamFromMetadata } from '../helpers'
import { RoleState, ResourceAction } from './types'
import { EVENT_RESOURCE_ADDED, EVENT_RESOURCE_DELETED, EVENT_RESOURCE_MODIFIED } from '../resourcewatcher/events'
import parentLogger from '../logger'

const logger = parentLogger.child({ module: "role" })

export function add(state: RoleState, meta: V1ObjectMeta) {
    if (!meta) return state

    const team = getTeamFromMetadata(meta.labels)
    const resourceType = getResourceTypeFromSelfLink(meta.selfLink)

    if (!state.hasOwnProperty(meta.namespace)) {
        state[meta.namespace] = {}
    }

    if (!state[meta.namespace].hasOwnProperty(team)) {
        state[meta.namespace][team] = createRole(team, meta.namespace)
    }

    state[meta.namespace][team] = addResourceToRole(state[meta.namespace][team], resourceType, meta.name)

    logger.debug("added to state", state, meta)
    return state
}

export function del(state: RoleState, meta: V1ObjectMeta) {
    if (!meta) return state

    const team = getTeamFromMetadata(meta.labels)
    const resourceType = getResourceTypeFromSelfLink(meta.selfLink)

    if (!state.hasOwnProperty(meta.namespace)) {
        return state
    }

    if (!state[meta.namespace].hasOwnProperty(team)) {
        return state
    }

    state[meta.namespace][team] = removeResourceFromRole(state[meta.namespace][team], resourceType, meta.name)

    logger.debug("removed from state", state, meta)
    return state
}

export function role(state: RoleState = {}, action: ResourceAction) {
    logger.debug("reducing state", state, action)
    switch (action.type) {
        case EVENT_RESOURCE_ADDED:
            logger.debug("added", state, action)
            return add(state, action.metadata)
        case EVENT_RESOURCE_DELETED:
            logger.debug("deleted", state, action)
            return del(state, action.metadata)
        case EVENT_RESOURCE_MODIFIED:
            logger.debug("modified", state, action)
            // TODO remove resource from other roles
            return add(state, action.metadata)
        default:
            logger.debug("default", state, action)
            return state
    }
}
