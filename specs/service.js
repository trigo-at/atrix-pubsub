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

// const buffered = new atrix.Service('buffered', {
	// endpoints: {
		// http: {
			// handlerDir: path.join(__dirname, '../specs/http-handlers'),
		// },
	// },
	// pubsub: {
		// handlerDir: path.join(__dirname, '../specs/handlers'),
	// },
// });

atrix.addService(service);
// atrix.addService(buffered);
service.endpoints.add('http');
