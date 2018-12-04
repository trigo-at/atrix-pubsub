'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

require('./service');
const atrix = require('@trigo/atrix');
const {expect} = require('chai');

describe('loads datasources into service', () => {
    beforeEach(async () => {
        try {
            await atrix.services.pubsub.start();
        } catch (e) {
            console.error(e); // eslint-disable-line
            throw e;
        }
    });

    it('attatches the publish method on the service object', () => {
        expect(atrix.services.pubsub.publish).to.be.a('function');
    });

    it('attatches the subscribe method on the service object', () => {
        expect(atrix.services.pubsub.subscribe).to.be.a('function');
    });

    it('recives subscribed messages', async () => {
        const s = atrix.services.pubsub;
        let topic;
        let msg;

        await s.subscribe('test', (...args) => {
            [topic, msg] = args;
        });
        await s.publish('test', {test: 'obj'});
        expect(topic).to.equal('test');
        expect(msg).to.eql({test: 'obj'});
    });
});
