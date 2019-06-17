'use strict';

import {
	DownloadList,
	DownloadListItem,
	DownloadState
} from '../extension/downloadlist.js';

const testDownloadItem1 = {
	id: 1,
	url: 'https://url/f.ext',
	filename: '/a/file'
};
const testDigestId1 = 2;
const testDigestPath1 = '/a/digest';

const downloadListItem1 = {
	digestFile: '/a/digest',
	digestId: 2,
	digestState: DownloadState.downloading,
	id: 1,
	inputFile: '/a/file',
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

test('DownloadList can save & retrieve entry', () => {
	const list = new DownloadList(2);

	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);
	const retrieved = list.getByDownloadId(testDownloadItem1.id);
	expect(retrieved).toEqual(downloadListItem1);
});

test('getRegularDownload() returns undefined if key does not exist', () => {
	const list = new DownloadList(2);

	const retrieved = list.getByDownloadId(testDownloadItem1.id);
	expect(retrieved).toEqual(undefined);
});

test('getByDigestId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const digestParent = list.getByDigestId(testDigestId1);
	expect(digestParent).toEqual(downloadListItem1);
});

test('getByAnyId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const digestParent = list.getByAnyId(testDigestId1);
	const retrieved = list.getByAnyId(testDownloadItem1.id);
	expect(digestParent).toEqual(retrieved);
});

test('hasRegularDownload() returns true if RD exists', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const exists = list.hasRegularDownload(testDownloadItem1.id);
	expect(exists).toEqual(true);
});

test('hasRegularDownload() returns false if RD does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const exists = list.hasRegularDownload(-1);
	expect(exists).toEqual(false);
});

test('hasDigest() returns true if digest exists', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const exists = list.hasDigest(testDigestId1);
	expect(exists).toEqual(true);
});

test('hasDigest() returns false if digest does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);

	const exists = list.hasDigest(1);
	expect(exists).toEqual(false);
});

test('DownloadList discards oldest entries over capacity', () => {
	const list = new DownloadList(2);
	const testItem2 = Object.assign({}, testDownloadItem1);
	const testItem3 = Object.assign({}, testDownloadItem1);
	testItem2.id = 3;
	testItem3.id = 4;
	list.createEntry(testDownloadItem1, testDigestId1, testDigestPath1);
	list.createEntry(testItem2, testDigestId1, testDigestPath1);
	list.createEntry(testItem3, testDigestId1, testDigestPath1);

	expect(list.hasRegularDownload(testDownloadItem1.id))
		.toEqual(false);
	expect(list.hasRegularDownload(testItem2.id))
		.toEqual(true);
	expect(list.hasRegularDownload(testItem3.id))
		.toEqual(true);
});

//	DownloadListItem tests

test('markDownloaded() marks file downloaded if passed file ID', () => {
	const entry = new DownloadListItem(testDownloadItem1, testDigestId1, testDigestPath1);

	entry.markDownloaded(testDownloadItem1.id);
	expect(entry.inputFileState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() marks digest if passed digest ID', () => {
	const entry = new DownloadListItem(testDownloadItem1, testDigestId1, testDigestPath1);

	entry.markDownloaded(testDigestId1);
	expect(entry.digestState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() throws if provided with invalid ID', () => {
	const entry = new DownloadListItem(testDownloadItem1, testDigestId1, testDigestPath1);

	expect(() => {
		entry.markDownloaded(-1);
	}).toThrow('invalid id to be marked downloaded -1 for 1 (/a/file)');
});

test('readyForVerification() returns true iff both file and digest finished downloading', () => {
	const entry = new DownloadListItem(testDownloadItem1, testDigestId1, testDigestPath1);

	expect(entry.readyForVerification()).toBe(false);
	entry.digestState = DownloadState.downloaded;
	expect(entry.readyForVerification()).toBe(false);
	entry.inputFileState = DownloadState.downloaded;
	expect(entry.readyForVerification()).toBe(true);
	entry.digestState = DownloadState.downloading;
	expect(entry.readyForVerification()).toBe(false);
});

test('serializeEntry() returns object for consumption by vd-verifier', () => {
	const entry = new DownloadListItem(testDownloadItem1, testDigestId1, testDigestPath1);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItem1.originalFilename);
	expect(res['input-file']).toEqual(downloadListItem1.inputFile);
	expect(res['digest-file']).toEqual(downloadListItem1.digestFile);
	expect(Object.keys(res).length).toEqual(3);
});
