'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.configure({ pluginMap: { pubsub: path.join(__dirname, '../') } });


const service = new atrix.Service('pubsub', {
	endpoints: {
		http: {
			handlerDir: path.join(__dirname, '../specs/http-handlers'),
		},
	},
	pubsub: {
		handlerDir: path.join(__dirname, '../specs/handlers'),
	},
});

atrix.addService(service);

service.endpoints.add('http');
