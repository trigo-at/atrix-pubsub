'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.configure({ pluginMap: { worker: path.join(__dirname, '../') } });

atrix.addService(new atrix.Service('worker', {
	dataSource: {
		m1: {
			type: 'worker',
			config: {
				redis: {
					host: 'localhost',
					port: 6379,
				},
				queueName: 'atrix-worker-test',
				handlerDir: path.join(__dirname, '../specs/handlers'),
			},
		},
	},
}));
