import express from 'express';
import { collectDefaultMetrics, register } from "prom-client";
import { applyMiddleware, combineReducers, createStore } from "redux";
import createSagaMiddleware from 'redux-saga';
import parentLogger from "./logger";
import { role } from './role/reducer';
import rootSaga from './sagas';


// Probe every 5th second.
collectDefaultMetrics({ timeout: 5000 })

const logger = parentLogger.child({ module: 'app' })

const sagaMiddleware = createSagaMiddleware()

const reducers = combineReducers({ role })
const store = createStore(reducers, applyMiddleware(sagaMiddleware))

sagaMiddleware.run(rootSaga)
logger.info('Terje started.')

const server = express()
server.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(register.metrics())
})

logger.info("Serving /metrics on port 8080")
server.listen(8080)
