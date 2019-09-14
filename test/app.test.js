'use strict';

import * as app from '../extension/app.js';
import * as browser from 'sinon-chrome/webextensions';
import * as helpers from './helpers.js';

import { get } from '../extension/3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
jest.mock('../extension/3rdparty/TinyWebEx/AddonSettings/AddonSettings.js');

beforeAll(() => {
	window.browser = browser;
});

beforeEach(() => {
	browser.flush();
});

describe('validResponse()', () => {
	test('returns true if appResponse is well-formed', () => {
		const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', []);
		let res = app.validResponse(appResponse);
		expect(res).toBeTruthy();
	});

	test('returns false if appResponse is not an object', () => {
		let res = app.validResponse(true);
		expect(res).toBeFalsy();
	});

	test('returns false if appResponse has missing fields', () => {
		const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', []);
		appResponse.integrity = undefined;
		let res = app.validResponse(appResponse);

		expect(res).toBeFalsy();
	});
});

describe('handleAppResponse()', () => {
	test('results in notification of any kind if response valid', async () => {
		get.mockResolvedValue(true);
		browser.notifications.create.resolves(true);
		const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', []);

		await app.handleAppResponse(appResponse, 'testedFile');
		expect(browser.notifications.create.callCount).toBe(1);
	});

	test('rejects on invalid response', async () => {
		const appResponse = { not: 'really', valid: true };

		await expect(app.handleAppResponse(appResponse, 'testedFile')).rejects.toThrow('Invalid response ');
	});
});

describe('versionRequest()', () => {
	test('sends message to app in correct format', async () => {
		browser.runtime.sendNativeMessage.resolves({version: '0.3.0'});

		await app.versionRequest();
		expect(browser.runtime.sendNativeMessage.callCount).toBe(1);
		expect(browser.runtime.sendNativeMessage.args[0][1]).toEqual( { 'version-request': true });
	});

	test('throws on malformed response', async () => {
		browser.runtime.sendNativeMessage.resolves('notaversion');

		await expect(app.versionRequest()).rejects.toThrow();
	});
});
