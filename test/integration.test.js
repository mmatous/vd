'use strict';

import * as browser from 'sinon-chrome/webextensions';
import fetch from 'jest-fetch-mock';

import { VD } from '../src/vd.js';
import * as helpers from './helpers.js';

import { get, loadOptions } from '../3rdparty/AddonSettings/AddonSettings.js';
jest.mock('../3rdparty/AddonSettings/AddonSettings.js');

beforeAll(() => {
	window.browser = browser;
	window.fetch = fetch;
});

describe('vd-background.js', () => {
	test('registers all callbacks', async () => {
		loadOptions.mockResolvedValue();
		await import('../src/vd-background.js');
		expect(browser.downloads.onChanged.addListener.callCount).toBe(1);
		expect(browser.downloads.onCreated.addListener.callCount).toBe(1);
		expect(browser.menus.onClicked.addListener.callCount).toBe(1);
		expect(browser.runtime.onInstalled.addListener.callCount).toBe(1);
	});
});

describe('extension', () => {
	beforeEach(() => {
		browser.flush();
		fetch.resetMocks();
		jest.clearAllMocks();
	});

	test('sends file-digest pair to native app when dirlisting available', async () => {
		fetch.mockResponseOnce(helpers.testHtml);
		browser.downloads.download.resolves(helpers.testDigestItem.id);
		browser.downloads.search.resolves([helpers.testDigestItem]);
		browser.downloads.removeFile.resolves();
		browser.downloads.erase.resolves();
		browser.runtime.sendNativeMessage.resolves(helpers.createAppResponse('Ok', 'PASS', 'Ok', []));
		browser.i18n.getMessage.withArgs('integrityPassed').returns('Integrity check passed');
		browser.i18n.getMessage.withArgs('verificationResults').returns('Verification results');
		get.mockResolvedValue(true);

		const vd = new VD();
		await vd.handleDownloadCreated(helpers.testDownloadItem);
		await vd.handleDownloadChanged({
			id: helpers.testDigestItem.id,
			state: { current: 'complete' }
		});
		await vd.handleDownloadChanged({
			id: helpers.testDownloadItem.id,
			state: { current: 'complete' }
		});

		expect(browser.runtime.sendNativeMessage.callCount).toBe(1);
		expect(browser.runtime.sendNativeMessage.args[0][1]).toEqual({
			'digest-file': '/a/verifiable.file.sha1',
			'input-file': '/a/verifiable.file',
			'original-filename': 'f.ext',
		});

		expect(browser.notifications.create.callCount).toBe(1);
		expect(browser.notifications.create.args[0][0]).toEqual({
			message: '✅ Integrity check passed\n' + helpers.testDownloadItem.filename,
			title: 'Verification results',
			type: 'basic'
		});
	});

	test('sends file-digest pair to native app when rule matched', async () => {
		browser.downloads.download.resolves(helpers.testDigestItem.id);
		browser.downloads.search.resolves([helpers.testDigestItem]);
		browser.downloads.removeFile.resolves();
		browser.downloads.erase.resolves();
		browser.runtime.sendNativeMessage.resolves(helpers.createAppResponse('Ok', 'PASS', 'Ok', []));
		browser.i18n.getMessage.withArgs('integrityPassed').returns('Integrity check passed');
		browser.i18n.getMessage.withArgs('verificationResults').returns('Verification results');
		get.mockResolvedValueOnce('') // sig rules list
			.mockResolvedValueOnce('https://host.io/f.(ext|ext2) || https://host.io/f.$|0|.sha1')
			.mockResolvedValueOnce(false); // do not use autodetect

		const vd = new VD();
		await vd.handleDownloadCreated(helpers.testDownloadItem);
		expect(browser.runtime.sendNativeMessage.callCount).toBe(0);
		await vd.handleDownloadChanged({
			id: helpers.testDigestItem.id,
			state: { current: 'complete' }
		});
		expect(browser.runtime.sendNativeMessage.callCount).toBe(0);
		await vd.handleDownloadChanged({
			id: helpers.testDownloadItem.id,
			state: { current: 'complete' }
		});

		expect(browser.runtime.sendNativeMessage.callCount).toBe(1);
		expect(browser.runtime.sendNativeMessage.args[0][1]).toEqual({
			'digest-file': '/a/verifiable.file.sha1',
			'input-file': '/a/verifiable.file',
			'original-filename': 'f.ext',
		});

		expect(browser.notifications.create.callCount).toBe(1);
		expect(browser.notifications.create.args[0][0]).toEqual({
			message: '✅ Integrity check passed\n' + helpers.testDownloadItem.filename,
			title: 'Verification results',
			type: 'basic'
		});
	});
});