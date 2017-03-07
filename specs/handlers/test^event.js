'use strict';

const bb = require('bluebird');

module.exports.executed = false;
module.exports.description = 'test handler';

module.exports.handler = async (req, reply, service) => {
	await bb.delay(30);
	module.exports.reply = reply;
	module.exports.service = service;
	module.exports.req = req;
	module.exports.executed = true;
};

