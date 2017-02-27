'use strict';

const consoleLogger = {
	debug: console.log, // eslint-disable-line no-console
	log: console.log, // eslint-disable-line no-console
	warn: console.warn, // eslint-disable-line no-console
	error: console.error, // eslint-disable-line no-console
	info: console.log, // eslint-disable-line no-console
};
consoleLogger.child = () => consoleLogger;

const nullLogger = {
	debug: () => {},
	log: () => {},
	warn: () => {},
	error: () => {},
	info: () => {},
};

nullLogger.child = () => nullLogger;

if (process.env.I_WANT_TEST_LOGGING) {
	module.exports = consoleLogger;
} else {
	module.exports = nullLogger;
}

