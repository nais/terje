import {all, call, cancelled, take} from "redux-saga/effects";
import {watchApiResources} from "./resourcewatcher/eventChannel";
import {addResourceToRole} from "./role/creator";
import {fetchRole, replaceRole} from "./role/sagas";

function* watchResourceEvents() {
    const resourceEventsChannel = yield call(watchApiResources);

    try {
        while (true) {
            let event = yield take(resourceEventsChannel);
            console.log("Saga got event for resource", event.metadata.name, "in namespace", event.metadata.namespace);

            let resourceType = getResourceTypeFromSelfLink(event.metadata.selfLink);
            let team = getTeamFromMetadata(event.metadata.labels);
            if (!(team)) {
                console.log("Empty team name label, skipping");
                continue
            }

            const role = yield call(fetchRole, 'team-' + team, event.metadata.namespace);
            let [updatedRole, updated] = addResourceToRole(role, resourceType, event.metadata.name);

            if (updated) {
                yield call(replaceRole, updatedRole);
            } else {
                console.log("nothing changed in the role, skipping replace")
            }
        }
    } finally {
        if (yield cancelled()) {
            resourceEventsChannel.close();
            console.log('Metadata event channel cancelled');
        }
    }
}


export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
    ])
}

function getTeamFromMetadata(labels: { [key: string]: string }): string {
    if (labels) {
        if (labels.hasOwnProperty("team")) {
            return labels.team;
        }
    }
}

function getResourceTypeFromSelfLink(selfLink: string) {
    // Example selfLink: '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj'

    let parts = selfLink.split('/');
    return parts[parts.length - 2]
}
