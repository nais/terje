import {combineReducers} from "redux";
import {role} from "./role/reducers";


const terjeApp = combineReducers({
    "role": role,
});

export default terjeApp