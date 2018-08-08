'use strict';

const Joi = require('joi');
const redis = require('./redis');
const waitForRedis = require('./wait-for-redis');
const Handler = require('./Handler');
const fs = require('fs');
const walk = require('./walk');
const R = require('ramda');
const promiseRetry = require('promise-retry');
const eventBuffer = require('./event-buffer');

const configSchema = Joi.object({
	redis: Joi.object({
		host: Joi.string().default('localhost').description('redis host'),
		port: Joi.number().integer().default(6379).description('redis port'),
		password: Joi.string().allow('').default('').description('redis password'),
		db: Joi.number().integer().default(12).description('redis database to use'),
	}).description('the redis configuration'),
	broker: Joi.string().default('in-memory').valid('in-memory', 'redis').description('backend broker to use'),
	brokerWildcard: Joi.string().default('%').valid('%', '*')
		.description('broker topic wildcard')
		.notes(['\'%\' is preferred because \'*\' is not usable on all file systems']),
	handlerDir: Joi.string().description('path to the base directory containing handlers'),
	retries: Joi.number().min(1).default(5).description('How often a handler should be tried before giving up'),
	concurrency: Joi.number().min(1).default(1).description('How many handler are allowed to be executed in parallel'),
	topicTypes: Joi.array().items(Joi.object({
		topic: Joi.string().description('name of the topic this tyope applies to').required(),
		type: Joi.object().description('the compiled AVRO type as returned by (avsc.parse(<schema>))'),
	})).default({}).description('topic/types map'),
	requestEventBuffer: Joi.object({
		enabled: Joi.boolean().default(false).description('whether the eventBuffer is enabled'),
		resourcePropertyName: Joi.string().default('resId').description('name of the proerty in the event data to detect multiple events on same resource'),
		resIdAccessor: Joi.func().default(evtData => evtData.payload.resId),
	}).default({ enabled: false }).description('Buffer all events in the current request context deduplicate and send after the handler finshed. Only used for event created using "publishHttpReply" method.'), //eslint-disable-line
});

