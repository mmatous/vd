'use strict';

import * as utils from './utils.js';
import * as constants from './constants.js';

export async function versionRequest() {
	const testMessage = { 'version-request': true };
	const response = await browser.runtime.sendNativeMessage(constants.NATIVE_APP_ID, testMessage);
	console.info(`Native app responded: ${JSON.stringify(response, null, '\t')}`);
	if (!response.version) {
		throw Error(response);
	} else {
		return response.version;
	}
}

export function validResponse(response) {
	return (typeof response === 'object')
		&& (response.integrity && response.signatures)
		&& (response.integrity.Ok || response.integrity.Err)
		&& (response.signatures.Ok || response.signatures.Err)
		? true : false;
}

export function integrityToNotification(integrity) {
	if (integrity.Ok) {
		switch (integrity.Ok) {
		case 'PASS':
			return '✅ Integrity check passed';
		case 'UNTESTED':
			return 'Integrity not tested';
		default:
			return '❌ Integrity check failed';
		}
	} else {
		return `❗ Integrity check error: ${integrity.Err}`;
	}
}

export async function handleAppResponse(response, filePath) {
	if (validResponse(response)) {
		const integrityResult = integrityToNotification(response.integrity);
		const notificationText =
`${integrityResult}
${filePath}`;
		await utils.notifyUser(constants.Preset.results, notificationText);
	} else {
		throw Error(`invalid response ${JSON.stringify(response)}`);
	}
}

export async function sendToNativeApp(entry) {
	const serialized = entry.serialize();
	try {
		const response = await browser.runtime.sendNativeMessage(constants.NATIVE_APP_ID, serialized);
		console.info(`Native app responded: ${JSON.stringify(response, null, '\t')}`);
		await handleAppResponse(response, entry.inputFile);
	} catch (e) {
		throw Error(`error communicating with vd-verifier: ${e.message}`);
	}
}
