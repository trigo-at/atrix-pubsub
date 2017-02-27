'use strict';

const bb = require('bluebird');
const uuid = require('uuid');
const bull = require('bull');

class WorkerQueue {
	constructor(config, log) {
		if (!config.queueName) {
			throw new Error('Argument "config.queueName" is required!');
		}
		this.queueName = config.queueName;

		const defaultOptions = {
			redisHost: config.redis.host,
			redisPort: config.redis.port,
		};

		this.options = Object.assign(defaultOptions, config);

		this.log = log;
		this.handlers = [];
		this.cachedHandlers = {};
		this.workerQueue = null;
	}

	connect() {
		if (this.workerQueue) {
			this.log.info('WorkerQueue already connected!');
			return bb.resolve();
		}

		this.workerQueue = bull(this.queueName, this.options.redisPort, this.options.redisHost);
		this.workerQueue.on('completed', (job) => {
			// log.info('Job type: "' + job.data.name + '" id: "' + job.data.id + '" completed');
			job.remove().catch((err) => {
				this.log.error(`Error: deleting job type: "${job.data.name}" id: "${job.data.id}"`);
				this.log.error(err);
				this.log.error(err.stack);
			});
		});
		this.workerQueue.on('failed', (job, err) => {
			// log.info('Job: ' + job.data.name + ' - ' + job.data.id + ' failed');
			this.log.error(err);
		});

		this.workerQueue.on('error', (err) => {
			this.log.error(err);
		});
		this.log.info(`Connected to WorkerQueue: ${this.queueName}`);

		return bb.resolve();
	}

	queue(name, payload, options) {
		if (!this.workerQueue) {
			throw new Error('WorkerQueue not connected!');
		}
		const id = uuid();
		const job = {
			id,
			name,
			payload,
			retry: 0,
		};

		return this.workerQueue.add(job, Object.assign({ attempts: 3 }, options));
	}

	listen() {
		if (!this.workerQueue) {
			throw new Error('WorkerQueue not connected!');
		}
		this.workerQueue.process((job, done) => {
			this.handleMessage(job, done);
		});
		this.log.info(`WorkerQueue listen for jobs on: ${this.queueName}`);
	}

	clearHandler() {
		this.cachedHandlers = {};
		this.handlers = {};
	}

	resolveHandler(jobName) {
		if (this.cachedHandlers[jobName]) {
			// log.info('Return cached handler for: ' + jobName);
			return this.cachedHandlers[jobName];
		}

		this.log.info(`Resolve handler for job: ${jobName}`);
		const parts = jobName.split(':');
		let curr = this.handlers;
		let handler;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i !== (parts.length - 1)) {
				curr = curr[part];
				if (!curr) {
					break;
				}
			} else if (curr[part]) {
				handler = curr[part];
			} else if (curr['*']) {
				handler = curr['*'];
			}
		}
		if (!handler && this.handlers['*']) handler = this.handlers['*'];

		if (handler) {
			this.log.info('Caching handler...');
			this.cachedHandlers[jobName] = handler;
		}
		return handler;
	}

	handleMessage(job) {
		const handler = this.resolveHandler(job.data.name);

		if (!handler) {
			this.log.info(`Unhandled job type: "${job.data.name}" id: "${job.data.id}"`);
			return true;
		}
		return handler.process(job);
	}

	inject(name, payload) {
		const id = uuid();
		const job = {
			data: {
				id,
				name,
				payload,
				retry: 0,
			},
		};

		return this.handleMessage(job);
	}

	registerHandlers(handlers) {
		handlers.forEach((handler) => {
			this.registerHandler(handler);
		}, this);
	}

	registerHandler(handler) {
		this.log.info(`Register job handler for pattern: "${handler.pattern}" disabled: "${!!handler.disabled}"`);
		if (handler.disabled) {
			return;
		}

		handler.applicationName = this.options.applicationName; // eslint-disable-line no-param-reassign
		handler.queueName = this.options.queueName; // eslint-disable-line no-param-reassign
		let curr = this.handlers;
		const parts = handler.pattern.split(':');
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i !== (parts.length - 1)) {
				if (!curr[part]) {
					curr[part] = {};
				} else if (curr[part].pattern) {
					throw new Error(`Invalid handler pattern: "${handler.pattern}" namespace already taken: "${JSON.stringify(this.handlers, null, 2)}"`);
				}
				curr = curr[part];
			} else {
				if (curr[part]) {
					throw new Error(`Invalid handler pattern: "${handler.pattern}" namespace already taken: "${JSON.stringify(this.handlers, null, 2)}"`);
				}
				curr[part] = handler;
			}
		}
	}

	setHandlers(handler) {
		this.handlers = handler;
	}

	close() {
		this.log.info(`Shutdown WorkerQueue "${this.queueName}" ...`);
		if (!this.workerQueue) {
			return false;
		}

		return this.workerQueue.close();
	}
}

module.exports = WorkerQueue;
