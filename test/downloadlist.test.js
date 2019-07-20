'use strict';

import {
	DownloadList,
	DownloadListItem,
	DownloadState
} from '../extension/downloadlist.js';
import * as browser from 'sinon-chrome/webextensions';

beforeAll(() => {
	window.browser = browser;
});

beforeEach(() => {
	browser.flush();
});

const testDownloadItem1 = {
	id: 1,
	url: 'https://url/f.ext',
	filename: '/a/file'
};


const testDigestItem1 = {
	id: 2,
	url: 'https://url/f.ext.sha1',
	filename: '/a/digest'
};

const downloadListItemInitial = {
	digestFile: undefined,
	digestHex: undefined,
	digestId: undefined,
	digestState: DownloadState.unknown,
	id: 1,
	inputFile: '/a/file',
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

const downloadListItemWithDigest = {
	digestFile: '/a/digest',
	digestHex: undefined,
	digestId: 2,
	digestState: DownloadState.downloading,
	id: 1,
	inputFile: '/a/file',
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

test('DownloadList can save & retrieve entry', () => {
	const list = new DownloadList(2);

	list.createEntry(testDownloadItem1);
	const retrieved = list.getByDownloadId(testDownloadItem1.id);
	expect(retrieved).toEqual(downloadListItemInitial);
});

test('Fresh DownloadList is empty', () => {
	const list = new DownloadList(2);
	expect(list.empty()).toEqual(true);
});

test('Fresh DownloadList with entry is not empty', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1);
	expect(list.empty()).toEqual(false);
});

test('getRegularDownload() returns undefined if key does not exist', () => {
	const list = new DownloadList(2);

	const retrieved = list.getByDownloadId(testDownloadItem1.id);
	expect(retrieved).toEqual(undefined);
});

test('getByDigestId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(testDownloadItem1);
	res.setDigestFile(testDigestItem1);

	const digestParent = list.getByDigestId(testDigestItem1.id);
	expect(digestParent).toEqual(downloadListItemWithDigest);
});

test('getByAnyId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(testDownloadItem1);
	res.setDigestFile(testDigestItem1);

	const digestParent = list.getByAnyId(testDigestItem1.id);
	const retrieved = list.getByAnyId(testDownloadItem1.id);
	expect(digestParent).toEqual(retrieved);
});

test('hasRegularDownload() returns true if RD exists', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1);

	const exists = list.hasRegularDownload(testDownloadItem1.id);
	expect(exists).toEqual(true);
});

test('hasRegularDownload() returns false if RD does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1);

	const exists = list.hasRegularDownload(-1);
	expect(exists).toEqual(false);
});

test('hasDigest() returns true if digest exists', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(testDownloadItem1);
	res.setDigestFile(testDigestItem1);

	const exists = list.hasDigest(testDigestItem1.id);
	expect(exists).toEqual(true);
});

test('hasDigest() returns false if digest does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1);

	const exists = list.hasDigest(testDigestItem1.id);
	expect(exists).toEqual(false);
});

test('DownloadList discards oldest entries over capacity', () => {
	const list = new DownloadList(2);
	const testItem2 = Object.assign({}, testDownloadItem1);
	const testItem3 = Object.assign({}, testDownloadItem1);
	testItem2.id = 3;
	testItem3.id = 4;
	list.createEntry(testDownloadItem1);
	list.createEntry(testItem2);
	list.createEntry(testItem3);

	expect(list.hasRegularDownload(testDownloadItem1.id))
		.toEqual(false);
	expect(list.hasRegularDownload(testItem2.id))
		.toEqual(true);
	expect(list.hasRegularDownload(testItem3.id))
		.toEqual(true);
});

//	DownloadListItem tests

test('markDownloaded() marks file downloaded if passed file ID', () => {
	const entry = new DownloadListItem(testDownloadItem1);

	entry.markDownloaded(testDownloadItem1.id);
	expect(entry.inputFileState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() marks digest if passed digest ID', () => {
	const entry = new DownloadListItem(testDownloadItem1);
	entry.setDigestFile(testDigestItem1);

	entry.markDownloaded(testDigestItem1.id);
	expect(entry.digestState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() throws if provided with invalid ID', () => {
	const entry = new DownloadListItem(testDownloadItem1);

	expect(() => {
		entry.markDownloaded(-1);
	}).toThrow('invalid id to be marked downloaded -1 for /a/file (1)');
});

test('readyForVerification() returns true if both file and digest finished downloading', () => {
	const entry = new DownloadListItem(testDownloadItem1);
	entry.setDigestFile(testDigestItem1);

	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(testDigestItem1.id);
	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(testDownloadItem1.id);
	expect(entry.readyForVerification()).toBe(true);
	entry.digestState = DownloadState.downloading;
	expect(entry.readyForVerification()).toBe(false);
});

test('readyForVerification() returns true if both file finished downloading \
and digest is set manually', () => {
	const entry = new DownloadListItem(testDownloadItem1);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);

	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(testDownloadItem1.id);
	expect(entry.readyForVerification()).toBe(true);
});

test('serialize() returns object for consumption by vd-verifier (digestFile)', () => {
	const entry = new DownloadListItem(testDownloadItem1);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItemInitial.originalFilename);
	expect(res['input-file']).toEqual(downloadListItemInitial.inputFile);
	expect(res['digest-file']).toEqual(downloadListItemInitial.digestFile);
	expect(Object.keys(res).length).toEqual(3);
});

test('serialize() returns object for consumption by vd-verifier (hexStr digest)', () => {
	const entry = new DownloadListItem(testDownloadItem1);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItemInitial.originalFilename);
	expect(res['input-file']).toEqual(downloadListItemInitial.inputFile);
	expect(res['digest-file']).toBe(undefined);
	expect(res['digest-direct']).toEqual(hex);
	expect(Object.keys(res).length).toEqual(3);
});

test('setDigest() returns true if passed valid hex string', () => {
	const entry = new DownloadListItem(testDownloadItem1);

	const res = entry.setDigest('277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503');
	expect(res).toBe(true);
});

test('setDigest() returns false if passed hex string < 16', () => {
	const entry = new DownloadListItem(testDownloadItem1);

	const res = entry.setDigest('277c1b');
	expect(res).toBe(false);
});

test('setDigest() returns false if passed non-hex string', () => {
	const entry = new DownloadListItem(testDownloadItem1);

	const res = entry.setDigest('this is not a hex string!');
	expect(res).toBe(false);
});
