'use strict';

const Joi = require('joi');
const R = require('ramda');
const fakeLogger = require('./fake-logger');
const uuid = require('uuid');

class Handler {
	constructor(options) {
		if (!options.broker || typeof options.broker.subscribe !== 'function') {
			throw new Error('Argument broker missiong of not exposing subscribe function');
		}
		const opts = R.merge({
			log: fakeLogger,
		}, options);
		this.opts = opts;
		this.log = opts.log;
		this.broker = opts.broker;
		this.handlerFunc = null;
		this.pattern = opts.pattern;
		this.disabled = false;
		this.description = opts.description || '';
		this.dataSchema = opts.schema;
		this.applicationName = 'UNNAMED-APPLICATION';
		this.queueName = 'UNNAMED-QUEUE';
		this.service = opts.service;
		this.baseSchema = Joi.object({
			topic: Joi.forbidden(),
			log: Joi.forbidden(),
			id: Joi.forbidden(),
			payload: Joi.object().allow(null),
		}).unknown(true);

		if (this.dataSchema) {
			this.baseSchema = Joi.object({
				topic: Joi.forbidden(),
				log: Joi.forbidden(),
				id: Joi.forbidden(),
				payload: this.dataSchema.required(),
			}).unknown(true);
		}
		this.log.debug(`Subscribe to topic: ${this.pattern}`);
		this.broker.subscribe(this.pattern, async (topic, data) => {
			this.log.info('Topic:', topic, data);
			await this.handler(topic, data, this.opts);
		});
	}
	async handler(topic, data, opts) {
		try {
			const entry = R.find(R.propEq('topic', topic), this.service.config.topicTypes);
			if (entry) {
				this.log.debug(`Validate message of topic: "${topic}" with type: "${JSON.stringify(entry.type)}".`);
				const paths = [];
				entry.type.isValid(data, { errorHook: path => paths.push(path.join()) });
				if (paths.length) {
					const e = new Error();
					e.name = 'ValidationError';
					e.message = `AVRO Validation failed! paths: ${paths.join()}`;
					throw e;
				}
			} else {
				this.log.warn(`No type specified for topic: ${topic}. Sending untyped message!`);
			}
			const jobData = Joi.attempt(data, this.baseSchema);
			const req = R.merge(jobData, {
				topic,
				id: uuid(),
				log: this.log,
			});
			this.log.debug(`Handle message: ${topic} id: ${data.id} handler pattern: ${this.pattern}`);

			if (!opts.handlerFunc) {
				throw new Error('No handlerFunc registered!');
			}

			const started = new Date().getTime();
			await opts.handlerFunc(req, () => {}, this.service);
			const msec = new Date().getTime() - started;
			this.log.debug({
				msec,
			}, `Finished message: ${topic} id: ${req.id} handler pattern: ${this.pattern}`);
		} catch (e) {
			this.log.error(e);
		}
	}
}

module.exports = Handler;
