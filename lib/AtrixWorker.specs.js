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
				host: 'localhost',
				port: 6379,
			},
			queueName: 'atrix-worker-test',
			handlerDir: 'asdasgv',
		})).to.throw(/Invalid handlerDir/);
	});

	describe('staring', () => {
		let worker;
		beforeEach(async () => {
			worker = new AtrixWorker({}, {
				log: fakeLogger,
			}, {
				redis: {
					host: 'localhost',
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
	});
});
