'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0, one-var: 0, one-var-declaration-per-line: 0 */

const atrix = require('@trigo/atrix');
const path = require('path');
const supertest = require('supertest');
const { expect } = require('chai');
const bb = require('bluebird');

describe('request event buffrer', () => {
	let svc, test;
	beforeEach(async () => {
		const buffered = new atrix.Service('buffered', {
			endpoints: {
				http: {
					// handlerDir: path.join(__dirname, '../specs/http-handlers'),
				},
			},
			pubsub: {
				handlerDir: path.join(__dirname, '../specs/handlers'),
				requestEventBuffer: {
					enabled: true,
				},
			},
		});

		buffered.endpoints.add('http');
		atrix.addService(buffered);

		svc = atrix.services.buffered;

		svc.handlers.add('PATCH', '/patch', async (req, reply, service) => {
			reply.withEvent({ foo: 'bar', resId: req.payload.resId });
		});
		svc.handlers.add('POST', '/post', async (req, reply, service) => {
			await service.request({ method: 'patch', url: '/patch', payload: { resId: '42' } }, req);
			await service.request({ method: 'patch', url: '/patch', payload: { resId: '42' } }, req);
			await service.request({ method: 'patch', url: '/patch', payload: { resId: '43' } }, req);

			reply.withEvent({ foo: 'bar' });
		});

		await svc.start();
		console.log(svc.endpoints.endpoints[0].instance.server.connections[0].info.port);
		test = supertest(`http://localhost:${svc.endpoints.endpoints[0].instance.server.connections[0].info.port}`);
		const aliveRes = await test.get('/alive');
		expect(aliveRes.statusCode).to.equal(200);
	});


	afterEach(async () => {
		await svc.stop();
	});

	it.only('sends events', async () => {
		const events = [];
		await svc.subscribe('buffered.svc/%', (...args) => {
			const [topic, data] = args;
			console.log(topic, data);
			events.push({ topic, data });
		});
		const res = await test.post('/post');
		await bb.delay(20);
		expect(events.find(e => e.topic === 'buffered.svc/patch/patch.ok')).to.exist;
		expect(events.find(e => e.topic === 'buffered.svc/post/post.ok')).to.exist;
	});

	it.only('aggregates events of same topic with same payload.resId', async () => {
		const events = [];
		await svc.subscribe('buffered.svc/%', (...args) => {
			const [topic, data] = args;
			console.log(topic, data);
			events.push({ topic, data });
		});
		const res = await test.post('/post');
		await bb.delay(20);
		expect(events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '42').length).to.eql(1);
		expect(events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '43').length).to.eql(1);
	});
	// it('t2', () => {});
});
