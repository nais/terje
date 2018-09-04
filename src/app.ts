import {applyMiddleware, combineReducers, createStore} from "redux";
import createSagaMiddleware from 'redux-saga'
import rootSaga from './sagas'

const sagaMiddleware = createSagaMiddleware();
createStore(
    combineReducers(() => {
    }),
    applyMiddleware(sagaMiddleware)
);


sagaMiddleware.run(rootSaga);
