'use strict';

import * as utils from './utils.js';
import * as constants from './constants.js';
import VdError from './vd-error.js';

export async function versionRequest() {
	const testMessage = { 'version-request': true };
	const response = await browser.runtime.sendNativeMessage(constants.NATIVE_APP_ID, testMessage);
	console.info(`Native app responded: ${JSON.stringify(response, null, '\t')}`);
	if (!response.version) {
		throw new VdError(true, response);
	} else {
		return response.version;
	}
}

export function validResponse(response) {
	return (typeof response === 'object')
		&& (response.integrity && response.signatures)
		&& (response.integrity.Ok || response.integrity.Err)
		&& (response.signatures.Ok || response.signatures.Err);
}

export function integrityToNotification(integrity) {
	if (integrity.Ok) {
		switch (integrity.Ok) {
		case 'PASS':
			return '✅ ' + browser.i18n.getMessage('integrityPassed');
		case 'UNTESTED':
			return '';
		default:
			return '❌ ' + browser.i18n.getMessage('integrityFailed');
		}
	} else {
		return browser.i18n.getMessage('integrityError', integrity.Err);
	}
}

export function signaturesToNotification(signatures) {
	if (signatures.Ok) {
		if (signatures.Ok.length === 0) {
			return '';
		}
		let result = browser.i18n.getMessage('signaturesProcessed', signatures.Ok.length);
		for (let signature of signatures.Ok) {
			switch (signature) {
			case 'PASS':
				result += '\n\t' + browser.i18n.getMessage('signatureOk');
				break;
			default:
				result += '\n\t❌ ' + signature;
			}
		}
		return result;
	} else {
		return browser.i18n.getMessage('signatureError', signatures.Err);
	}
}

export async function handleAppResponse(response, filePath) {
	if (validResponse(response)) {
		const signatureResult = signaturesToNotification(response.signatures);
		let integrityResult = signatureResult.length === 0 ? '' : '\n';
		integrityResult += integrityToNotification(response.integrity);
		const notificationText =
`${signatureResult}${integrityResult}
${filePath}`;
		await utils.notifyUser(browser.i18n.getMessage('verificationResults'), notificationText);
	} else {
		throw new VdError(true, `Invalid response ${JSON.stringify(response)}`);
	}
}

export async function sendToNativeApp(entry) {
	const serialized = entry.serialize();
	try {
		const response = await browser.runtime.sendNativeMessage(constants.NATIVE_APP_ID, serialized);
		console.info(`Native app responded: ${JSON.stringify(response, null, '\t')}`);
		await handleAppResponse(response, entry.inputFile);
	} catch (e) {
		throw new VdError(true, `Error communicating with vd-verifier: ${e.message}`);
	}
}
