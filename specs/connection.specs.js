'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const Redis = require('ioredis');
require('./service');
const atrix = require('@trigo/atrix');

describe('loads datasources into service', () => {
	beforeEach(async () => {
		try {
			await atrix.services.pubsub.start();
		} catch (e) {
			console.error(e); // eslint-disable-line
			throw e;
		}
	});

});
