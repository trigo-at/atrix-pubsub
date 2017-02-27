[![NSP Status](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf/badge)](https://nodesecurity.io/orgs/trigo-gmbh/projects/da4bbc29-c02c-4cbb-a25f-33ba471797cf)

# atrix-worker

**Redis/bull based job queue and handler intigraition into atrix microservice framework**

## Features

* Connection setup
* filename based handler registrations

## Installation

```bash
# install atrix
npm install -S @trigo/atrix

# install worker plugin
npm install -S @trigo/atrix-worker

```

## Configuration

### index.js
```javascript
'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

atrix.addService(new atrix.Service('worker', {
	// datasource configuration
	dataSource: {
		m1: {
		  // set tyoe to 'worker' to use plugin fot the connection
			type: 'worker',
			config: {
			  // redis configuration
				redis: {
					host: 'localhost',
					port: 6379,
				},
				// name of the queue to use to queue the jobs
				queueName: 'atrix-worker-test',
				
				// directory containing the handler files
				handlerDir: path.join(__dirname, './handlers'),
			},
		},
	},
}));

```
