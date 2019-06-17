'use strict;';

import { getFilename } from './parsing.js';

export const DownloadState = Object.freeze(
	{unknown: 1, downloading: 2, downloaded: 3, noexist: 4}
);

export class DownloadList {
	// #capacity; todo: switch to private fields eventually
	// #regularDownloads;
	// #digestPairings;

	constructor(capacity) {
		this.capacity = capacity;
		this.downloads = new Array();
	}

	createEntry(downloadItem, digestId, digestPath) {
		const newEntry = new DownloadListItem(downloadItem, digestId, digestPath);
		// no duplicity check, download IDs are guaranteed to be unique
		this.downloads.push(newEntry);
		this.trimDownloadList();
		return newEntry;
	}

	getByDownloadId(key) {
		return this.downloads.find((listItem) => {
			return listItem.id === key;
		});
	}

	getByDigestId(key) {
		return this.downloads.find((listItem) => {
			return listItem.digestId === key;
		});
	}

	// digest & regular download IDs are guaranteed not to overlap
	getByAnyId(key) {
		return this.downloads.find((listItem) => {
			return listItem.id === key || listItem.digestId === key;
		});
	}

	hasRegularDownload(key) {
		return this.downloads.some((listItem) => {
			return listItem.id === key;
		});
	}

	hasDigest(key) {
		return this.downloads.some((listItem) => {
			return listItem.digestId === key;
		});
	}

	trimDownloadList() {
		this.downloads.splice(0, this.downloads.length - this.capacity);
	}
}

export class DownloadListItem {

	constructor(downloadItem, digestId, digestPath) {
		this.digestId = digestId;
		this.digestFile = digestPath;
		this.digestState = DownloadState.downloading;
		this.id = downloadItem.id;
		this.inputFile = downloadItem.filename; //is absolute path
		this.inputFileState = DownloadState.downloading;
		this.originalFilename = getFilename(downloadItem.url);
	}

	readyForVerification() {
		return this.inputFileState === DownloadState.downloaded
			&& this.digestState === DownloadState.downloaded;
	}

	markDownloaded(id) {
		if (this.id === id) {
			this.inputFileState = DownloadState.downloaded;
		} else if (this.digestId === id) {
			this.digestState = DownloadState.downloaded;
		} else {
			throw Error(`invalid id to be marked downloaded ${id} for ${this.id} (${this.inputFile})`);
		}
	}

	serialize() {
		const res = {};
		res['original-filename'] = this.originalFilename;
		res['input-file'] = this.inputFile;
		res['digest-file'] = this.digestFile;
		return res;
	}
}