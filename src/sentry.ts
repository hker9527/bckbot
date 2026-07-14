import * as Sentry from "@sentry/bun";
import { Logger, type ILogObj } from "tslog";

export const initSentry = () => {
	Sentry.init({
		dsn: Bun.env.sentry_dsn,
		environment: Bun.env.NODE_ENV ?? "development",
		enabled: !!Bun.env.sentry_dsn
	});
};

// tslog wraps thrown Errors into { nativeError, name, message, stack }
const unwrapError = (arg: unknown): Error | undefined => {
	if (arg instanceof Error) return arg;
	if (arg && typeof arg === "object" && (arg as any).nativeError instanceof Error) {
		return (arg as any).nativeError;
	}
	return undefined;
};

// Forward error/fatal tslog entries to Sentry. Attach to root loggers;
// subloggers inherit the transport automatically.
const sentryTransport = (logObj: ILogObj) => {
	const meta = (logObj as any)._meta;
	if (!meta || meta.logLevelId < 5) return; // 5 = error, 6 = fatal

	const args = Object.keys(logObj)
		.filter(k => k !== "_meta")
		.map(k => (logObj as any)[k]);

	const source = meta.name ?? "unknown";
	const level = meta.logLevelId >= 6 ? "fatal" : "error";
	const err = args.map(unwrapError).find(Boolean);
	const rest = args.filter(a => !unwrapError(a));

	if (err) {
		Sentry.captureException(err, { level, tags: { source }, extra: { args: rest } });
	} else {
		const msg = rest.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
		Sentry.captureMessage(msg || "error", { level, tags: { source } });
	}
};

export const createLogger = (settings: ConstructorParameters<typeof Logger>[0]) => {
	const logger = new Logger(settings);
	logger.attachTransport(sentryTransport);
	return logger;
};
