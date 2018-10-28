import { V1ObjectMeta } from "@kubernetes/client-node"
import { all, call, cancelled, put, take } from "redux-saga/effects"
import parentLogger from "./logger"
import { watchApiResources } from "./resourcewatcher/eventChannel"
import { addResourceToState, keepRolesInSync } from "./role/sagas"
import { keepRoleBindingsInSync } from "./rolebinding/sagas"
import { watchResourceEvents } from "./resourcewatcher/sagas"
export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
        keepRoleBindingsInSync(),
        keepRolesInSync(),
    ])
}
