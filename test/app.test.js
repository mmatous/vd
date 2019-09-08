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

test('validResponse() returns true if appResponse is well-formed', () => {
	const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', 'UNTESTED');
	let res = app.validResponse(appResponse);
	expect(res).toBe(true);
});

test('validResponse() returns false if appResponse is not an object', () => {
	let res = app.validResponse(true);
	expect(res).toBe(false);
});

test('validResponse() returns false if appResponse has missing fields', () => {
	const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', 'UNTESTED');
	appResponse.integrity = undefined;
	let res = app.validResponse(appResponse);

	expect(res).toBe(false);
});

test('handleAppResponse() results in success notification if integrity passes', async () => {
	get.mockResolvedValue(true);
	browser.notifications.create.resolves(true);
	const appResponse = helpers.createAppResponse('Ok', 'PASS', 'Ok', 'UNTESTED');

	await app.handleAppResponse(appResponse, 'testedFile');
	expect(browser.notifications.create.callCount).toBe(1);
	expect(browser.notifications.create.args[0][0]).toEqual(
		{
			message: '✅ Integrity check passed\ntestedFile',
			title: 'Verification results',
			type: 'basic'
		}
	);
});

test('handleAppResponse() results in failure notification if verification fails', async () => {
	get.mockResolvedValue(true);
	browser.notifications.create.resolves(true);
	const appResponse = helpers.createAppResponse('Ok', 'FAIL', 'Ok', 'UNTESTED');

	await app.handleAppResponse(appResponse, 'testedFile');
	expect(browser.notifications.create.callCount).toBe(1);
	expect(browser.notifications.create.args[0][0]).toEqual(
		{
			message: '❌ Integrity check failed\ntestedFile',
			title: 'Verification results',
			type: 'basic'
		}
	);
});

test('handleAppResponse() results in error notification if an error occurs', async () => {
	get.mockResolvedValue(true);
	browser.notifications.create.resolves(true);
	const appResponse = helpers.createAppResponse('Err', 'unable to open file', 'Ok', 'UNTESTED');

	await app.handleAppResponse(appResponse, 'testedFile');
	expect(browser.notifications.create.callCount).toBe(1);
	expect(browser.notifications.create.args[0][0]).toEqual(
		{
			message: '❗ Integrity check error: unable to open file\ntestedFile',
			title: 'Verification results',
			type: 'basic'
		}
	);
});

test('versionRequest() sends message to app in correct format', async () => {
	browser.runtime.sendNativeMessage.resolves({version: '0.3.0'});

	await app.versionRequest();
	expect(browser.runtime.sendNativeMessage.callCount).toBe(1);
	expect(browser.runtime.sendNativeMessage.args[0][1]).toEqual(
		{
			'version-request': true
		}
	);
});

test('versionRequest() throws on malformed response', async () => {
	browser.runtime.sendNativeMessage.resolves('notaversion');

	await expect(app.versionRequest()).rejects.toThrow();
});