const pkg = require('../package.json');

const AtrixWorker = require('./AtrixWorker');
const WorkerQueue = require('./WorkerQueue');

module.exports = {
	name: pkg.name,
	version: pkg.version,
	register: () => {},
	factory: (atrix, service, config) => new AtrixWorker(atrix, service, config),
	WorkerQueue,
};
