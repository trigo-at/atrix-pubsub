'use strict';

module.exports.executed = false;
module.exports.description = 'test validated';
module.exports.handler = async () => {
    module.exports.executed = true;
};
