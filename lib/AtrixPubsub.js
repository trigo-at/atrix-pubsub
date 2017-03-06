'use strict';

const Joi = require('joi');
const redis = require('./redis');
const waitForRedis = require('./wait-for-redis');
const Handler = require('./Handler');
const fs = require('fs');
const walk = require('./walk');
const ascoltatori = require('ascoltatori');
const bb = require('bluebird');

bb.promisifyAll(ascoltatori);

const configSchema = Joi.object({
	redis: Joi.object({
		host: Joi.string().default('localhost').description('redis host'),
		port: Joi.number().integer().default(6379).description('redis port'),
		db: Joi.number().integer().default(12).description('redis database to use'),
	}).description('the redis configuration'),
	broker: Joi.string().default('in-memory').valid('in-memory', 'redis').description('backend broker to use'),
	handlerDir: Joi.string().description('path to the base directory containing handlers'),
});

class AtrixPubsub {
	constructor(atrix, service, config) {
		this.retries = {};
		this.atrix = atrix;
		this.service = service;
		this.log = this.service.log.child({ plugin: 'AtrixPubsub' });
		this.config = Joi.attempt(config, configSchema);

		if (this.config.handlerDir && !fs.existsSync(this.config.handlerDir)) {
			throw new Error(`Invalid handlerDir: "${this.config.handlerDir}"`);
		}
	}

	async setUpAcoltatori() {
		this.log.info(`Setup with broker: ${this.config.broker}`);
		switch (this.config.broker) {
			case 'redis':
				await waitForRedis(redis(this.config.redis), this.log);
				return ascoltatori.buildAsync({
					type: 'redis',
					db: 0,
					host: this.config.redis.host,
					port: this.config.redis.port,
					return_buffers: true,
				});
			case 'in-memory':
				return ascoltatori.buildAsync();
			default:
				throw new Error(`Unknown broker: ${this.config.broker}`);
		}
	}

	async start() {
		this.log.debug('start');
		const ascoltatore = await this.setUpAcoltatori();
		bb.promisifyAll(ascoltatore);

		this.handlers = this.resolveHandlers(ascoltatore);

		this.service.publish = ascoltatore.publishAsync.bind(ascoltatore);
		return {
			publish: ascoltatore.publishAsync.bind(ascoltatore),
			subscribe: ascoltatore.subscribe.bind(ascoltatore),
		};
	}

	resolveHandlers(broker) {
		if (!this.config.handlerDir) {
			return [];
		}
		const handlerFiles = walk(this.config.handlerDir);
		return handlerFiles.filter((file) => { // eslint-disable-line
			return file.indexOf('specs.js') === -1 && file.indexOf('.js') === file.length - 3;
		}).map((file) => {
			const module = require(file); // eslint-disable-line
			let name = file.replace(this.config.handlerDir, '').replace('^', '/').replace(/_\.js|\.js/, '');
			if (name[0] === '/') {
				name = name.substr(1);
			}
			if (!module.handler || typeof module.handler !== 'function') {
				throw new Error(`No handler function defined in file: ${file}`);
			}
			const handlerConfig = {
				broker,
				service: this.service,
				log: this.log.child({ eventHandler: name }),
				pattern: name,
				description: module.description || `Handler name: ${name}`,
				schema: module.schema || undefined,
				handlerFunc: module.handler,
			};
			if (module.schema) {
				handlerConfig.schema = module.schema;
			}
			return new Handler(handlerConfig);
		});
	}
}

module.exports = AtrixPubsub;
