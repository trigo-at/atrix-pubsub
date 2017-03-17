'use strict';

module.exports.executed = false;
module.exports.description = 'test validated';
module.exports.handler = async () => {
	console.log('-----IMMA GONNA EXECUTE!!');
	module.exports.executed = true;
};
