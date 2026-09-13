import { Logger } from "tslog";

const LOG_LEVEL: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" = process.env.LOG_LEVEL ? (process.env.LOG_LEVEL as "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR") : "INFO";

const log = new Logger({})

export default log;