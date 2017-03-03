[![NSP Status](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf/badge)](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf)

# atrix-pubsub

**Redis/bull based job queue and handler intigraition into atrix microservice framework**

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

### index.js
```javascript
'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.addService(new atrix.Service('pubsub', {
	// datasource configuration
	dataSource: {
		m1: {
		  // set tyoe to 'pubsub' to use plugin fot the connection
			type: 'pubsub',
			config: {
			  // redis configuration
				redis: {
					host: 'localhost',
					port: 6379,
				},
				// name of the queue to use to queue the jobs
				queueName: 'atrix-pubsub-test',
				
				// directory containing the handler files
				handlerDir: path.join(__dirname, './handlers'),
			},
		},
	},
}));

```
