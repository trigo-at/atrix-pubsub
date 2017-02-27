'use strict';

/* eslint-env node, mocha */
/* eslint prefer-arrow-callback: 0, func-names: 0, space-before-function-paren: 0, no-unused-expressions: 0 */

const { expect } = require('chai');
const Handler = require('./Handler');

describe('Handler', function() {
	let handler;
	beforeEach(function() {
		handler = new Handler();
	});

	it('calls the handlerFunc correctly', async () => {
		handler.pattern = 'the:pattern:to:handle';
		const data = {
			name: 'the:pattern:to:handle',
			payload: {
				key: 'val',
				as: 'asdas',
			},
		};

		handler.setHandlerFunc(function() {
			expect(this.pattern).to.equal('the:pattern:to:handle');
		});

		await handler.process({
			data,
		});
	});

	it('throw expetion with invalid job data', async () => {
		handler.setHandlerFunc(() => { });

		let ex = false;
		try {
			await handler.process({});
		} catch (e) {
			ex = true;
		}
		expect(ex).to.be.true;

		ex = false;
		try {
			await handler.process({
				data: {
					paytload: {},
				},
			});
		} catch (e) {
			ex = true;
		}
		expect(ex).to.be.true;

		await handler.process({
			data: {
				id: 'afasfasfa',
				retry: 0,
				name: 'asdsad',
			},
		});
	});
});
