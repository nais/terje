import {all, call, cancelled, take } from "redux-saga/effects";
import {watchApiResources} from "./resourcewatcher/eventChannel";
import {addResourceToRole, removeResourceFromRole} from "./role/creator";
import {fetchRole, replaceRole} from "./role/sagas";
import {EVENT_RESOURCE_ADDED, EVENT_RESOURCE_DELETED, EVENT_RESOURCE_MODIFIED} from "./resourcewatcher/events";
import {V1ObjectMeta, V1Role} from "@kubernetes/client-node";

import parentLogger from "./logger";
import {getResourceTypeFromSelfLink, getTeamFromMetadata } from "./helpers";
import {keepRoleBindingsInSync} from "./rolebinding/sagas";

const logger = parentLogger.child({module: 'main'});

export function* handleResourceEvent(event: { type: string, metadata: V1ObjectMeta } ) {
    logger.debug("Saga got event for resource", event.metadata.name, "in namespace", event.metadata.namespace);

    let resourceType = getResourceTypeFromSelfLink(event.metadata.selfLink);
    let team = getTeamFromMetadata(event.metadata.labels);
    if (!(team)) {
        logger.debug("Empty team name label, skipping");
        return
    }

    const role = yield call(fetchRole, 'nais:team:' + team, event.metadata.namespace);

    let updatedRole: V1Role = undefined;

    switch (event.type) {
        case EVENT_RESOURCE_ADDED:
            updatedRole = addResourceToRole(role, resourceType, event.metadata.name);
            break;
        case EVENT_RESOURCE_DELETED:
            updatedRole = removeResourceFromRole(role, resourceType, event.metadata.name);
            break;
        case EVENT_RESOURCE_MODIFIED:
            updatedRole = addResourceToRole(role, resourceType, event.metadata.name);
            // remove resource from other roles
            break;
        default:
            logger.info('invalid event type:', event);
            return;
    }

    yield call(replaceRole, updatedRole);
}

function* watchResourceEvents() {
    const resourceEventsChannel = yield call(watchApiResources);

    try {
        while (true) {
            try {
                let event = yield take(resourceEventsChannel);
                yield handleResourceEvent(event);
            } catch (e) {
                logger.warn("failed while processing event", e, e.stack)
            }
        }
    } finally {
        if (yield cancelled()) {
            resourceEventsChannel.close();
            logger.info('Metadata event channel cancelled');
        }
    }
}

export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
        keepRoleBindingsInSync(),
    ])
}
