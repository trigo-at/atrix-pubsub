'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const path = require('path');
const AtrixPubsub = require('./AtrixPubsub');
const fakeLogger = require('./fake-logger');
const bb = require('bluebird');
const avro = require('avsc');


describe('AtrixPubsub Handler - AVRO specs', () => {
	it('handler.executed is false by default', () => {
		const h = require('../specs/handlers/service.svc/test/event/_id_^put.ok'); // eslint-disable-line
		expect(h.executed).to.be.false;
	});
	it('does execute handler when validation is ok', async () => {
		const pubsubConfig = new AtrixPubsub({}, {
			log: fakeLogger,
			name: 'service',
			redis: {
				host: process.env.TEST_REDIS || 'localhost',
				port: 6379,
			},
			broker: 'redis',
		}, {
			topicTypes: [{
				topic: 'service.svc/test/event/_id_/put.ok',
				type: avro.parse({
					type: 'record',
					fields: [
						{ name: 'path', type: 'string' },
						{ name: 'params',
							type: {
								name: 'Params',
								type: 'record',
								fields: [{ name: 'id', type: 'string' }],
							},
						},
						{ name: 'payload',
							type: {
								name: 'Payload',
								type: 'record',
								fields: [{ name: 'test', type: 'string' }, { name: 'shouldFail', type: 'boolean' }],
							},
						},
					],
				}),
			}],
			handlerDir: path.join(__dirname, '../specs/handlers'),
		});
		await pubsubConfig.start();
		const pubsubPublish = new AtrixPubsub({}, {
			log: fakeLogger,
			name: 'service',
			redis: {
				host: process.env.TEST_REDIS || 'localhost',
				port: 6379,
			},
			broker: 'redis',
		}, {
			handlerDir: path.join(__dirname, '../specs/handlers'),
		});
		await pubsubPublish.start();
		const h = require('../specs/handlers/service.svc/test/event/_id_^put.ok'); // eslint-disable-line
		h.executed = false;
		try {
			await pubsubPublish.publishHttpReply({
				route: { path: '/test/event/{id}' },
				params: { id: '42' },
				method: 'put' }, { test: 'a little test', shouldFail: 'YES' }, 200);
		} catch (e) {
			console.log(e);
		}
		await bb.delay(300);
		expect(h.executed).to.be.true;
	});
	it('does not execute handler when validation fails', async () => {
		const pubsubConfig = new AtrixPubsub({}, {
			log: fakeLogger,
			name: 'service',
			redis: {
				host: process.env.TEST_REDIS || 'localhost',
				port: 6379,
			},
			broker: 'redis',
		}, {
			topicTypes: [{
				topic: 'service.svc/test/event/_id_/put.ok',
				type: avro.parse({
					type: 'record',
					fields: [
						{ name: 'path', type: 'string' },
						{ name: 'params',
							type: {
								name: 'Params',
								type: 'record',
								fields: [{ name: 'id', type: 'string' }],
							},
						},
						{ name: 'payload',
							type: {
								name: 'Payload',
								type: 'record',
								fields: [{ name: 'test', type: 'string' }, { name: 'shouldFail', type: 'boolean' }],
							},
						},
					],
				}),
			}],
			handlerDir: path.join(__dirname, '../specs/handlers'),
		});
		await pubsubConfig.start();
		const pubsubPublish = new AtrixPubsub({}, {
			log: fakeLogger,
			name: 'service',
			redis: {
				host: process.env.TEST_REDIS || 'localhost',
				port: 6379,
			},
			broker: 'redis',
		}, {
			handlerDir: path.join(__dirname, '../specs/handlers'),
		});
		await pubsubPublish.start();
		let exception;
		const h = require('../specs/handlers/service.svc/test/event/_id_^put.ok'); // eslint-disable-line
		h.executed = false;
		try {
			await pubsubPublish.publishHttpReply({
				route: { path: '/test/event/{id}' },
				params: { id: '42' },
				method: 'put' }, { test: 'a little test', shouldFail: 'YES' }, 200);
		} catch (e) {
			console.log(e);
		}
		await bb.delay(300);
		expect(h.executed).to.be.false;
	});
});
