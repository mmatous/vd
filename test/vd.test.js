'use strict';

import { DownloadListItem } from '../extension/downloadlist.js';
import * as browser from 'sinon-chrome/webextensions';
import fetch from 'jest-fetch-mock';

import * as vd from '../extension/vd.js';
import * as helpers from './helpers.js';

jest.useFakeTimers();

beforeAll(() => {
	window.browser = browser;
	window.fetch = fetch;
});

beforeEach(() => {
	fetch.resetMocks();
	vd.downloadList.downloads = new Array();
	jest.clearAllTimers();
	browser.flush();
	// just let these pass where not direct subject to testing
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve());
	browser.downloads.cancel.returns(Promise.resolve());
});

test('selectDigest() returns first available option if possible', () => {
	expect(vd.selectDigest(
		[	'https://host.io/path/sha512sums.txt',
			'https://host.io/sha512sums.txt',
			'https://host.io/notadigest.html'
		]))
		.toEqual('https://host.io/path/sha512sums.txt');
});

test('selectDigest() returns undefined if no option available', () => {
	expect(vd.selectDigest([])).toEqual(undefined);
});


test('downloadDigest() returns digest DownloadItem if successful', async () => {
	browser.downloads.download.returns(Promise.resolve(helpers.testDigestItem.id));
	browser.downloads.search.returns(Promise.resolve([helpers.testDigestItem]));

	const res = await vd.downloadDigest(new URL('https://host.io/path/v.file.sha1'));
	expect(res).toEqual(helpers.testDigestItem);
});

test('downloadDigest() rejects on rejected downloads', async () => {
	browser.downloads.download.returns(Promise.reject('403'));
	browser.downloads.search.returns(Promise.resolve([{ filename: '/path/to/download/v.file.sha1' }]));

	await expect(vd.downloadDigest(new URL('https://host.io/path/v.file')))
		.rejects.toEqual(Error('unable to download digest https://host.io/path/v.file: 403'));
});

test('shouldBeIgnored() returns true any download by vd@vd.io', () => {
	expect(vd.shouldBeIgnored({
		url: 'https://host.io/path/f.sha1',
		byExtensionId: 'vd@vd.io'
	}
	)).toBe(true);
});

test('shouldBeIgnored() returns false for any download not by vd@vd.io', () => {
	expect(vd.shouldBeIgnored({ url: 'https://host.io/path/f.file' })).toBe(false);
});

test('getDigestUrls() return a list of digest urls', async () => {
	fetch.mockResponseOnce(helpers.testHtml);

	const res = await vd.getDigestUrls(new URL('https://host.io/path/f.ext'), false);
	expect(res).toEqual([new URL('https://host.io/path/f.ext.sha1')]);
});

test('cleanup() removes file (digest), deletes ext. entry (digest, file)', async () => {
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve([0]));
	const res = vd.createListEntry(helpers.testDownloadItem);
	res.setDigestFile(helpers.testDigestItem);
	res.markDownloaded(helpers.testDigestItem.id);

	await vd.cleanup(res);
	expect(browser.downloads.cancel.callCount).toBe(0);
	expect(browser.downloads.removeFile.callCount).toBe(1);
	expect(browser.downloads.removeFile.args[0][0]).toBe(helpers.testDigestItem.id);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: helpers.testDigestItem.id });
});

test('cleanup() clears downloads even if file removal fails', async () => {
	browser.downloads.erase.returns(Promise.resolve([0]));
	browser.downloads.cancel.returns(Promise.reject('other error'));
	const res = vd.createListEntry(helpers.testDownloadItem);
	res.setDigestFile(helpers.testDigestItem);

	await vd.cleanup(res);
	expect(browser.downloads.removeFile.callCount).toBe(0);
	expect(browser.downloads.cancel.callCount).toBe(1);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: helpers.testDigestItem.id });
});

test('handleDownloadCreated() returns new entry with digest info if all successful', async () => {
	fetch.mockResponseOnce(helpers.testHtml);
	browser.downloads.download.returns(Promise.resolve(helpers.testDigestItem.id));
	browser.downloads.search.returns(Promise.resolve([helpers.testDigestItem]));

	const res = await vd.handleDownloadCreated(helpers.testDownloadItem);
	expect(res).toEqual(helpers.testDownloadListItem);
});

test('handleDownloadCreated() returns undefined if no page to parse', async () => {
	fetch.mockRejectOnce('dns fail');
	browser.downloads.download.returns(Promise.resolve(helpers.testDownloadItem.id));
	browser.downloads.search.returns(
		Promise.resolve([helpers.testDownloadItem])
	);

	const res = await vd.handleDownloadCreated(helpers.testDownloadItem);
	expect(res).toEqual(undefined);
});

test('matchFromList() returns value matching regex key', async () => {
	const url = new URL('https://host.io/');
	const list = String.raw`^irrelevantKey || irrelevantValue`
					+ '\n'
					+ String.raw`^https://host.io/ || value`;

	const res = await vd.matchFromList(url, list);
	expect(res).toEqual('value');
});

test('matchFromList() returns value with replaced parts', async () => {
	const rStr = String.raw`^https://download.fedoraproject.org/pub/fedora/linux/releases/(\d{2})/(\w*)/(\w[\d_]*)/iso/.*-(\d\.\d).iso`;
	let downloadUrl = 'https://download.fedoraproject.org/pub/fedora/linux/releases/30/Workstation/x86_64/iso/Fedora-Workstation-Live-x86_64-30-1.2.iso';
	downloadUrl = new URL(downloadUrl);
	const list = String.raw`^irrelevantKey || irrelevantValue`
					+ '\n'
					+ `${rStr} || https://getfedora.org/static/checksums/Fedora-$|2|-$|1|-$|4|-$|3|-CHECKSUM`;

	const res = await vd.matchFromList(downloadUrl, list);
	expect(res).toEqual('https://getfedora.org/static/checksums/Fedora-Workstation-30-1.2-x86_64-CHECKSUM');
});

test('matchFromList() returns null if no regex matches URL', async () => {
	const url = new URL('nhttps://host.io/');
	const list = '^https://host.io/ || value';

	const res = await vd.matchFromList(url, list);
	expect(res).toEqual(null);
});

test('sendIfReady() returns false if sending to native app was unsuccessful', async () => {
	// do not set mocks to simulate comunication problems
	const entry = new DownloadListItem(helpers.testDownloadItem);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);
	entry.markDownloaded(helpers.testDownloadItem.id);
	const res = await vd.sendIfReady(entry);
	expect(res).toBe(false);
});

test('sendIfReady() returns true if sending to native app was successful', async () => {
	const response = helpers.createAppResponse('Ok', 'UNTESTED', 'Ok', 'UNTESTED');
	browser.runtime.sendNativeMessage.returns(Promise.resolve(response));

	const entry = new DownloadListItem(helpers.testDownloadItem);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);
	entry.markDownloaded(helpers.testDownloadItem.id);


	const res = await vd.sendIfReady(entry);
	expect(res).toBe(true);
});