const statusName = (status) => {
	const map = {
		200: 'ok',
		202: 'accepted',
		201: 'created',
		204: 'no-content',
		400: 'bad-request',
		401: 'unauthorized',
		403: 'forbidden',
		404: 'not-found',
		409: 'conflict',
		410: 'gone',
		500: 'internal-server-error',
		501: 'not-implemented',
	};
	return map[status];
};

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

		if (this.config.requestEventBuffer && this.config.requestEventBuffer.enabled) {
			const httpEndpoint = this.service.endpoints.endpoints.find(e => e.type === 'http');
			if (!httpEndpoint) {
				this.log.error('NO HTTP ENDPOINT CONFIGURED');
				return;
			}
			httpEndpoint.instance.server.ext('onPreResponse', async (req, next) => {
				await eventBuffer.publishEvents(req, this);
				next.continue();
			});
		}
	}

	async setupBroker() {
		this.log.info(`Setup with broker: ${this.config.broker}`);
		let mqFactory;
		switch (this.config.broker) {
			case 'redis':
				await waitForRedis(redis(this.config.redis), this.log);
				mqFactory = require('mqemitter-redis'); //eslint-disable-line
				this.mq = mqFactory({
					db: 0,
					host: this.config.redis.host,
					port: this.config.redis.port,
					password: this.config.redis.password,
					concurrency: this.config.concurrency,
					wildcardSome: this.config.brokerWildcard,
				});
				this.mq.state.on('error', (error) => {
					this.log.error('ioredis ERROR:', error);
				});
				break;
			case 'in-memory':
				mqFactory = require('mqemitter'); //eslint-disable-line
				this.mq = mqFactory({
					concurrency: this.config.concurrency,
					wildcardSome: this.config.brokerWildcard,
				});
				break;
			default:
				throw new Error(`Unknown broker: ${this.config.broker}`);
		}
		return {
			subscribe: (topic, handler) => new Promise((resolve, reject) => {
				this.mq.on(topic, async (message, cb) => {
					const data = JSON.parse(message.payload);
					try {
						await promiseRetry({
							retries: this.config.retries,
							minTimeout: 100,
						}, async (retry, number) => {
							const asPromise = await Promise.resolve(handler);
							try {
								await asPromise(message.topic, data);
							} catch (err) {
								this.log.error('Attempt', number, message.topic, err);
								await retry(err);
							}
						});
						cb();
					} catch (err) {
						this.log.error(topic, err);
						cb();
					}
				}, (err) => {
					if (err) return reject(err);
					return resolve();
				});
			}),
			publish: (topic, payload) => new Promise((resolve, reject) => {
				this.mq.emit({ topic, payload: JSON.stringify(payload) }, (err) => {
					if (err) return reject(err);
					return resolve();
				});
			}),
		};
	}

	async start() {
		this.log.debug('start');
		this.broker = await this.setupBroker();

		this.handlers = this.resolveHandlers(this.broker);
		this.service.publish = this.publish.bind(this);
		this.service.subscribe = this.subscribe.bind(this);
		return {
			publish: this.publish.bind(this),
			subscribe: this.subscribe.bind(this),
		};
	}

	static fixupTopicName(topic) {
		let newName = topic;
		if (topic[0] === '/') {
			newName = newName.substr(1);
		}
		return newName;
	}

	subscribe(topic, handler) {
		return this.broker.subscribe(AtrixPubsub.fixupTopicName(topic), handler);
	}

	publish(topic, data) {
		const fixedTopic = AtrixPubsub.fixupTopicName(topic);
		this.log.debug(`publish on topic: "${fixedTopic}"`, data);
		const entry = R.find(R.propEq('topic', fixedTopic), this.config.topicTypes);
		if (entry) {
			this.log.debug(`Validate message of topic: "${fixedTopic}" with type: "${JSON.stringify(entry.type)}".`);
			const paths = [];
			entry.type.isValid(data, { errorHook: path => paths.push(path.join()) });
			if (paths.length) {
				const e = new Error();
				e.name = 'ValidationError';
				e.message = `AVRO Validation failed! paths: ${paths.join()}`;
				throw e;
			}
		} else {
			this.log.warn(`No type sepcified for topic: ${fixedTopic}. Sending untyped message!`);
		}
		return this.broker.publish(fixedTopic, data); // eslint-disable-line no-multi-assign
	}

	async publishHttpReply(req, data, status, routePrefix) {
		// console.log('publishHttpReply', req.headers);
		const routeWithoutPrefix = req.route.path.replace(new RegExp(`^${routePrefix}`), '');
		const escapedRoute = routeWithoutPrefix.replace(/[{}]/g, '_');
		const topic = `${this.service.name.toLowerCase()}.svc${escapedRoute}/${req.method}.${statusName(status)}`;
		const evtData = {
			path: req.route.path,
			payload: data || null,
			params: req.params || null,
			query: req.query || null,
		};
		if (this.config.requestEventBuffer && this.config.requestEventBuffer.enabled && req.headers['x-atrix-context-req-id']) {
			req.log.info(`Buffer event on topic: ${topic} ${JSON.stringify(evtData)}`);
			if (!eventBuffer.queueEvent(req, topic, evtData, this)) {
				req.log.info('No resId found for event buffering');
				await this.publish(topic, evtData);
			}
		} else {
			await this.publish(topic, evtData);
		}
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
			const name = AtrixPubsub.fixupTopicName(file.replace(this.config.handlerDir, '').replace(/\^/g, '/').replace(/_\.js|\.js/, ''));
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
			// console.log(handlerConfig.service.config);
			handlerConfig.service.config = Object.assign({}, handlerConfig.service.config, this.config);
			if (module.schema) {
				handlerConfig.schema = module.schema;
			}
			return new Handler(handlerConfig);
		});
	}
}

module.exports = AtrixPubsub;
