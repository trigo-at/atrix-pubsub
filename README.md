[![Greenkeeper badge](https://badges.greenkeeper.io/trigo-at/atrix-pubsub.svg?token=12b9856af729a71435d009990f1d05384c981f72e2990e2416f280f4fd5249fd)](https://greenkeeper.io/)
[![NSP Status](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf/badge)](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf)

# atrix-pubsub


** Redis based Pub/Sub integration into atrix microservice framework**

## Compatibility

`atrix-pubsub < 4.0.0` works with `atrix < 6.0.0`
`atrix-pubsub >= 4.0.0` works with `atrix >= 6.0.0`

## Features

* Connection setup
* filename based handler registrations

## Installation

```bash
# install atrix
npm install -S @trigo/atrix

# install pubsub plugin
npm install -S @trigo/atrix-pubsub

```

## Configuration

### handlers/my/fancy^*.js
```
const Joi = require('joi');

module.exports.descrioption = 'my fancy event handler'
module.exports.schema = joi.object({ ... });
module.exports.handler = async (req, reply, service) => {
	console.log(req)
	// {
	//	path: 'my/fancy/event',
	//	payload: { an: 'event', with: { foo: 'bar' } }
	// 	log: {<logger object>}
	// }

	// publish another message
	await service.publish('other/event', { ... });
}
```

### index.js
```javascript
'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.addService({
	// name of the service
	name: 'pubsub', 
	// plugin configuration
	pubsub: {
		// setup redis connection
		redis: {
			host: 'localhost',
			port: 6379,
		},
		// select which broker to use. allowed: 'redis', 'in-memory' (default)
		broker: 'redis',
		brokerWildcard: '*', // topic path wildcard. allowed : '*', '%' (default and advised)

		// directory containing the handler files
		handlerDir: path.join(__dirname, './handlers'),
	},
});

// start service
await atrix.services.pubsub.start();

// publish message
await atrix.services.pubsub.publish('my/fancy/topic', { an: 'event', with: { foo: 'bar' } });
```
