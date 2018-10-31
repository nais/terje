import { V1ObjectMeta } from '@kubernetes/client-node';
import { getResourceTypeFromSelfLink, getTeamFromMetadata } from '../helpers';
import parentLogger from '../logger';
import { EVENT_RESOURCE_ADDED, EVENT_RESOURCE_DELETED, EVENT_RESOURCE_MODIFIED } from '../resourcewatcher/events';
import { addResourceToRole, createRole, removeResourceFromRole } from './creator';
import { ResourceAction, RoleState } from './types';
import promClient from 'prom-client'

const addedCounter = new promClient.Counter({ name: "event_added_count", help: "Amount of ADDED events received" })
const modifiedCounter = new promClient.Counter({ name: "event_modified_count", help: "Amount of MODIFIED events received" })
const deletedCounter = new promClient.Counter({ name: "event_deleted_count", help: "Amount of DELTED events received" })
const totalCounter = new promClient.Counter({ name: "event_count", help: "Amount of events received" })

const logger = parentLogger.child({ module: "rolereducer" })

export function add(state: RoleState, meta: V1ObjectMeta) {
    if (!meta) return state

    const team = getTeamFromMetadata(meta.labels)
    if (!team || team.length == 0) return state

    const resourceType = getResourceTypeFromSelfLink(meta.selfLink)

    if (!state.hasOwnProperty(meta.namespace)) {
        state[meta.namespace] = {}
    }

    if (!state[meta.namespace].hasOwnProperty(team)) {
        state[meta.namespace][team] = createRole(team, meta.namespace)
    }

    state[meta.namespace][team] = addResourceToRole(state[meta.namespace][team], resourceType, meta.name)

    logger.debug("added to state", meta.name, meta.namespace)
    return state
}

export function del(state: RoleState, meta: V1ObjectMeta) {
    if (!meta) return state

    const team = getTeamFromMetadata(meta.labels)
    if (!team || team.length == 0) return state
    const resourceType = getResourceTypeFromSelfLink(meta.selfLink)

    if (!state.hasOwnProperty(meta.namespace)) {
        return state
    }

    if (!state[meta.namespace].hasOwnProperty(team)) {
        return state
    }

    state[meta.namespace][team] = removeResourceFromRole(state[meta.namespace][team], resourceType, meta.name)

    logger.debug("removed from state", meta.name, meta.namespace)
    return state
}

export function role(state: RoleState = {}, action: ResourceAction) {
    state = Object.assign({}, state)
    logger.debug("got action", action.type, action)
    totalCounter.inc()
    switch (action.type) {
        case EVENT_RESOURCE_ADDED:
            addedCounter.inc()
            return add(state, action.metadata)
        case EVENT_RESOURCE_DELETED:
            deletedCounter.inc()
            return del(state, action.metadata)
        case EVENT_RESOURCE_MODIFIED:
            // TODO remove resource from other roles
            modifiedCounter.inc()
            return add(state, action.metadata)
        default:
            logger.warn("Got unrecognized action", state, action)
            return state
    }
}
