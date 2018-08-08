'use strict';


/* eslint no-param-reassign: 0 */

const REQ_CACHE = {};

const getKey = req => req.headers['x-atrix-context-req-id'];

const deleteReqCache = (req) => {
	delete REQ_CACHE[getKey(req)];
};

const getCache = (key) => {
	if (!REQ_CACHE[key]) {
		REQ_CACHE[key] = {
			EVENT_INDEX: 0,
		};
	}
	return REQ_CACHE[key];
};

const getTopicCache = (topic, reqCache) => {
	if (!reqCache[topic]) {
		reqCache[topic] = {};
	}

	return reqCache[topic];
};


const queueEvent = (req, topic, evtData, pubSub) => {
	const resId = pubSub.config.requestEventBuffer.resIdAccessor(evtData);
	if (!resId) return false;

	const reqCache = getCache(getKey(req));
	const index = reqCache.EVENT_INDEX++;
	const topicCache = getTopicCache(topic, getCache(getKey(req)));

	topicCache[resId] = { index, topic, evtData };
	return true;
};

const publishEvents = async (req, pubSub) => {
	if (getKey(req) !== req.id) return;
	// console.log(JSON.stringify(REQ_CACHE, null, 2));
	const reqCache = getCache(getKey(req));
	// console.log(JSON.stringify(reqCache, null, 2));
	const events = [];
	Object.keys(reqCache).forEach((topic) => {
		const topicEvents = reqCache[topic];
		Object.keys(topicEvents).forEach((resId) => {
			const { index, evtData } = topicEvents[resId];
			req.log.info(`Publish buffered event topic: ${topic} resId: ${resId}`);
			events.push({ index, send: () => pubSub.publish(topic, evtData) });
		});
	});
	// make sure events are sorted
	events.sort((a, b) => (a.index > b.index ? 1 : -1));
	// make sure events are sent in serial


	deleteReqCache(req);
	for (const e of events) {
		await e.send();
	}
};


module.exports = {
	queueEvent,
	publishEvents,
	REQ_CACHE,
};
