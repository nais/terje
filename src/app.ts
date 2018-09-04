import {createStore, applyMiddleware} from "redux";
import createSagaMiddleware from 'redux-saga'
import terjeApp from "./reducers";
import rootSaga from './sagas'

const sagaMiddleware = createSagaMiddleware();
const store = createStore(
    terjeApp,
    applyMiddleware(sagaMiddleware)
);


sagaMiddleware.run(rootSaga);
