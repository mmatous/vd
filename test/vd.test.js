'use strict';

import * as browser from 'sinon-chrome/webextensions';
import fetch from 'jest-fetch-mock';

import {
	cleanup,
	createListEntry,
	downloadDigest,
	downloadList,
	getDigestUrls,
	handleDownloadCreated,
	matchFromList,
	selectDigest,
	shouldBeIgnored
} from '../extension/vd.js';
import { DownloadState } from '../extension/downloadlist.js';


jest.useFakeTimers();

const testDownloadItem = {
	id: 1,
	url: 'https://host.io/f.ext',
	filename: '/a/verifiable.file'
};

const testDigestItem = {
	id: 2,
	url: 'https://host.io/f.ext.sha1',
	filename: '/a/verifiable.file.sha1'
};

const downloadListItem2 = {
	digestFile: '/a/verifiable.file.sha1',
	digestHex: undefined,
	digestId: 2,
	digestState: DownloadState.downloading,
	id: 1,
	inputFile: '/a/verifiable.file',
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

beforeAll(() => {
	window.browser = browser;
	window.fetch = fetch;
});

beforeEach(() => {
	fetch.resetMocks();
	downloadList.downloads = new Array();
	jest.clearAllTimers();
	browser.flush();
	// just let these pass where not direct subject to testing
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve());
	browser.downloads.cancel.returns(Promise.resolve());
});

test('selectDigest() returns first available option if possible', () => {
	expect(selectDigest(
		[	'https://host.io/path/md5sums',
			'https://host.io/sha512sums.txt',
			'https://host.io/notadigest.html'
		]))
		.toEqual('https://host.io/path/md5sums');
});

test('selectDigest() returns undefined if no option available', () => {
	expect(selectDigest([])).toEqual(undefined);
});


test('downloadDigest() returns digest DownloadItem if successful', async () => {
	browser.downloads.download.returns(Promise.resolve(testDigestItem.id));
	browser.downloads.search.returns(Promise.resolve([testDigestItem]));

	const res = await downloadDigest(new URL('https://host.io/path/v.file.sha1'));
	expect(res).toEqual(testDigestItem);
});

test('downloadDigest() rejects on rejected downloads', async () => {
	browser.downloads.download.returns(Promise.reject('403'));
	browser.downloads.search.returns(Promise.resolve([{ filename: '/path/to/download/v.file.sha1' }]));

	await expect(downloadDigest(new URL('https://host.io/path/v.file')))
		.rejects.toEqual(Error('unable to download digest https://host.io/path/v.file: 403'));
});


//this is a hack, see shouldBeIgnored() for more info
test('shouldBeIgnored() returns true any download with #vd-ignore fragment', () => {
	expect(shouldBeIgnored(
		{ url: 'https://host.io/path/f.sha1#vd-ignore' }
	)).toBe(true);
});

test('shouldBeIgnored() returns false for any download without #vd-ignore fragment', () => {
	expect(shouldBeIgnored(
		{ url: 'https://host.io/path/f.file' }
	)).toBe(false);
});

