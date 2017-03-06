'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.configure({ pluginMap: { pubsub: path.join(__dirname, '../') } });

atrix.addService(new atrix.Service('pubsub', {
	pubsub: {
		handlerDir: path.join(__dirname, '../specs/handlers'),
	},
}));
