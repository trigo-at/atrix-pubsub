'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const WorkerQueue = require('./WorkerQueue');
const { expect } = require('chai');
const fakeLogger = require('./fake-logger');

function newWorkerQueue() {
	return new WorkerQueue({
		redis: {
			host: process.env.TEST_REDIS || 'localhost',
			port: 6379,
		},
		queueName: 'atrix-worker-test',
	}, fakeLogger);
}

describe('Worker Queue', function() {
	it('registers & resolves handlers correctly', function() {
		const wq = newWorkerQueue();
		wq.clearHandler();

		const userEventAll = {
			pattern: 'user:event:*',
		};
		wq.registerHandler(userEventAll);
		const all = {
			pattern: '*',
		};
		wq.registerHandler(all);

		const log = {
			pattern: 'log',
		};
		wq.registerHandler(log);

		const userAll = {
			pattern: 'user:*',
		};
		wq.registerHandler(userAll);

		const userCreated = {
			pattern: 'user:created',
		};
		wq.registerHandler(userCreated);

		const userEventLogin = {
			pattern: 'user:event:login',
		};
		wq.registerHandler(userEventLogin);

		const userEventLogout = {
			pattern: 'user:event:logout',
		};
		wq.registerHandler(userEventLogout);

		expect(wq.resolveHandler(all.pattern)).to.equal(all);
		expect(wq.resolveHandler(log.pattern)).to.equal(log);
		expect(wq.resolveHandler(userAll.pattern)).to.equal(userAll);
		expect(wq.resolveHandler(userCreated.pattern)).to.equal(userCreated);
		expect(wq.resolveHandler(userEventAll.pattern)).to.equal(userEventAll);
		expect(wq.resolveHandler(userEventLogin.pattern)).to.equal(userEventLogin);
		expect(wq.resolveHandler(userEventLogout.pattern)).to.equal(userEventLogout);
	});

	it('does not allow to register invalid handler paths', function() {
		const wq = newWorkerQueue();
		wq.clearHandler();
		const userEvent = {
			pattern: 'user:event',
		};

		const userEventLogout = {
			pattern: 'user:event:logout',
		};
		expect(() => {
			wq.registerHandler(userEventLogout);
			wq.registerHandler(userEvent);
		}).to.throw();

		wq.clearHandler();
		expect(() => {
			wq.registerHandler(userEvent);
			wq.registerHandler(userEventLogout);
		}).to.throw();
	});

	it('should call a handler', (done) => {
		const wq = newWorkerQueue();
		wq.clearHandler();

		const userEventAll = {
			pattern: 'user:event:*',
			process: () => done(),
		};

		wq.registerHandler(userEventAll);

		wq.inject('user:event:blah', {});
	});

	it('should call a root * handler', (done) => {
		const wq = newWorkerQueue();
		wq.clearHandler();

		const userEventAll = {
			pattern: '*',
			process: () => done(),
		};

		wq.registerHandler(userEventAll);

		wq.inject('user:event:blah', {});
	});
});
