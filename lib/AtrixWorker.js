'use strict';

const Joi = require('joi');
const redis = require('./redis');
const waitForRedis = require('./wait-for-redis');
const WorkerQueue = require('./WorkerQueue');
const Handler = require('./Handler');
const fs = require('fs');
const walk = require('./walk');

const configSchema = Joi.object({
	redis: Joi.object({
		host: Joi.string().default('localhost').description('redis host'),
		port: Joi.number().integer().default(6379).description('redis port'),
	}).required().description('the redis configuration'),
	queueName: Joi.string().required().description('name of the worker queue'),
	handlerDir: Joi.string().description('path to the base directory containing handlers'),
	listen: Joi.boolean().default(false).description('wheter the woer should listen for jobs'),
});

class AtrixWorker {
	constructor(atrix, service, config) {
		this.retries = {};
		this.atrix = atrix;
		this.service = service;
		this.log = this.service.log.child({ plugin: 'AtrixWorker' });
		this.config = Joi.attempt(config, configSchema);

		if (this.config.handlerDir && !fs.existsSync(this.config.handlerDir)) {
			throw new Error(`Invalid handlerDir: "${this.config.handlerDir}"`);
		}
	}


	async start() {
		this.log.debug('start');

		await waitForRedis(this.getRedis(), this.log);
		this.workerQueue = new WorkerQueue(this.config, this.log);

		this.handlers = this.resolveHandlers();
		this.workerQueue.registerHandlers(this.handlers);
		await this.workerQueue.connect();
		if (this.config.listen) {
			await this.workerQueue.listen();
		}

		return {
			redis: this.getRedis(),
			workerQueue: this.workerQueue,
		};
	}

	resolveHandlers() {
		if (!this.config.handlerDir) {
			return [];
		}
		const handlerFiles = walk(this.config.handlerDir);
		return handlerFiles.filter((file) => { // eslint-disable-line
			return file.indexOf('specs.js') === -1 && file.indexOf('.js') === file.length - 3;
		}).map((file) => {
			let name = file.replace(this.config.handlerDir, '').replace('-', ':').replace('/', ':').replace(/_\.js|\.js/, '');
			if (name[0] === ':') {
				name = name.substr(1);
			}
			const module = require(file); // eslint-disable-line
			if (!module.handler || typeof module.handler !== 'function') {
				throw new Error(`No handler function defined in file: ${file}`);
			}
			const handlerConfig = {
				log: this.log.child({ eventHandler: name }),
				pattern: name,
				description: module.description || `Handler name: ${name}`,
				handlerFunc: module.handler,
			};
			if (module.schema) {
				handlerConfig.schema = module.schema;
			}

			return new Handler(handlerConfig);
		});
	}

	getRedis() {
		return redis(this.config.redis);
	}

}

module.exports = AtrixWorker;
