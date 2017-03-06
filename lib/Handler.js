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
			data: Joi.object({
				id: Joi.any(),
				name: Joi.string().required(),
				started: Joi.number().optional(),
				payload: Joi.object(),
			}).required(),
		}).unknown(true);

		if (this.dataSchema) {
			this.baseSchema = Joi.object({
				data: Joi.object({
					id: Joi.any(),
					name: Joi.string().required(),
					started: Joi.number().optional(),
					payload: this.dataSchema.required(),
				}).required(),
			}).unknown(true);
		}

		if (opts.handlerFunc) {
			this.setHandlerFunc(opts.handlerFunc);
		}

		this.broker.subscribe(this.pattern, async (topic, ...args) => {
			this.log.debug(`Subscribe to topic: ${topic}`);
			const task = {
				data: {
					id: uuid(),
					name: topic,
					payload: args[0],
				},
			};

			try {
				await this.process(task);
			} catch (e) {
				this.log.error(e);
			}
		});
	}

	setHandlerFunc(func) {
		this.handlerFunc = func;
	}

	processJobData(data) {
		return this.handlerFunc(data);
	}

	async process(job) {
		const jobData = Joi.attempt(job, this.baseSchema);
		this.log.debug(`${jobData.data.name} id: ${jobData.data.id} handler pattern: ${this.pattern}`);


		if (!this.handlerFunc) {
			throw new Error('No handlerFunc registered!');
		}

		jobData.data.started = new Date().getTime(); // eslint-disable-line no-param-reassign
		const res = await this.handlerFunc({
			path: jobData.data.name,
			payload: job.data.payload,
			log: this.log,
		}, () => {}, this.service);

		const msec = new Date().getTime() - jobData.data.started;
		this.log.debug({
			msec,
		}, `Finished Job: ${jobData.data.name} id: ${jobData.data.id} handler pattern: ${this.pattern}`);
		return res;
	}
}

module.exports = Handler;
