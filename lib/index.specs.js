'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const {expect} = require('chai');
const index = require('./index');
const pkg = require('../package.json');

describe('index.js', () => {
    it('exposes "name"', () => {
        expect(index.name).to.eql('@trigo/atrix-pubsub');
    });

    it('exposes "version"', () => {
        expect(index.version).to.eql(pkg.version);
    });

    it('exposes "register"', () => {
        expect(index.register).to.be.a('function');
    });

    it('exposes compatibility definition', () => {
        expect(index.compatibility).to.eql({
            atrix: {min: '6.0.0-17'},
        });
    });
});
