import {applyMiddleware, combineReducers, createStore} from "redux";
import createSagaMiddleware from 'redux-saga'
import rootSaga from './sagas'

import parentLogger from "./logger";

const logger = parentLogger.child({module: 'main'});

const sagaMiddleware = createSagaMiddleware();

createStore(
    combineReducers({
        asd: (state: {} = {}) => {
            return state
        }
    }),
    applyMiddleware(sagaMiddleware)
);

sagaMiddleware.run(rootSaga);
logger.info('Terje started.');
