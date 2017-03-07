'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const AtrixPubsub = require('./AtrixPubsub');
const path = require('path');
const fakeLogger = require('./fake-logger');
const bb = require('bluebird');
const avro = require('avsc');

const WAIT_EVENT_DELAY = 100;

describe('AtrixPubsub', () => {
	it('throws Exception whe handlerDir does not eixts', () => {
		expect(() => new AtrixPubsub({}, { log: fakeLogger }, {
			handlerDir: 'asdasgv',
		})).to.throw(/Invalid handlerDir/);
	});

	describe('staring', () => {
		let pubsub;
		const service = {
			log: fakeLogger,
		};
		beforeEach(async () => {
			pubsub = new AtrixPubsub({}, service, {
				redis: {
					host: process.env.TEST_REDIS || 'localhost',
					port: 6379,
				},
				broker: 'redis',
				handlerDir: path.join(__dirname, '../specs/handlers'),
			});
		});

		it('connection exposes publish function', async () => {
			const conn = await pubsub.start();
			expect(conn.publish).to.be.a('function');
		});

		it('publish returns a Promise', async () => {
			const conn = await pubsub.start();
			const promise = conn.publish('topic', 'a');
			expect(promise.then).to.be.a('function');
		});

		it('can publish message', async () => {
			const conn = await pubsub.start();
			await conn.publish('topic', { asdfsa: 'asdf' });
		});

		it('can subscribe for topic', async () => {
			const conn = await pubsub.start();
			let topic;
			let data;
			await conn.subscribe('topic2', (...args) => {
				[topic, data] = args;
			});
			await conn.publish('topic2', { asdfsa: 'asdf' });

			await bb.delay(WAIT_EVENT_DELAY);
			expect(topic).to.equal('topic2');
			expect(data).to.eql({ asdfsa: 'asdf' });
		});

		it('registers handler in handlerDir', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/event', {
				prop: 'Val',
			});
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test^event'); // eslint-disable-line
			expect(h.executed).to.be.true;
		});

		it('handler in subdirs are registred', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/event2', {
				prop: 'Val',
			});
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test/event2'); // eslint-disable-line
			expect(h.executed).to.be.true;
		});

		it('handles wildcard in topicname', async () => {
			const conn = await pubsub.start();
			await conn.publish('event/created', {
				prop: 'Val',
			});
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/event^*'); // eslint-disable-line
			expect(h.executed).to.be.true;
		});

		it('it setsup job validation if defined by handler exports', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/validated', {});
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test/validated'); // eslint-disable-line
			expect(h.executed).to.be.false;
		});

		it('passes a pseudo req object to the handler', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/event', { prop: 'val' });
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test^event'); // eslint-disable-line
			expect(h.req.path).to.equal('test/event');
			expect(h.req.payload).to.eql({
				prop: 'val',
			});
			expect(h.req.log).to.be.an('object');
		});

		it('passes a pseudo reply function object to the handler', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/event', { prop: 'val' });
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test^event'); // eslint-disable-line
			expect(h.reply).to.be.a('function');
		});

		it('passes a the service to the handler', async () => {
			const conn = await pubsub.start();
			await conn.publish('test/event', { prop: 'val' });
			await bb.delay(WAIT_EVENT_DELAY);
			const h = require('../specs/handlers/test^event'); // eslint-disable-line
			expect(h.service).to.equal(service);
		});

		it('can setup without handler dir', async () => {
			const w = new AtrixPubsub({}, {
				log: fakeLogger,
			}, {
			});
			await w.start();
		});

		it('can publishHttpReply', async () => {
			const w = new AtrixPubsub({}, {
				log: fakeLogger,
				name: 'service',
			}, {});
			const conn = await w.start();
			let topic;
			let data;
			conn.subscribe('service.svc/test/_id_/post.created', (...args) => {
				[topic, data] = args;
			});
			await w.publishHttpReply({ route: { path: '/test/{id}' }, method: 'post' }, { reuslt: 'value' }, 201);
			await bb.delay(WAIT_EVENT_DELAY);
			expect(topic).to.eql('service.svc/test/_id_/post.created');
			expect(data).to.eql({ reuslt: 'value' });
		});

		describe('with an AVRO type defined', async () => {
			it('publishHttpReply: throws error and does not publish when validation failes', async () => {
				const w = new AtrixPubsub({}, {
					log: fakeLogger,
					name: 'service',
				}, {
					topicTypes: [{
						topic: 'service.svc/test/_id_/put.ok',
						type: avro.parse({
							type: 'record',
							fields: [{ name: 'result', type: 'long' }, { name: 'other', type: 'string' }],
						}),
					}],
				});
				await w.start();
				let ex;
				try {
					await w.publishHttpReply({ route: { path: '/test/{id}' }, method: 'put' }, { reuslt: 'value', other: 42 }, 200);
				} catch (e) {
					ex = e;
				}
				expect(ex).to.exist;
				expect(ex.name).to.equal('ValidationError');
			});

			it('publishHttpReply: publishes when validaton succeeds', async () => {
				const w = new AtrixPubsub({}, {
					log: fakeLogger,
					name: 'service',
				}, {
					topicTypes: [{
						topic: 'service.svc/test/_id_/put.ok',
						type: avro.parse({
							type: 'record',
							fields: [{ name: 'result', type: 'long' }, { name: 'other', type: 'string' }],
						}),
					}],
				});
				const conn = await w.start();
				let topic;
				let data;
				conn.subscribe('service.svc/test/_id_/put.ok', (...args) => {
					[topic, data] = args;
				});
				await w.publishHttpReply({ route: { path: '/test/{id}' }, method: 'put' }, { result: 42, other: 'cool' }, 200);
				expect(topic).to.eql('service.svc/test/_id_/put.ok');
				expect(data).to.eql({ result: 42, other: 'cool' });
			});
		});
	});
});
