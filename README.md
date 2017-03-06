[![NSP Status](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf/badge)](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf)

# atrix-pubsub

**Acoltatori based Pub/Sub intigraition into atrix microservice framework**

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

### handlers/my/facncy^*.js
```
const Joi = require('joi');

module.exports.descrioption = 'my fancy event handler'
module.exports.schema = joi.object({ ... });
module.exports.handler = (req, reply, server) => {
	console.log(req) 
	// { 
	//	path: 'my/fanzy/event', 
	//	payload: { an: 'event', with: { da: 'ta' } }
	// 	log: {<logger object>} 
	// }
}
```

### index.js
```javascript
'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.addService(new atrix.Service('pubsub', {
	// plugin configuration
	pubsub: {
		// setup redis connection
		redis: {
			host: 'localhost',
			port: 6379,
		},
		// select which broker to use. allowed: 'redis', 'in-memory' (default)
		broker: 'redis'
		
		// directory containing the handler files
		handlerDir: path.join(__dirname, './handlers'),
	},
}));

// start service
await atrix.services.pubsub.start();

// publish message
await atrix.services.pubsub.publish('my/fancy/topic', { an: 'event', with: { da: 'ta' } });
```
