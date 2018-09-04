import {all, call, cancelled, put, select, take} from "redux-saga/effects";
import {watchApiResources} from "./eventchannels";
import {createOrUpdateRole, discardRole, fetchRole, getRole} from "./role/actions";
import {onCreateOrUpdateRole, onFetchRole} from "./role/sagas";
import {addResourceToRole, createRole} from "./role/rolecreator";

function* watchResourceEvents() {
    const resourceEventsChannel = yield call(watchApiResources);

    try {
        while (true) {
            let event = yield take(resourceEventsChannel);
            let team = getTeamFromMetadata(event.metadata.labels);
            if (!(team)) {
                console.log("Empty team name label, skipping.");
                continue
            }
            let roleName = 'team-' + team;
            let resourceType = getResourceTypeFromSelfLink(event.metadata.selfLink);
            let resourceName = event.metadata.name;

            console.log("Saga got event for resource", event.metadata.name , "in namespace", event.metadata.namespace);
            yield put(fetchRole(roleName, event.metadata.namespace));

            let role = yield select(getRole);
            if (!(role)) {
                role = createRole(team, event.metadata.namespace)
            }

            let updatedRole = addResourceToRole(role, resourceType, resourceName);

            yield put(createOrUpdateRole(updatedRole));

            yield put(discardRole());
        }
    } finally {
        yield put(discardRole());
        if (yield cancelled()) {
            resourceEventsChannel.close();
            console.log('Metadata event channel cancelled.');
        }
    }
}


export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
        onFetchRole(),
        onCreateOrUpdateRole(),
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
