import { call, cancelled, put, take } from "redux-saga/effects";
import parentLogger from "../logger";
import { watchApiResources } from "./eventChannel";

const logger = parentLogger.child({ module: 'resourcewatcher' })

export function* watchResourceEvents() {
    const resourceEventsChannel = yield call(watchApiResources)

    try {
        while (true) {
            try {
                let event = yield take(resourceEventsChannel)
                logger.debug('putting event in store', event)
                yield put(event)
            } catch (e) {
                logger.error("failed while processing event", e, e.stack)
            }
        }
    } finally {
        if (yield cancelled()) {
            resourceEventsChannel.close()
            logger.error('Metadata event channel cancelled')
        }
    }
}