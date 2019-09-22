'use strict';

import { DownloadListItem } from '../src/downloadlist.js';
import * as browser from 'sinon-chrome/webextensions';
import fetch from 'jest-fetch-mock';

import * as vd from '../src/vd.js';
import * as helpers from './helpers.js';
import * as constants from '../src/constants.js';

import { get } from '../3rdparty/AddonSettings/AddonSettings.js';
jest.mock('../3rdparty/AddonSettings/AddonSettings.js');

beforeAll(() => {
	window.browser = browser;
	window.fetch = fetch;
});

beforeEach(() => {
	browser.flush();
	// just let these pass where not direct subject to testing
	browser.downloads.removeFile.resolves();
	browser.downloads.erase.resolves();
	browser.downloads.cancel.resolves();
});

describe('selectDigest()', () => {
	test('returns first available option if possible', () => {
		expect(vd.selectDigest(
			[	'https://host.io/path/sha512sums.txt',
				'https://host.io/sha512sums.txt',
				'https://host.io/notadigest.html'
			]))
			.toEqual('https://host.io/path/sha512sums.txt');
	});

	test('returns undefined if no option available', () => {
		expect(vd.selectDigest([])).toEqual(undefined);
	});
});

describe('browserDownloadFile()', () => {
	test('returns DownloadItem if successful', async () => {
		browser.downloads.download.resolves(helpers.testDigestItem.id);
		browser.downloads.search.resolves([helpers.testDigestItem]);

		const res = await vd.browserDownloadFile(new URL('https://host.io/path/v.file.sha1'));
		expect(res).toEqual(helpers.testDigestItem);
	});

	test('rejects on rejected downloads', async () => {
		browser.downloads.download.rejects('403');

		await expect(vd.browserDownloadFile(new URL('https://host.io/path/v.file')))
			.rejects.toThrow('Unable to download https://host.io/path/v.file: 403');
	});
});

describe('shouldBeIgnored()', () => {
	test('returns true any download by vd@vd.io', () => {
		browser.runtime.id = 'vd@vd.io';
		expect(vd.shouldBeIgnored({
			url: 'https://host.io/path/f.sha1',
			byExtensionId: 'vd@vd.io'
		}
		)).toBe(true);
	});

	test('returns false for any download not by vd@vd.io', () => {
		browser.runtime.id = 'vd@vd.io';
		expect(vd.shouldBeIgnored({ url: 'https://host.io/path/f.file' })).toBe(false);
	});
});

describe('getDigestUrls()', () => {
	test('return a list of digest urls from a list of urls', async () => {
		const urls = [
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/f.ext.sha256'),
			new URL('https://host.io/path/differentFile.ext'),
			new URL('https://host.io/path/differentFile.ext.sha1')
		];
		const res = await vd.getDigestUrls('f.ext', urls, false);
		expect(res).toEqual([new URL('https://host.io/path/f.ext.sha1')]);
	});
});

describe('cleanup()', () => {
	test('removes file (digest), deletes ext. entry (digest, file)', async () => {
		browser.downloads.removeFile.resolves();
		browser.downloads.erase.resolves([ 0 ]);

		await vd.cleanup(1, constants.DownloadState.downloaded);
		expect(browser.downloads.cancel.callCount).toBe(0);
		expect(browser.downloads.removeFile.args[0][0]).toBe(1);
		expect(browser.downloads.erase.args[0][0]).toEqual({ id: 1 });
	});

	test('clears downloads even if file removal fails', async () => {
		browser.downloads.erase.resolves([ 0 ]);
		browser.downloads.cancel.rejects('other error');

		await vd.cleanup(1, constants.DownloadState.downloading);
		expect(browser.downloads.removeFile.callCount).toBe(0);
		expect(browser.downloads.cancel.args[0][0]).toBe(1);
		expect(browser.downloads.erase.args[0][0]).toEqual({ id: 1 });
	});
});

describe('handleDownloadCreated()', () => {
	beforeEach(() => {
		fetch.resetMocks();
	});

	test('returns false if no page to parse', async () => {
		const v = new vd.VD();
		fetch.mockRejectOnce('dns fail');
		get.mockResolvedValue(true);

		const res = await v.handleDownloadCreated(helpers.testDownloadItem);
		expect(res).toBe(false);
	});
});

