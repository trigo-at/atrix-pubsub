'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const {expect} = require('chai');
const path = require('path');
const bb = require('bluebird');
const avro = require('avsc');

const AtrixPubsub = require('./AtrixPubsub');
const fakeLogger = require('./fake-logger');

describe('AtrixPubsub Handler - AVRO specs', () => {
    let pubsub;
    let data;
    let log;
    let topic;
    beforeEach(async () => {
        topic = 'service.svc/test/event/_id_/put.ok';
        data = {
            path: '/test/event/{id}',
            payload: {test: 'a little test', shouldFail: false},
            params: {id: '42'},
        };
        log = new function() {
            this.message = '';
            this.debug = (time, args) => {
                this.message = (time && args) || time;
            };
            this.warn = args => {
                this.message = args;
            };
            this.error = args => {
                this.message = (args.name && args.message) || args.name;
            };
        }();
        pubsub = new AtrixPubsub(
            {},
            {
                log: fakeLogger,
                name: 'service',
                events: {on: () => {}},
            },
            {
                redis: {
                    host: process.env.TEST_REDIS || 'localhost',
                    port: 6379,
                },
                broker: 'redis',
                topicTypes: [
                    {
                        topic,
                        type: avro.parse({
                            type: 'record',
                            fields: [
                                {name: 'path', type: 'string'},
                                {
                                    name: 'params',
                                    type: {
                                        name: 'Params',
                                        type: 'record',
                                        fields: [{name: 'id', type: 'string'}],
                                    },
                                },
                                {
                                    name: 'payload',
                                    type: {
                                        name: 'Payload',
                                        type: 'record',
                                        fields: [{name: 'test', type: 'string'}, {name: 'shouldFail', type: 'boolean'}],
                                    },
                                },
                            ],
                        }),
                    },
                ],
                handlerDir: path.join(__dirname, '../specs/handlers'),
            }
        );
        await pubsub.start();
    });
    it('validation in handler should be ok', async () => {
        const handler = pubsub.handlers.find(h => h.pattern === 'service.svc/test/event/_id_/put.ok');
        handler.log = log;

        await handler.handler(topic, data, handler.opts);
        bb.delay(500);
        expect(handler.log.message.length).to.be.above(0);
        expect(handler.log.message.toString().includes(`Finished message: ${topic}`)).to.equal(true);
    });
    it('validation in handler should fail', async () => {
        const handler = pubsub.handlers.find(h => h.pattern === 'service.svc/test/event/_id_/put.ok');
        handler.log = log;
        data.payload.shouldFail = 'YES';

        await handler.handler(topic, data, handler.opts);
        bb.delay(500);
        expect(handler.log.message.length).to.be.above(0);
        expect(handler.log.message.toString().includes('AVRO Validation failed! paths: payload,shouldFail')).to.equal(
            true
        );
    });
});
