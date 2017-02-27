'use strict';

const Redis = require('ioredis');

let redis;

function redisFactory(config) {
	if (redis) {
		return redis;
	}

	const options = {
		host: config.host,
		port: config.port,
	};

	if (config.keyPrefix) {
		options.keyPrefix = config.keyPrefix;
	}

	redis = new Redis(options);
	return redis;
}

module.exports = redisFactory;
