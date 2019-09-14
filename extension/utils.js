'use strict';

import { FETCH_TIMEOUT_MS } from './constants.js';

export function isDigestString(hexStr) {
	// 20-64 pairs of hex characters (bytes)
	const res = /^(?:(?:[0-9A-Fa-f]){2}){20,64}$/.test(hexStr);
	return res && (hexStr.length % 2 === 0);
}

export async function boundedFetch(url) {
	const timeout = new Promise((_, reject) => {
		setTimeout(reject, FETCH_TIMEOUT_MS, `Fetch call to ${url} timed out`);
	});
	return Promise.race([ fetch(url, { method: 'GET', credentials: 'same-origin' }), timeout ]);
}

export async function get(url) {
	const response = await boundedFetch(url).catch(err => {
		throw Error(`Failed fetch() for ${url}: ${err}`);
	});
	if (response.ok) {
		return response.text();
	} else {
		throw Error(`Failed fetch() for ${url}: ${response.statusText}`);
	}
}

export async function getJson(url) {
	const response = await boundedFetch(url).catch(err => {
		throw Error(`Failed fetch() for ${url}: ${err}`);
	});
	if (response.ok) {
		return response.json();
	} else {
		throw Error(`Failed fetch() for ${url}: ${response.statusText}`);
	}
}

export async function notifyUser(title, message) {
	const options = {
		message: message,
		title: title,
		type: 'basic'
	};
	await browser.notifications.create(options);
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
