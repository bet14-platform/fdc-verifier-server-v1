import "dotenv/config";
import winston from "winston";
import { randomUUID } from "crypto";
import SentryTransport from "winston-transport-sentry-node";
import { envBool } from "./utils";
import traverse from "traverse";
import { klona } from "klona/full";

const debug = envBool(process.env.DEBUG);

const sensitiveKeys = [/cookie/i, /passw(or)?d/i, /^pw$/, /^pass$/i, /secret/i, /token/i, /api[-._]?key/i];

function redactUrl(url: string) {
    return url.replace(/(\?|&)apiKey=[^&]+(&|$)/, "$1apiKey=[REDACTED]$2");
}

function isSensitiveKey(keyStr: string) {
    if (keyStr) {
        return sensitiveKeys.some((regex) => regex.test(keyStr));
    }
    return false;
}

function redactObject(obj: any) {
    traverse(obj).forEach(function redactor(this: any) {
        if (isSensitiveKey(this.key)) {
            this.update("[REDACTED]");
        } else if (typeof this.node === "string") {
            // Check if the string contains a URL with apiKey
            if (this.node.includes("apiKey=")) {
                this.update(redactUrl(this.node));
            }
        }
    });
}

function redact(obj: any) {
    const copy = klona(obj); // Making a deep copy to prevent side effects
    redactObject(copy);

    const splat = copy[Symbol.for("splat")];
    if (splat) redactObject(splat); // Specifically redact splat Symbol

    return copy;
}

const logger = winston.createLogger({
    level: debug ? "debug" : "info",
    format: winston.format.combine(winston.format((info) => redact(info))(), winston.format.timestamp(), winston.format.json()),
    defaultMeta: { process: randomUUID() },
    handleExceptions: true,
    handleRejections: true,
});

if (process.env.NODE_ENV === "develop") {
    if (debug) {
        logger.add(
            new winston.transports.File({
                level: "debug",
                filename: "debug.log",
            }),
        );
    }
    logger.add(
        new winston.transports.File({
            level: "warn",
            filename: "warn.log",
        }),
    );
    logger.add(
        new winston.transports.File({
            level: "error",
            filename: "error.log",
            handleExceptions: true,
            handleRejections: true,
        }),
    );
    logger.add(
        new winston.transports.File({
            filename: "combined.log",
        }),
    );
} else if (process.env.NODE_ENV === "local") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(winston.format((info) => redact(info))(), winston.format.colorize(), winston.format.simple()),
            handleExceptions: true,
            handleRejections: true,
        }),
    );
} else if (process.env.SENTRY_URL) {
    logger.add(
        new SentryTransport({
            sentry: {
                dsn: process.env.SENTRY_URL,
                debug,
            },
            handleExceptions: true,
            handleRejections: true,
        }),
    );
}

export default logger;
