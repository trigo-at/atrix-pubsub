'use strict';

const retry = require('async-retry');

const info = async (client, log) => {
    log.info('Check for redis...');
    await client.ping();
    log.info('Redis up and running.');
};

const waitForRedis = async (client, log) => {
    log.info('Waiting for redis to becaome available...');
    return retry(
        async () => {
            await info(client, log);
            return true;
        },
        {
            retries: 5000,
        }
    );
};

module.exports = waitForRedis;
