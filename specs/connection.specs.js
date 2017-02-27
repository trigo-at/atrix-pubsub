'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const Redis = require('ioredis');
const WorkerQueue = require('../lib/WorkerQueue');

require('./service');
const atrix = require('@trigo/atrix');

describe('loads datasources into service', () => {
	beforeEach(async () => {
		try {
			await atrix.services.worker.start();
		} catch (e) {
			console.error(e); // eslint-disable-line
			throw e;
		}
	});

	it('connects all and expose as service.dataConnections', async () => {
		expect(atrix.services.worker.dataConnections.m1).to.be.an('object');
	});

	it('exposes initialized redis client as "redis"', () => {
		const redis = atrix.services.worker.dataConnections.m1.redis;
		expect(redis).to.be.instanceof(Redis);
	});

	it('exposes initialized WorkerQueue instance as "workerQueue"', () => {
		const wq = atrix.services.worker.dataConnections.m1.workerQueue;
		expect(wq).to.be.instanceof(WorkerQueue);
	});
});
