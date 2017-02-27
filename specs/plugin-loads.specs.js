'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
require('./service');
const atrix = require('@trigo/atrix');

describe('loads datasources into service', () => {
	it('dataSources is populated with configs', async () => {
		expect(atrix.services.worker.dataSources.m1).to.be.an('object');
	});
});

