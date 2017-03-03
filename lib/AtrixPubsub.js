'use strict';

const Joi = require('joi');
// const redis = require('./redis');
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
		switch(this.config.broker) {
			case 'redis':
				console.log('redis setup')
				return new Promise((resolve, reject) => {
					ascoltatori.build({
						type: 'redis',
						// redis: require('redis'), // eslint-disable-line
						// db: 0,
						// host: this.config.redis.host,
						// port: this.config.redis.port,
						// return_buffers: true,
					}, (err, ascoltatore) => {
						if (err) {
							reject(err);
							return;
						}
						ascoltatore.publish('test/message', 'asgasg', () => {
							console.log('published test message');
							resolve(ascoltatore);
						});
					});
				});
			case 'in-memory':
				return ascoltatori.buildAsync();
		}
	}

	async start() {
		this.log.debug('start');

		// await waitForRedis(this.getRedis(), this.log);
		const ascoltatore = await this.setUpAcoltatori();
		ascoltatore.publish('test/message', 'asgasg', function() {
			console.log('published');
		});
		bb.promisifyAll(ascoltatore);
		// this.workerQueue = new WorkerQueue(this.config, this.log);

		// this.handlers = this.resolveHandlers();
		// this.workerQueue.registerHandlers(this.handlers);
		// await this.workerQueue.connect();
		// if (this.config.listen) {
			// await this.workerQueue.listen();
		// }

		return {
			publish: ascoltatore.publishAsync.bind(ascoltatore),
		};
	}

	resolveHandlers() {
		// if (!this.config.handlerDir) {
			// return [];
		// }
		// const handlerFiles = walk(this.config.handlerDir);
		// return handlerFiles.filter((file) => { // eslint-disable-line
			// return file.indexOf('specs.js') === -1 && file.indexOf('.js') === file.length - 3;
		// }).map((file) => {
			// let name = file.replace(this.config.handlerDir, '').replace('-', ':').replace('/', ':').replace(/_\.js|\.js/, '');
			// if (name[0] === ':') {
				// name = name.substr(1);
			// }
			// const module = require(file); // eslint-disable-line
			// if (!module.handler || typeof module.handler !== 'function') {
				// throw new Error(`No handler function defined in file: ${file}`);
			// }
			// const handlerConfig = {
				// service: this.service,
				// log: this.log.child({ eventHandler: name }),
				// pattern: name,
				// description: module.description || `Handler name: ${name}`,
				// schema: module.schema || undefined,
				// handlerFunc: module.handler,
			// };
			// if (module.schema) {
				// handlerConfig.schema = module.schema;
			// }

			// return new Handler(handlerConfig);
		// });
	}

	// getRedis() {
		// return redis(this.config.redis);
	// }

}

module.exports = AtrixPubsub;
