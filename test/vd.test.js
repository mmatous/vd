'use strict';

import * as browser from 'sinon-chrome/webextensions';

import fetch from 'jest-fetch-mock';
import {
	boundedFetch,
	cleanup,
	createListEntry,
	downloadDigest,
	downloadList,
	get,
	getDigestUrls,
	handleDownloadCreated,
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

test('get() returns text response correctly', async () => {
	fetch.mockResponseOnce('<html></html>');
	const res = await get('https://host.io');
	expect(fetch.mock.calls.length).toEqual(1);
	expect(fetch.mock.calls[0][0]).toEqual('https://host.io');
	expect(res).toEqual('<html></html>');
});

test('get() rejects on non-ok status code', async () => {
	fetch.mockResponseOnce('fail', { status: 404 });
	await expect(get('https://host.io')).rejects.toEqual(
		Error('failed fetch() for https://host.io: Not Found')
	);
});

test('get() rejects on fetch rejection', async () => {
	fetch.mockRejectOnce('dns fail');
	await expect(get('https://host.io'))
		.rejects.toEqual(Error('failed fetch() for https://host.io: dns fail'));
});

test('boundedFetch() has 2 sec timeout', async () => {
	fetch.mockResponseOnce(
		() => { return new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 4000)); }
	);
	const res = boundedFetch('https://host.io');
	jest.advanceTimersByTime(3000);
	await expect(res).rejects.toEqual('Fetch call to https://host.io timed out');
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

	const res = await getDigestUrls(new URL('https://host.io/path/verifiable.file'));
	expect(res).toEqual([new URL('https://host.io/path/verifiable.file.sha1')]);
});

test('cleanup() removes file (digest), deletes ext. entry (digest, file)', async () => {
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve([0]));
	const res = createListEntry(testDownloadItem, testDigestItem);
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
	const res = createListEntry(testDownloadItem, testDigestItem);

	await cleanup(res);
	expect(browser.downloads.removeFile.callCount).toBe(0);
	expect(browser.downloads.cancel.callCount).toBe(1);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: testDigestItem.id });
});

test('handleDownloadCreated() returns new entry if successful', async () => {
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
	expect(res).toEqual({
		digestState: DownloadState.downloading,
		digestId: testDigestItem.id,
		digestFile: testDigestItem.filename,
		id: testDownloadItem.id,
		inputFileState: DownloadState.downloading,
		inputFile: testDownloadItem.filename,
		originalFilename: 'f.ext',
	});
});

test('handleDownloadCreated() does not create entry in "records" if no page to parse', async () => {
	fetch.mockRejectOnce('dns fail');
	browser.downloads.download.returns(Promise.resolve(43));
	browser.downloads.search.returns(
		Promise.resolve([{ filename: '/path/to/download/verifiable.file.sha1' }])
	);

	const res = await handleDownloadCreated(
		{ id: 0, url: 'https://host.io/path/verifiable.file', filename: '/path/verifiable.file' }
	);
	expect(res).toEqual(undefined);
});

test('handleDownloadCreated() does not create entry in "records" if digest download fails', async () => {
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
