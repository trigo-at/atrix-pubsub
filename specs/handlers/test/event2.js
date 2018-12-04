'use strict';

const Joi = require('joi');

module.exports.executed = false;
module.exports.description = 'test validated';
module.exports.schema = Joi.object({prop: Joi.string().required()});
module.exports.handler = async () => {
    module.exports.executed = true;
};
