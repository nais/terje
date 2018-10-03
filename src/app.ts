import {applyMiddleware, combineReducers, createStore} from "redux";
import createSagaMiddleware from 'redux-saga'
import rootSaga from './sagas'
import express from 'express';

import parentLogger from "./logger";
import {register, collectDefaultMetrics} from "prom-client";

// Probe every 5th second.
collectDefaultMetrics({timeout: 5000});

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

const server = express();
server.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
});

logger.info("Service /metrics on port 8080");
server.listen(8080)
