import {Logger} from "pino"

const parentLogger : Logger = require('pino')({
    level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info",
    useLevelLabels: true,
    base: null,
})

export default parentLogger
