'use strict';


const bb = require('bluebird');

module.exports.executed = false;
module.exports.description = 'test handler';
module.exports.handler = async (job) => {
	await bb.delay(300);
	module.exports.lastJob = job;
	module.exports.executed = true;
};

