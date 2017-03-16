'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const AtrixPubsub = require('./AtrixPubsub');
const fakeLogger = require('./fake-logger');
const avro = require('avsc');


describe.only('AtrixPubsub Handler - AVRO specs', () => {
	it('throws error and does not publish when validation fails', async () => {
		const pubsub = new AtrixPubsub({}, {
			log: fakeLogger,
			name: 'service',
			topic: 'service.svc/test/_id_/put.ok',
			type: avro.parse({
				type: 'record',
				fields: [{ name: 'test', type: 'string' }, { name: 'shouldFail', type: 'boolean' }],
			}),
		});
		await pubsub.start();
		let exception;
		try {
			await pubsub.publishHttpReply({
				route: { path: 'test/{id}' },
				method: 'put' }, { test: 'a little test', shouldFail: 'YES' }, 200);
		} catch (e) {
			exception = e;
		}
		expect(exception).to.exist;
		expect(exception.name).to.equal('ValidationError');
	});
});
