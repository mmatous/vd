'use strict;';

import { Preset } from './constants.js';
import { getFilename } from './parsing.js';
import { isDigestString, notifyUser } from './utils.js';

export const DownloadState = Object.freeze(
	{unknown: 1, downloading: 2, downloaded: 3, noexist: 4, assignedManually: 5}
);

export class DownloadList {

	constructor(capacity, deleteItemCb) {
		this.capacity = capacity;
		this.downloads = new Array();
		this.deleteItemCb = deleteItemCb;
	}

	createEntry(downloadItem) {
		const newEntry = new DownloadListItem(downloadItem);
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
		const deleted = this.downloads.splice(0, this.downloads.length - this.capacity);
		if (this.deleteItemCb) {
			for (const item of deleted) {
				this.deleteItemCb(item.id);
			}
		}
	}

	empty() {
		return this.downloads.length === 0;
	}
}

export class DownloadListItem {

	constructor(downloadItem) {
		this.digestId = null;
		this.digestFile = null;
		this.digestHex = null;
		this.digestState = DownloadState.unknown;
		this.id = downloadItem.id;
		this.inputFile = downloadItem.filename; //is absolute path
		this.inputFileState = DownloadState.downloading;
		this.originalFilename = getFilename(downloadItem.url);
	}

	bothFilesDownloaded() {
		return this.inputFileState === DownloadState.downloaded
			&& this.digestState === DownloadState.downloaded;
	}

	fileDownloadedDigestManual() {
		return this.inputFileState === DownloadState.downloaded
			&& this.digestHex !== null;
	}

	readyForVerification() {
		return this.bothFilesDownloaded() || this.fileDownloadedDigestManual();
	}

	markDownloaded(id) {
		if (this.id === id) {
			this.inputFileState = DownloadState.downloaded;
		} else if (this.digestId === id) {
			this.digestState = DownloadState.downloaded;
		} else {
			throw Error(`invalid id to be marked downloaded ${id} for ${this.inputFile} (${this.id})`);
		}
	}

	serialize() {
		const res = {};
		res['original-filename'] = this.originalFilename;
		res['input-file'] = this.inputFile;
		if (this.digestFile) {
			res['digest-file'] = this.digestFile;
		} else {
			res['digest-direct'] = this.digestHex;
		}
		return res;
	}

	setDigest(hexString) {
		if (!isDigestString(hexString)) {
			const line = `${hexString} is not a valid digest string`;
			console.info(line);
			notifyUser(Preset.error, line);
			return false;
		}
		this.digestFile = null;
		this.digestHex = hexString;
		this.digestId = null;
		this.digestState = DownloadState.assignedManually;
		return true;
	}

	setDigestFile(digestDownloadItem) {
		this.digestFile = digestDownloadItem.filename;
		this.digestHex = null;
		this.digestId = digestDownloadItem.id;
		this.digestState = DownloadState.downloading;
		return true;
	}
}
