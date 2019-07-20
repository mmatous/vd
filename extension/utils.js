'use strict';

import { FETCH_TIMEOUT_MS, NATIVE_APP_ID } from './constants.js';

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
		setTimeout(reject, FETCH_TIMEOUT_MS, `Fetch call to ${url} timed out`);
	});
	return Promise.race([ fetch(url, { method: 'GET', credentials: 'same-origin' }), timeout ]);
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

export async function getJson(url) {
	const response = await boundedFetch(url).catch(err => {
		throw Error(`failed fetch() for ${url}: ${err}`);
	});
	if (response.ok) {
		return response.json();
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

export async function testVerifier() {
	const testMessage = { ping: 'versionRequest' };
	const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, testMessage);
	console.info(`native app responded: ${JSON.stringify(response, null, '\t')}`);
	if (!response.result) {
		throw Error(response);
	} else {
		return response.result;
	}
}

export function toRaw(str) {
	const charMappings = {
		'.': String.raw`\.`,
		'b': String.raw`\b`,
		'B': String.raw`\B`,
		'd': String.raw`\d`,
		'D': String.raw`\D`,
		'n': String.raw`\n`,
		's': String.raw`\s`,
		'S': String.raw`\S`,
		't': String.raw`\t`,
		'w': String.raw`\w`,
	};
	const raw = String.raw`${str}`;
	return raw.replace(/\\(.)/g, (str, char) => {
		return charMappings[char];
	});
}