describe('matchHref()', () => {
	test('returns value matching regex key', async () => {
		const url = new URL('https://host.io/');
		const list = String.raw`^irrelevantKey || irrelevantValue`
						+ '\n'
						+ String.raw`^https://host.io/ || value`;

		const res = await vd.matchHref(url, list);
		expect(res).toEqual('value');
	});

	test('returns value with replaced parts', async () => {
		const rStr = String.raw`^https://download.fedoraproject.org/pub/fedora/linux/releases/(\d{2})/(\w*)/(\w[\d_]*)/iso/.*-(\d\.\d).iso`;
		let downloadUrl = 'https://download.fedoraproject.org/pub/fedora/linux/releases/30/Workstation/x86_64/iso/Fedora-Workstation-Live-x86_64-30-1.2.iso';
		downloadUrl = new URL(downloadUrl);
		const list = String.raw`^irrelevantKey || irrelevantValue`
						+ '\n'
						+ `${rStr} || https://getfedora.org/static/checksums/Fedora-$|2|-$|1|-$|4|-$|3|-CHECKSUM`;

		const res = await vd.matchHref(downloadUrl, list);
		expect(res).toEqual('https://getfedora.org/static/checksums/Fedora-Workstation-30-1.2-x86_64-CHECKSUM');
	});

	test('returns null if no regex matches URL', async () => {
		const url = new URL('nhttps://host.io/');
		const list = '^https://host.io/ || value';

		const res = await vd.matchHref(url, list);
		expect(res).toEqual(null);
	});
});

describe('sendReady()', () => {
	test('returns false if sending to native app was unsuccessful', async () => {
		// do not set mocks to simulate comunication problems
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
		entry.setDigest(hex);
		entry.markDownloaded(helpers.testDownloadItem.id);
		const res = await vd.sendReady(entry);
		expect(res).toBe(false);
	});

	test('returns true if sending to native app was successful', async () => {
		const response = helpers.createAppResponse('Ok', 'UNTESTED', 'Ok', 'UNTESTED');
		browser.runtime.sendNativeMessage.resolves(response);

		const entry = new DownloadListItem(helpers.testDownloadItem);
		const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
		entry.setDigest(hex);
		entry.markDownloaded(helpers.testDownloadItem.id);


		const res = await vd.sendReady(entry);
		expect(res).toBe(true);
	});
});

describe('selectSignature()', () => {
	test('returns any available option', () => {
		const signatures = [
			'https://host.io/path/sha512sums.txt',
			'https://host.io/sha512sums.txt',
			'https://host.io/notadigest.html'
		];
		expect(signatures).toContain(vd.selectSignature(signatures));
	});

	test('returns undefined if no option available', () => {
		expect(vd.selectSignature([])).toEqual(undefined);
	});
});

describe('autodetectSignature()', () => {
	test('returns null if no signature detected', async () => {
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const urls = [
			new URL('https://host.io/path/sha512sums.txt'),
			new URL('https://host.io/sha512sums.txt'),
			new URL('https://host.io/notadigest.html'),
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/f.ext.sha256'),
		];

		let res = await vd.autodetectSignature('f.ext', urls, entry);
		expect(res).toBe(null);
	});

	test('returns sig. download item if signature queued for download', async () => {
		browser.downloads.download.resolves(helpers.testSigItem.id);
		browser.downloads.search.resolves([helpers.testSigItem]);
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const urls = [
			new URL('https://host.io/path/sha512sums.txt'),
			new URL('https://host.io/sha512sums.txt'),
			new URL('https://host.io/notadigest.html'),
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/f.ext.sha256'),
			new URL('https://host.io/path/f.ext.sig'),
		];

		let res = await vd.autodetectSignature('f.ext', urls, entry);
		expect(res).toBe(helpers.testSigItem);
	});

	// values don't really matter as long as the calls bubble through instead of returning null
	test('handles signed digest files', async () => {
		browser.downloads.download.resolves(5);
		browser.downloads.search.resolves([{id: 5}]);
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const urls = [
			new URL('https://host.io/path/sha1sums.gpg'),
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/sha1sums'),
		];

		let res = await vd.autodetectSignature('sha1sums', urls, entry, constants.SignedData.digest);
		expect(res).toEqual({id: 5});
	});
});

describe('autodetectDigest()', () => {
	test('returns null if no digest detected', async () => {
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const urls = [
			new URL('https://host.io/path/sha512sums.txt.gpg'),
			new URL('https://host.io/winds_of_winter.epub'),
			new URL('https://host.io/notadigest.html'),
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/f.ext.sha0'),
		];

		let res = await vd.autodetectDigest('f.ext', urls, entry);
		expect(res).toBe(null);
	});

	test('returns digest download item if digest queued for download', async () => {
		browser.downloads.download.resolves(helpers.testDigestItem.id);
		browser.downloads.search.resolves([helpers.testDigestItem]);
		const entry = new DownloadListItem(helpers.testDownloadItem);
		const urls = [
			new URL('https://host.io/path/sha512sums.txt'),
			new URL('https://host.io/sha512sums.txt'),
			new URL('https://host.io/notadigest.html'),
			new URL('https://host.io/path/f.ext'),
			new URL('https://host.io/path/f.ext.sha256'),
			new URL('https://host.io/path/f.ext.sig'),
		];

		let res = await vd.autodetectDigest('f.ext', urls, entry);
		expect(res).toBe(helpers.testDigestItem);
	});
});
