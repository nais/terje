import {Logger} from "pino";

const parentLogger : Logger = require('pino')({
    useLevelLabels: true,
    base: null,
});

export default parentLogger
