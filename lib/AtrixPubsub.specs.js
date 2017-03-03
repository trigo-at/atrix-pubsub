'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const AtrixPubsub = require('./AtrixPubsub');
const path = require('path');
const fakeLogger = require('./fake-logger');


describe('AtrixPubsub', () => {
	it('throws Exception whe handlerDir does not eixts', () => {
		expect(() => new AtrixPubsub({}, { log: fakeLogger }, {
			// redis: {
				// host: process.env.TEST_REDIS || 'localhost',
				// port: 6379,
			// },
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
		it.only('message is written to broker', async () => {
			const conn = await pubsub.start();
			await conn.publish('topic', { asdfsa: 'asdf' });
		});


		// it('registers handler in handlerDir', async () => {
			// await pubsub.start();
			// await pubsub.pubsubQueue.inject('test:event', {
				// prop: 'Val',
			// });
			// const h = require('../specs/handlers/test-event'); // eslint-disable-line
			// expect(h.executed).to.be.true;
		// });

		// it('it setsup job validation if defined by handler exports', async () => {
			// await pubsub.start();
			// let exception;
			// try {
				// await pubsub.pubsubQueue.inject('test:validated', {});
			// } catch (e) {
				// exception = e;
			// }
			// expect(exception).to.exist;
			// expect(exception.name).to.equal('ValidationError');
			// const h = require('../specs/handlers/test-validated'); // eslint-disable-line
			// expect(h.executed).to.be.false;
		// });

		// it('passes a pseudo req object to the handler', async () => {
			// await pubsub.start();
			// await pubsub.pubsubQueue.inject('test:event', {
				// prop: 'Val',
			// });

			// const h = require('../specs/handlers/test-event'); // eslint-disable-line
			// expect(h.req.path).to.equal('test:event');
			// expect(h.req.payload).to.eql({
				// prop: 'Val',
			// });
			// expect(h.req.log).to.be.an('object');
		// });

		// it('passes a pseudo reply function object to the handler', async () => {
			// await pubsub.start();
			// await pubsub.pubsubQueue.inject('test:event', {
				// prop: 'Val',
			// });

			// const h = require('../specs/handlers/test-event'); // eslint-disable-line
			// expect(h.reply).to.be.a('function');
		// });

		// it('passes a the service to the handler', async () => {
			// await pubsub.start();
			// await pubsub.pubsubQueue.inject('test:event', {
				// prop: 'Val',
			// });

			// const h = require('../specs/handlers/test-event'); // eslint-disable-line
			// expect(h.service).to.equal(service);
		// });

		// it('can setup without handler dir', async () => {
			// const w = new AtrixPubsub({}, {
				// log: fakeLogger,
			// }, {
				// redis: {
					// host: process.env.TEST_REDIS || 'localhost',
					// port: 6379,
				// },
				// queueName: 'atrix-pubsub-test',
			// });
			// await w.start();
		// });
	});
});
