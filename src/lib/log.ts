import { Logger } from "tslog";

const LOG_LEVELS = ["SILLY", "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const requestedLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
const defaultLevel: LogLevel = process.env.NODE_ENV === "production" ? "INFO" : "DEBUG";
const LOG_LEVEL: LogLevel = requestedLevel && LOG_LEVELS.includes(requestedLevel) ? requestedLevel : defaultLevel;
const LOG_FORMAT = process.env.LOG_FORMAT === "json" ? "json" : "pretty";
const MAX_STRING_LENGTH = 2000;
const RUNTIME_SECRETS = [process.env.DATABASE_URL, process.env.JWT_SECRET].filter(
  (value): value is string => Boolean(value && value.length >= 4)
);

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "senha",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "authtoken",
  "clientsecret",
  "client_secret",
  "privatekey",
  "private_key",
  "cookie",
  "set_cookie",
  "secret",
  "jwtsecret",
  "jwt_secret",
  "twofactorsecret",
  "two_factor_secret",
  "2fasecret",
  "connectionstring",
  "connection_string",
  "databaseurl",
  "database_url",
]);

function sanitizeString(value: string) {
  const redacted = RUNTIME_SECRETS.reduce((result, secret) => result.replaceAll(secret, "[REDACTED]"), value);
  return redacted.slice(0, MAX_STRING_LENGTH);
}

/** Remove segredos e limita objetos antes de eles serem enviados ao logger. */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[profundidade máxima]";
  if (value instanceof Error) return describeError(value);
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return typeof value === "string" ? sanitizeString(value) : value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeForLog(item, depth + 1));

  const object = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(object)
      .slice(0, 100)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ""))
          ? "[REDACTED]"
          : sanitizeForLog(item, depth + 1),
      ])
  );
}

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: sanitizeString(error.message), stack: error.stack ? sanitizeString(error.stack) : undefined };
  }
  return { value: sanitizeForLog(error) };
}

const log = new Logger({
  name: "e-imune",
  type: LOG_FORMAT,
  minLevel: LOG_LEVEL,
  mask: {
    keys: [...SENSITIVE_KEYS],
    caseInsensitive: true,
    placeholder: "[REDACTED]",
  },
});

export default log;
