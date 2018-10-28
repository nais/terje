import { all } from "redux-saga/effects";
import { watchResourceEvents } from "./resourcewatcher/sagas";
import { keepRolesInSync } from "./role/sagas";
import { keepRoleBindingsInSync } from "./rolebinding/sagas";
export default function* rootSaga() {
    yield all([
        watchResourceEvents(),
        keepRoleBindingsInSync(),
        keepRolesInSync(),
    ])
}
