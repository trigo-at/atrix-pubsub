[![Greenkeeper badge](https://badges.greenkeeper.io/trigo-at/atrix-elasticsearch.svg?token=9a1e9450aab3759996e06b1b9479814c2a7655e744657200467c6b91f0201c8b)](https://greenkeeper.io/)
[![NSP Status](https://nodesecurity.io/orgs/trigo-gmbh/projects/1b900982-8273-4d45-a9ef-d6414b1bf3c4/badge)](https://nodesecurity.io/orgs/trigo-gmbh/projects/1b900982-8273-4d45-a9ef-d6414b1bf3c4)

# atrix-elasticsearch

**Elasticsearch plugin for the atrix miscroservice framework**

## Features

* Connection setup
* connect to multiple nodes

## Installation

```bash
# install atrix
npm install -S @trigo/atrix

# install elasticsearch plugin
npm install -S @trigo/atrix-elasticsearch

# No need to install elasticsearch itself!
```
## Configuraton & Usage

### handlers/GET.js
```javascript
module.exports = async (req, reply, service) => {
    // access elasticseracg for connection "m1"
    const cient = service.dataConnections.m1.client;
		
		// fetch info from cluster complete 
		// client API docs: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html
		const info = await client.info(); 
		
		// send to callee
		reply(info);
}
		
```


### index.js
```javascript
'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');

const svc = new atrix.Service('mongoose', {
    endpoints: {
        http: {
            // declare port to bind
      port: 3007,

      // the directory containing the handler files
      handlerDir: `${__dirname}/handlers`,
    },
  },
    // declare a dataSource config section
    dataSource: {
        // name of the data source
        m1: {
            // type of data connection
            type: 'elasticsearch',
            // connection configuration
            config: 
                // database connection string, sommaseperated to connnect several nodes
                connectionString: 'http://es-01:9200,http://es-02:9200, 
            },
        },
        m2: {
            type: 'mongoose',
            config: {
                modelFactory: path.join(__dirname, './models/factory'),
                connectionString: 'localhost:27017/test-atrix-mongoose-m2',
            },
        },
    },
});

// register service in atrix
atrix.addService(svc);

// setup http endpoint
svc.endpoints.add('http');

// start service. 
// This will wait for the elasticsearch connection to be available waits for cluster state 'yellow' before starting up. 
svc.start();
```
