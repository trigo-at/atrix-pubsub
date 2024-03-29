const pkg = require('../package.json');

const AtrixPubsub = require('./AtrixPubsub');

module.exports = {
    name: pkg.name,
    version: pkg.version,
    register: () => {},
    factory: (atrix, service, config) => new AtrixPubsub(atrix, service, config),
    compatibility: {
        atrix: {
            min: '6.0.0-17',
        },
    },
};
