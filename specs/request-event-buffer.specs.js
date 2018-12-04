'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0, one-var: 0, one-var-declaration-per-line: 0 */

const atrix = require('@trigo/atrix');
const path = require('path');
const supertest = require('supertest');
const {expect} = require('chai');
const bb = require('bluebird');
const Boom = require('boom');

const eventBuffer = require('../lib/event-buffer');

describe('request event buffrer', () => {
    let svc, test;
    beforeEach(async () => {
        atrix.addService({
            name: 'buffered',
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

        svc = atrix.services.buffered;

        svc.handlers.add('PATCH', '/patch', async (req, reply) => {
            reply.withEvent({foo: 'bar', resId: req.payload.resId});
        });
        svc.handlers.add('POST', '/post', async (req, reply, service) => {
            await service.request({method: 'patch', url: '/patch', payload: {resId: '42'}}, req);
            await service.request({method: 'patch', url: '/patch', payload: {resId: '42'}}, req);
            await service.request({method: 'patch', url: '/patch', payload: {resId: '43'}}, req);

            reply.withEvent({foo: 'bar'});
        });
        svc.handlers.add('POST', '/post-with-error', async (req, reply, service) => {
            await service.request({method: 'patch', url: '/patch', payload: {resId: '42'}}, req);
            await service.request({method: 'patch', url: '/patch', payload: {resId: '42'}}, req);
            await service.request({method: 'patch', url: '/patch', payload: {resId: '43'}}, req);

            throw Boom.internal();
        });

        await svc.start();
        test = supertest(`http://localhost:${svc.endpoints.endpoints[0].instance.server.connections[0].info.port}`);
        const aliveRes = await test.get('/alive');
        expect(aliveRes.statusCode).to.equal(200);
    });

    afterEach(async () => {
        await svc.stop();
    });

    it('sends events', async () => {
        const events = [];
        await svc.subscribe('buffered.svc/%', (...args) => {
            const [topic, data] = args;
            events.push({topic, data});
        });
        await test.post('/post');
        await bb.delay(20);
        expect(events.find(e => e.topic === 'buffered.svc/patch/patch.ok')).to.exist;
        expect(events.find(e => e.topic === 'buffered.svc/post/post.ok')).to.exist;
    });

    it('aggregates events of same topic with same payload.resId', async () => {
        const events = [];
        await svc.subscribe('buffered.svc/%', (...args) => {
            const [topic, data] = args;
            events.push({topic, data});
        });
        await test.post('/post');
        await bb.delay(20);
        expect(events.find(e => e.topic === 'buffered.svc/post/post.ok')).to.exist;
        expect(
            events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '42').length
        ).to.eql(1);
        expect(
            events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '43').length
        ).to.eql(1);
    });

    it('deletes REQ_CACHE afgter fireing events', async () => {
        await test.post('/post');
        await bb.delay(20);
        expect(eventBuffer.REQ_CACHE).to.eql({});
    });

    it('also sends events when errors are thrown', async () => {
        const events = [];
        await svc.subscribe('buffered.svc/%', (...args) => {
            const [topic, data] = args;
            events.push({topic, data});
        });
        const res = await test.post('/post-with-error');
        expect(res.statusCode).to.eql(500);
        await bb.delay(20);
        expect(
            events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '42').length
        ).to.eql(1);
        expect(
            events.filter(e => e.topic === 'buffered.svc/patch/patch.ok' && e.data.payload.resId === '43').length
        ).to.eql(1);
    });
});