test('getDigestUrls() return a list of digest urls', async () => {
	const response = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>title</title>
			<link rel="stylesheet" href="style.css">
			<script src="script.js"></script>
		</head>
		<body>
		<div>
			<ul>
				<li><a href="https://host.io/path/verifiable.file">L1</a></li>
				<li><a href="https://host.io/path/verifiable.file.sha1">L2</a></li>
			</ul>
		</div>
		<a href="https://www.host.com/html/">E1</a>
		</body>
	</html>
	`;
	fetch.mockResponseOnce(response);

	const res = await getDigestUrls(new URL('https://host.io/path/verifiable.file'), false);
	expect(res).toEqual([new URL('https://host.io/path/verifiable.file.sha1')]);
});

test('cleanup() removes file (digest), deletes ext. entry (digest, file)', async () => {
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve([0]));
	const res = createListEntry(testDownloadItem);
	res.setDigestFile(testDigestItem);
	res.markDownloaded(testDigestItem.id);

	await cleanup(res);
	expect(browser.downloads.cancel.callCount).toBe(0);
	expect(browser.downloads.removeFile.callCount).toBe(1);
	expect(browser.downloads.removeFile.args[0][0]).toBe(testDigestItem.id);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: testDigestItem.id });
});

test('cleanup() clears downloads even if file removal fails', async () => {
	browser.downloads.erase.returns(Promise.resolve([0]));
	browser.downloads.cancel.returns(Promise.reject('other error'));
	const res = createListEntry(testDownloadItem);
	res.setDigestFile(testDigestItem);

	await cleanup(res);
	expect(browser.downloads.removeFile.callCount).toBe(0);
	expect(browser.downloads.cancel.callCount).toBe(1);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: testDigestItem.id });
});

test('handleDownloadCreated() returns new entry with digest info if all successful', async () => {
	const response = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>title</title>
			<link rel="stylesheet" href="style.css">
			<script src="script.js"></script>
		</head>
		<body>
		<div>
			<ul>
				<li><a href="https://host.io/path/f.ext">L1</a></li>
				<li><a href="https://host.io/path/f.ext.sha1">L2</a></li>
			</ul>
		</div>
		<a href="https://www.host.com/html/">E1</a>
		</body>
	</html>
	`;
	fetch.mockResponseOnce(response);
	browser.downloads.download.returns(Promise.resolve(testDigestItem.id));
	browser.downloads.search.returns(Promise.resolve([testDigestItem]));

	const res = await handleDownloadCreated(testDownloadItem);
	expect(res).toEqual(downloadListItem2);
});

test('handleDownloadCreated() returns undefined if no page to parse', async () => {
	fetch.mockRejectOnce('dns fail');
	browser.downloads.download.returns(Promise.resolve(testDownloadItem.id));
	browser.downloads.search.returns(
		Promise.resolve([testDownloadItem])
	);

	const res = await handleDownloadCreated(testDownloadItem);
	expect(res).toEqual(undefined);
});

test('handleDownloadCreated() returns undefined if digest download fails', async () => {
	const response = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>title</title>
			<link rel="stylesheet" href="style.css">
			<script src="script.js"></script>
		</head>
		<body>
		<div>
			<ul>
				<li><a href="https://host.io/path/verifiable.file">L1</a></li>
				<li><a href="https://host.io/path/verifiable.file.sha1">L2</a></li>
			</ul>
		</div>
		<a href="https://www.host.com/html/">E1</a>
		</body>
	</html>
	`;
	fetch.mockResponseOnce(response);
	browser.downloads.download.rejects('disconnected');
	browser.downloads.search.returns(
		Promise.resolve([{ filename: '/path/to/download/verifiable.file.sha1' }])
	);

	const res = await handleDownloadCreated(
		{ id: 0, url: 'https://host.io/path/verifiable.file', filename: '/path/verifiable.file' }
	);
	expect(res).toEqual(undefined);
});

test('matchFromList() returns value matching regex key', async () => {
	const url = new URL('https://host.io/');
	const list = String.raw`^irrelevantKey || irrelevantValue`
					+ '\n'
					+ String.raw`^https://host.io/ || value`;

	const res = await matchFromList(url, list);
	expect(res).toEqual('value');
});

test('matchFromList() returns value with replaced parts', async () => {
	const rStr = String.raw`^https://download.fedoraproject.org/pub/fedora/linux/releases/(\d{2})/(\w*)/(\w[\d_]*)/iso/.*-(\d\.\d).iso`;
	let downloadUrl = 'https://download.fedoraproject.org/pub/fedora/linux/releases/30/Workstation/x86_64/iso/Fedora-Workstation-Live-x86_64-30-1.2.iso';
	downloadUrl = new URL(downloadUrl);
	const list = String.raw`^irrelevantKey || irrelevantValue`
					+ '\n'
					+ `${rStr} || https://getfedora.org/static/checksums/Fedora-$|2|-$|1|-$|4|-$|3|-CHECKSUM`;

	const res = await matchFromList(downloadUrl, list);
	expect(res).toEqual('https://getfedora.org/static/checksums/Fedora-Workstation-30-1.2-x86_64-CHECKSUM');
});

test('matchFromList() returns null if no regex matches URL', async () => {
	const url = new URL('nhttps://host.io/');
	const list = '^https://host.io/ || value';

	const res = await matchFromList(url, list);
	expect(res).toEqual(null);
});