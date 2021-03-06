'use strict;';

import { getFilename } from './parsing.js';
import { isDigestString, notifyUser } from './utils.js';
import VdError from './vd-error.js';
import { DownloadState } from '../src/constants.js';

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
			return listItem.id === key || listItem.digestId === key || listItem.signatureId === key;
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
		this.originalFilename = decodeURIComponent(getFilename(downloadItem.url));

		this.signatureId = null;
		this.signatureFile = null;
		this.signatureState = DownloadState.unknown;
		this.signedDataKind = null;
	}

	downloadedWithDigest() {
		return this.inputFileState === DownloadState.downloaded
			&& this.digestState === DownloadState.downloaded;
	}

	fileDownloadedDigestManual() {
		return this.inputFileState === DownloadState.downloaded
			&& this.digestHex !== null;
	}

	downloadedWithSignature() {
		return this.inputFileState === DownloadState.downloaded
			&& this.signatureState === DownloadState.downloaded;
	}

	readyForVerification() {
		return this.downloadedWithDigest()
			|| this.fileDownloadedDigestManual()
			|| this.downloadedWithSignature();
	}

	markDownloaded(id) {
		switch (id) {
		case this.id:
			this.inputFileState = DownloadState.downloaded;
			break;
		case this.digestId:
			this.digestState = DownloadState.downloaded;
			break;
		case this.signatureId:
			this.signatureState = DownloadState.downloaded;
			break;
		default:
			throw new VdError(false, `Invalid id to be marked downloaded ${id} for ${this.inputFile} (${this.id})`);
		}
	}

	serialize() {
		const res = {};
		res['original-filename'] = this.originalFilename;
		res['input-file'] = this.inputFile;
		if (this.digestFile) {
			res['digest-file'] = this.digestFile;
		} else if (this.digestHex) {
			res['digest-direct'] = this.digestHex;
		}
		if (this.signatureFile) {
			res['signature-file'] = this.signatureFile;
			res['signed-data'] = this.signedDataKind;
		}
		if ((!this.digestFile && !this.digestHex) && !this.signatureFile) {
			throw new VdError(false, `Entry unfit to be sent: ${JSON.stringify(this)}`);
		}
		return res;
	}

	setDigest(hexString) {
		hexString = hexString.trim();
		if (!isDigestString(hexString)) {
			const line = `${hexString} is not a valid digest string`;
			console.info(line);
			notifyUser(browser.i18n.getMessage('errorEncountered'), line);
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
	}

	setSignatureFile(sigDownloadItem, signedDataKind) {
		this.signatureId = sigDownloadItem.id;
		this.signatureFile = sigDownloadItem.filename;
		this.signatureState = DownloadState.downloading;
		this.signedDataKind = signedDataKind;
	}
}
