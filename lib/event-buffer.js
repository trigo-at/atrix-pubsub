'use strict';


/* eslint no-param-reassign: 0 */

const REQ_CACHE = {};

const getKey = req => req.headers['x-atrix-context-req-id'];

const getCache = (key) => {
	if (!REQ_CACHE[key]) {
		REQ_CACHE[key] = {};
	}
	return REQ_CACHE[key];
};

const getTopicCache = (topic, reqCache) => {
	if (!reqCache[topic]) {
		reqCache[topic] = {};
	}

	return reqCache[topic];
};


const queueEvent = (req, topic, evtData) => {
	if (!evtData.payload.resId) return false;
	const topicCache = getTopicCache(topic, getCache(getKey(req)));

	topicCache[evtData.payload.resId] = evtData;
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
			console.log(`Evt ${topic} ${resId} ${topicEvents[resId]}`);
			events.push(pubSub.publish(topic, topicEvents[resId]));
		});
	});
	await Promise.all(events);
};


module.exports = {
	queueEvent,
	publishEvents,
};
