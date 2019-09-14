'use strict';

import {
	DownloadList,
	DownloadListItem,
	DownloadState
} from '../extension/downloadlist.js';
import * as browser from 'sinon-chrome/webextensions';
import * as helpers from './helpers.js';

beforeAll(() => {
	window.browser = browser;
});

beforeEach(() => {
	browser.flush();
});

const downloadListItemInitial = {
	digestFile: null,
	digestHex: null,
	digestId: null,
	digestState: DownloadState.unknown,
	id: helpers.testDownloadItem.id,
	inputFile: helpers.testDownloadItem.filename,
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

const downloadListItemWithDigestFile = {
	digestFile: helpers.testDigestItem.filename,
	digestHex: null,
	digestId: helpers.testDigestItem.id,
	digestState: DownloadState.downloading,
	id: downloadListItemInitial.id,
	inputFile: downloadListItemInitial.inputFile,
	inputFileState: DownloadState.downloading,
	originalFilename: downloadListItemInitial.originalFilename,
};

test('DownloadList can save & retrieve entry', () => {
	const list = new DownloadList(2);

	list.createEntry(helpers.testDownloadItem);
	const retrieved = list.getByDownloadId(helpers.testDownloadItem.id);
	expect(retrieved).toEqual(expect.objectContaining(downloadListItemInitial));
});

test('Fresh DownloadList is empty', () => {
	const list = new DownloadList(2);
	expect(list.empty()).toEqual(true);
});

test('Fresh DownloadList with entry is not empty', () => {
	const list = new DownloadList(2);
	list.createEntry(helpers.testDownloadItem);
	expect(list.empty()).toEqual(false);
});

test('getRegularDownload() returns undefined if key does not exist', () => {
	const list = new DownloadList(2);

	const retrieved = list.getByDownloadId(helpers.testDownloadItem.id);
	expect(retrieved).toEqual(undefined);
});

test('getByDigestId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(helpers.testDownloadItem);
	res.setDigestFile(helpers.testDigestItem);

	const digestParent = list.getByDigestId(helpers.testDigestItem.id);
	expect(digestParent).toEqual(expect.objectContaining(downloadListItemWithDigestFile));
});

test('getByAnyId() retrieves correct entry', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(helpers.testDownloadItem);
	res.setDigestFile(helpers.testDigestItem);
	res.setSignatureFile(helpers.testSigItem);

	const digestParent = list.getByAnyId(helpers.testDigestItem.id);
	const retrievedByDigest = list.getByAnyId(helpers.testDownloadItem.id);
	const retrievedBySig = list.getByAnyId(helpers.testSigItem.id);
	expect(digestParent).toBe(retrievedByDigest);
	expect(retrievedByDigest).toBe(retrievedBySig);
});

test('hasRegularDownload() returns true if RD exists', () => {
	const list = new DownloadList(2);
	list.createEntry(helpers.testDownloadItem);

	const exists = list.hasRegularDownload(helpers.testDownloadItem.id);
	expect(exists).toEqual(true);
});

test('hasRegularDownload() returns false if RD does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(helpers.testDownloadItem);

	const exists = list.hasRegularDownload(-1);
	expect(exists).toEqual(false);
});

test('hasDigest() returns true if digest exists', () => {
	const list = new DownloadList(2);
	const res = list.createEntry(helpers.testDownloadItem);
	res.setDigestFile(helpers.testDigestItem);

	const exists = list.hasDigest(helpers.testDigestItem.id);
	expect(exists).toEqual(true);
});

test('hasDigest() returns false if digest does not exist', () => {
	const list = new DownloadList(2);
	list.createEntry(helpers.testDownloadItem);

	const exists = list.hasDigest(helpers.testDigestItem.id);
	expect(exists).toEqual(false);
});

test('DownloadList discards oldest entries over capacity', () => {
	const list = new DownloadList(2);
	const testItem2 = Object.assign({}, helpers.testDownloadItem);
	const testItem3 = Object.assign({}, helpers.testDownloadItem);
	testItem2.id = 3;
	testItem3.id = 4;
	list.createEntry(helpers.testDownloadItem);
	list.createEntry(testItem2);
	list.createEntry(testItem3);

	expect(list.hasRegularDownload(helpers.testDownloadItem.id))
		.toEqual(false);
	expect(list.hasRegularDownload(testItem2.id))
		.toEqual(true);
	expect(list.hasRegularDownload(testItem3.id))
		.toEqual(true);
});

//	DownloadListItem tests

test('markDownloaded() marks file downloaded if passed file ID', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);

	entry.markDownloaded(helpers.testDownloadItem.id);
	expect(entry.inputFileState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() marks digest if passed digest ID', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setDigestFile(helpers.testDigestItem);

	entry.markDownloaded(helpers.testDigestItem.id);
	expect(entry.digestState).toEqual(DownloadState.downloaded);
});

test('markDownloaded() marks signature if passed signature ID', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setSignatureFile(helpers.testSigItem);

	entry.markDownloaded(helpers.testSigItem.id);
	expect(entry.signatureState).toBe(DownloadState.downloaded);
});

test('markDownloaded() throws if provided with invalid ID', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);

	expect(() => {
		entry.markDownloaded(-1);
	}).toThrow('Invalid id to be marked downloaded -1 for /a/verifiable.file (1)');
});

test('readyForVerification() returns true if both file and digest finished downloading', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setDigestFile(helpers.testDigestItem);

	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(helpers.testDigestItem.id);
	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(helpers.testDownloadItem.id);
	expect(entry.readyForVerification()).toBe(true);
	entry.digestState = DownloadState.downloading;
	expect(entry.readyForVerification()).toBe(false);
});

test('readyForVerification() returns true if file finished and digest is set manually', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);

	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(helpers.testDownloadItem.id);
	expect(entry.readyForVerification()).toBe(true);
});

test('readyForVerification() returns true if both file and signature finished downloading', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setSignatureFile(helpers.testSigItem);

	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(helpers.testSigItem.id);
	expect(entry.readyForVerification()).toBe(false);
	entry.markDownloaded(helpers.testDownloadItem.id);
	expect(entry.readyForVerification()).toBe(true);
	entry.signatureState = DownloadState.downloading;
	expect(entry.readyForVerification()).toBe(false);
});

test('serialize() returns object for consumption by vd-verifier (digestFile)', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setDigestFile(helpers.testDigestItem);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItemInitial.originalFilename);
	expect(res['input-file']).toEqual(downloadListItemInitial.inputFile);
	expect(res['digest-file']).toEqual(downloadListItemWithDigestFile.digestFile);
	expect(Object.keys(res).length).toEqual(3);
});

test('serialize() returns object for consumption by vd-verifier (hexStr digest)', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	const hex = '277c1bfe069a889eb752d3c630db34310102b2bb2f0c0ff11cf4246e333b3503';
	entry.setDigest(hex);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItemInitial.originalFilename);
	expect(res['input-file']).toEqual(downloadListItemInitial.inputFile);
	expect(res['digest-direct']).toEqual(hex);
	expect(Object.keys(res).length).toEqual(3);
});

test('serialize() returns object for consumption by vd-verifier (detached signature)', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	entry.setSignatureFile(helpers.testSigItem);
	const res = entry.serialize();

	expect(res['original-filename']).toEqual(downloadListItemInitial.originalFilename);
	expect(res['input-file']).toEqual(downloadListItemInitial.inputFile);
	expect(res['signature-file']).toEqual(helpers.testSigItem.filename);
});

test('serialize() throws if no field for verification present', () => {
	const entry = new DownloadListItem(helpers.testDownloadItem);
	expect(() => entry.serialize()).toThrow();
});