'use strict';

import { FetchTimeoutMs } from './constants.js';

export function isDigestString(hexStr) {
	if (hexStr.length < 2 * (128 / 8)) { // at least md5, sha1... hex-encoded
		return false;
	}
	if (hexStr.length > 2 * (512 / 8)) { // at most sha512, whirlpool... hex-encoded
		return false;
	}
	// constains only hex chars from start to end, even number of characters
	const res = /^(?:[0-9A-Fa-f]{2})+$/.test(hexStr);
	return res;
}

export async function boundedFetch(url) {
	const timeout = new Promise((_, reject) => {
		setTimeout(reject, FetchTimeoutMs, `Fetch call to ${url} timed out`);
	});
	return Promise.race([ fetch(url, { method: 'GET' }), timeout ]);
}

export async function get(url) {
	const response = await boundedFetch(url).catch(err => {
		throw Error(`failed fetch() for ${url}: ${err}`);
	});
	if (response.ok) {
		return response.text();
	} else {
		throw Error(`failed fetch() for ${url}: ${response.statusText}`);
	}
}

export async function notifyUser(preset, message) {
	const options = {
		iconUrl: browser.runtime.getURL(preset.iconUrl),
		message: message,
		title: preset.title,
		type: 'basic'
	};
	await browser.notifications.create(options);
}
