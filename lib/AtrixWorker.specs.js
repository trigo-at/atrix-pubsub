'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const AtrixWorker = require('./AtrixWorker');
const path = require('path');
const fakeLogger = require('./fake-logger');



describe('AtrixWorker', () => {
	it('throws Exception whe handlerDir does not eixts', () => {
		expect(() => new AtrixWorker({}, { log: fakeLogger }, {
			redis: {
				host: process.env.TEST_REDIS || 'localhost',
				port: 6379,
			},
			queueName: 'atrix-worker-test',
			handlerDir: 'asdasgv',
		})).to.throw(/Invalid handlerDir/);
	});

	describe('staring', () => {
		let worker;
		const service = {
			log: fakeLogger,
		};
		beforeEach(async () => {
			worker = new AtrixWorker({}, service, {
				redis: {
					host: process.env.TEST_REDIS || 'localhost',
					port: 6379,
				},
				queueName: 'atrix-worker-test',
				handlerDir: path.join(__dirname, '../specs/handlers'),
			});
		});

		it('registers handler in handlerDir', async () => {
			await worker.start();
			await worker.workerQueue.inject('test:event', {
				prop: 'Val',
			});
			const h = require('../specs/handlers/test-event'); // eslint-disable-line
			expect(h.executed).to.be.true;
		});

		it('it setsup job validation if defined by handler exports', async () => {
			await worker.start();
			let exception;
			try {
				await worker.workerQueue.inject('test:validated', {});
			} catch (e) {
				exception = e;
			}
			expect(exception).to.exist;
			expect(exception.name).to.equal('ValidationError');
			const h = require('../specs/handlers/test-validated'); // eslint-disable-line
			expect(h.executed).to.be.false;
		});

		it('passes a pseudo req object to the handler', async () => {
			await worker.start();
			await worker.workerQueue.inject('test:event', {
				prop: 'Val',
			});

			const h = require('../specs/handlers/test-event'); // eslint-disable-line
			expect(h.req.path).to.equal('test:event');
			expect(h.req.payload).to.eql({
				prop: 'Val',
			});
			expect(h.req.log).to.be.an('object');
		});

		it('passes a pseudo reply function object to the handler', async () => {
			await worker.start();
			await worker.workerQueue.inject('test:event', {
				prop: 'Val',
			});

			const h = require('../specs/handlers/test-event'); // eslint-disable-line
			expect(h.reply).to.be.a('function');
		});

		it('passes a the service to the handler', async () => {
			await worker.start();
			await worker.workerQueue.inject('test:event', {
				prop: 'Val',
			});

			const h = require('../specs/handlers/test-event'); // eslint-disable-line
			expect(h.service).to.equal(service);
		});

		it('can setup without handler dir', async () => {
			const w = new AtrixWorker({}, {
				log: fakeLogger,
			}, {
				redis: {
					host: process.env.TEST_REDIS || 'localhost',
					port: 6379,
				},
				queueName: 'atrix-worker-test',
			});
			await w.start();
		});
	});
});
