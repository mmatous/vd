/*global beforeAll beforeEach test expect jest global bg require */
'use strict';

import browser from 'sinon-chrome/webextensions';
import fetch from 'jest-fetch-mock';

jest.useFakeTimers();

beforeAll(() => {
	global.browser = browser;
	global.fetch = fetch;
	global.bg = require('../.test/background-testable.js');
});

beforeEach(() => {
	fetch.resetMocks();
	browser.flush();
	bg.records.clear();
	bg.digests.clear();
});

test('getFilename() returns filename if present', () => {
	const u = 'https://www.host.io/downloads/f1.txt';

	expect(bg.getFilename(u)).toBe('f1.txt');
});

test('getFilename() returns empty string if not present', () => {
	const u = 'https://www.host.io/downloads/';

	expect(bg.getFilename(u)).toBe('');
});

test('getFileDir() return file directory as URL', () => {
	expect(bg.getFileDir('https://host.io/path/md5sums'))
		.toEqual(new URL('https://host.io/path/'));
});

test('getSameHostLinks() extracts link for given host from html document', () => {
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
    <a href="https://www.host.io/downloads/f1.txt">L1</a>
    <div>
    	<ul>
			<li><a href="https://host.io/f2.tar">L2</a></li>
			<li><a href="f3.xz">F3</a></li>
        </ul>
    </div>
	<a href="https://www.host.com/html/">E1</a>
	<a href="nonsense ?C=N;O=D">G1</a>
    </body>
</html>
`;

	expect(bg.getSameOriginLinks(response, new URL('https://host.io/'))).toEqual([
		new URL('https://host.io/f2.tar'),
		new URL('https://host.io/f3.xz'),
		//a bit of a nonsense, but there is no other way to scan possible relative path links
		new URL('https://host.io/nonsense ?C=N;O=D')
	]);
});

test('matchAgregatedSumsLinks()', () => {
	expect(bg.matchAgregatedSumsLinks([
		new URL('https://host.io/path/sha1SUM.txt'), new URL('https://host.io/path/link2.sh'),
		new URL('https://path/md5sums'), new URL('https://path/md5sums.asc')
	])).toEqual([
		new URL('https://host.io/path/sha1SUM.txt'), new URL('https://path/md5sums')
	]);
});

test('matchFileSumsLinks()', () => {
	expect(bg.matchFileSumsLinks('file.name', [
		new URL('https://host.io/file.name.DIGESTS'), new URL('https://host.io/file.name.hash.txt'),
		new URL('https://host.io/file.name.gpg'), new URL('https://host.io/file.name.sha512'),
		new URL('https://host.io/sha512sums'), new URL('https://host.io/sha512.sha1'),
		new URL('https://host.io/notfile.name.sha1'), new URL('https://host.io/file.name'),
		new URL('https://host.io/file.name.DIGESTS.asc'), new URL('https://host.io/file.name.pgp')
	])).toEqual([
		new URL('https://host.io/file.name.DIGESTS'), new URL('https://host.io/file.name.hash.txt'),
		new URL('https://host.io/file.name.sha512')
	]);
});

test('selectDigest() returns first available option if possible', () => {
	expect(bg.selectDigest(
		[	'https://host.io/path/md5sums',
			'https://host.io/sha512sums.txt',
			'https://host.io/notadigest.html'
		]))
		.toEqual('https://host.io/path/md5sums');
});

test('selectDigest() returns undefined if no option available', () => {
	expect(bg.selectDigest([])).toEqual(undefined);
});

test('get() returns text response correctly', async () => {
	fetch.mockResponseOnce('<html></html>');
	const res = await bg.get('https://host.io');
	expect(fetch.mock.calls.length).toEqual(1);
	expect(fetch.mock.calls[0][0]).toEqual('https://host.io');
	expect(res).toEqual('<html></html>');
});

test('get() rejects on non-ok status code', async () => {
	fetch.mockResponseOnce('fail', { status: 404 });
	await expect(bg.get('https://host.io')).rejects.toEqual(
		Error('failed fetch() for https://host.io: Error: Not Found')
	);
});

test('get() rejects on fetch rejection', async () => {
	fetch.mockRejectOnce('dns fail');
	await expect(bg.get('https://host.io'))
		.rejects.toEqual(Error('failed fetch() for https://host.io: dns fail'));
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

	const res = await bg.getDigestUrls(new URL('https://host.io/path/verifiable.file'));
	expect(res).toEqual([new URL('https://host.io/path/verifiable.file.sha1')]);
});

test('downloadDigest() returns path digest if successful', async () => {
	browser.downloads.download.returns(42);
	browser.downloads.search.returns(Promise.resolve([{ filename: '/path/to/download/v.file.sha1' }]));

	const [href, id] = await bg.downloadDigest(new URL('https://host.io/path/v.file.sha1'));
	expect(id).toEqual(42);
	expect(href).toEqual('/path/to/download/v.file.sha1');
});

test('downloadDigest() rejects on rejected downloads', async () => {
	browser.downloads.download.returns(Promise.reject('403'));
	browser.downloads.search.returns(Promise.resolve([{ filename: '/path/to/download/v.file.sha1' }]));
	bg.records.set(0, {});

	await expect(bg.downloadDigest(new URL('https://host.io/path/v.file')))
		.rejects.toEqual(Error('unable to download digest https://host.io/path/v.file: 403'));
	expect(bg.records.get(0).digestState).toEqual(undefined);
	expect(bg.digests.get(42)).toEqual(undefined);
});

test('updateIcon() calls API with correct arguments', () => {
	const testPreset = {
		iconUrl: 'testUrl',
		title: 'testTitle'
	};
	bg.notifyUser(testPreset, 'testMsg');
	expect(browser.notifications.create.withArgs(
		{
			iconUrl: 'testUrl',
			message: 'testMsg',
			title: 'testTitle',
			type: 'basic',
		}
	).calledOnce).toEqual(true);
});

//this is a hack, see shouldBeIgnored() for more info
test('shouldBeIgnored() returns true any download with #vd-ignore fragment', () => {
	expect(bg.shouldBeIgnored(
		{ url: 'https://host.io/path/f.sha1#vd-ignore' }
	)).toBe(true);
});

test('shouldBeIgnored() returns false for any download without #vd-ignore fragment', () => {
	expect(bg.shouldBeIgnored(
		{ url: 'https://host.io/path/f.file' }
	)).toBe(false);
});

test('cleanup() removes file (digest), deletes ext. entry (digest, file)', async () => {
	bg.records.set(0, { digestId: 1 });
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.search.returns(
		Promise.resolve([{ filename: '/path/to/download/verifiable.file.sha1' }])
	);
	browser.downloads.erase.returns(Promise.resolve([0]));

	await bg.cleanup(0);
	expect(browser.downloads.removeFile.args[0][0]).toBe(1);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: 1 });
});

test('cleanup() clears downloads even if file removal fails', async () => {
	bg.records.set(2, { digestId: 3 });
	browser.downloads.removeFile.returns(Promise.reject('remove failed'));
	browser.downloads.erase.returns(Promise.resolve([0]));

	await bg.cleanup(2);
	expect(browser.downloads.removeFile.args[0][0]).toBe(3);
	expect(browser.downloads.erase.args[0][0]).toEqual({ id: 3 });
});

test('cleanup() does nothing if called with invalid ID', async () => {
	await bg.cleanup(5);
	expect(browser.downloads.removeFile.callCount).toBe(0);
	expect(browser.downloads.erase.callCount).toBe(0);
});

test('markDownloaded() marks file as downloaded and returns file ID', () => {
	bg.records.set(23, { text: 'retrieveFromRecords' });

	expect(bg.markDownloaded(23)).toEqual(23);

	bg.records.clear();
});

test('markDownloaded() marks digest as downloaded and returns parent \
file entry if provided with valid digest ID', () => {
	bg.digests.set(23, 45);
	bg.records.set(45, { text: 'retrieveFromDigests' });

	expect(bg.markDownloaded(23)).toEqual(45);
});

test('markDownloaded() returns undefined if provided with invalid ID', () => {
	expect(bg.markDownloaded(99999)).toBe(undefined);
});

test('readyForVerification() returns true iff both file and digest finished downloading', () => {
	bg.records.set(0,
		{ fileState: bg.DownloadState.downloaded, digestState: bg.DownloadState.downloaded }
	);
	bg.records.set(1,
		{ fileState: bg.DownloadState.downloading, digestState: bg.DownloadState.downloaded }
	);
	bg.records.set(2,
		{ fileState: bg.DownloadState.downloaded, digestState: bg.DownloadState.unknown }
	);

	expect(bg.readyForVerification(0)).toBe(true);
	expect(bg.readyForVerification(1)).toBe(false);
	expect(bg.readyForVerification(2)).toBe(false);
});

test('handleDownloadInterrupted() cancels digest downloads if main file was interrupted', async () => {
	bg.records.set(9, { digestId: 10, digestState: bg.DownloadState.downloading });
	browser.downloads.cancel.returns(Promise.resolve());
	browser.downloads.removeFile.returns(Promise.resolve());
	browser.downloads.erase.returns(Promise.resolve());

	await bg.handleDownloadInterrupted(
		{ id: 9 }
	);
	expect(browser.downloads.cancel.args[0][0]).toBe(10);
});

test('serializeEntry() returns object for consumption by vd-verifier', () => {
	const res = bg.serializeEntry({
		originalFilename: 'test.file',
		inputFile: '/path/file.f',
		digestFile: '/path/test.file.sha1'
	});

	expect(res['original-filename']).toEqual('test.file');
	expect(res['input-file']).toEqual('/path/file.f');
	expect(res['digest-file']).toEqual('/path/test.file.sha1');
	expect(Object.keys(res).length).toEqual(3);
});

test('handleDownloadCreated() creates appropriate entry in "records" if successful', async () => {
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
	browser.downloads.download.returns(43);
	browser.downloads.search.returns(
		Promise.resolve([{ filename: '/path/to/download/verifiable.file.sha1' }])
	);

	await bg.handleDownloadCreated(
		{ id: 0, url: 'https://host.io/path/verifiable.file', filename: '/path/verifiable.file' }
	);
	expect(bg.records.get(0)).toEqual({
		digestState: bg.DownloadState.downloading,
		digestId: 43,
		digestFile: '/path/to/download/verifiable.file.sha1',
		inputFileState: bg.DownloadState.downloading,
		inputFile: '/path/verifiable.file',
		originalFilename: 'verifiable.file',
	});
});

test('handleDownloadCreated() does not create entry in "records" if no page to parse', async () => {
	fetch.mockRejectOnce('dns fail');
	browser.downloads.download.returns(43);
	browser.downloads.search.returns(
		Promise.resolve([{ filename: '/path/to/download/verifiable.file.sha1' }])
	);

	await bg.handleDownloadCreated(
		{ id: 0, url: 'https://host.io/path/verifiable.file', filename: '/path/verifiable.file' }
	);
	expect(bg.records.get(0)).toEqual(undefined);
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

	await bg.handleDownloadCreated(
		{ id: 0, url: 'https://host.io/path/verifiable.file', filename: '/path/verifiable.file' }
	);
	expect(bg.records.get(0)).toEqual(undefined);
});
