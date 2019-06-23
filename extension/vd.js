'use strict';

import { Preset, RememberDownloads } from './constants.js';
import {
	createContextMenuChildren,
	createContextMenuParents,
	deleteContextMenu
} from './contextmenus.js';
import { DownloadList, DownloadState } from './downloadlist.js';
import {
	getFilename,
	getFileDirUrl,
	getSameOriginLinks,
	matchFileSumsLinks,
	matchAgregatedSumsLinks
} from './parsing.js';
import { get, notifyUser } from './utils.js';

export const downloadList = new DownloadList(RememberDownloads, deleteContextMenu);

export function shouldBeIgnored(downloadItem) {
	return downloadItem.url.endsWith('#vd-ignore');
	/*
	horrible hack, until FF69 https://bugzilla.mozilla.org/show_bug.cgi?id=1305663
	the following (or ID equiv) is not possible
	return downloadItem.byExtensionName && downloadItem.byExtensionName == 'vd';
	*/
}

export async function getDigestUrls(url) {
	const filename = getFilename(url.href);
	const fileDir = getFileDirUrl(url.href);
	const responseText = await get(fileDir);
	const urls = getSameOriginLinks(responseText, fileDir);
	const singleFileSums = matchFileSumsLinks(filename, urls);
	return singleFileSums.length != 0 ? singleFileSums : matchAgregatedSumsLinks(urls);
}

export function selectDigest(digests) {
	return digests[0];
}

export function createListEntry(downloadItem) {
	if (downloadList.empty()) {
		createContextMenuParents();
	}
	createContextMenuChildren(downloadItem);
	return downloadList.createEntry(downloadItem);
}

export async function downloadDigestForEntry(entry, digestUrl) {
	const digestDownloadItem = await downloadDigest(digestUrl);
	entry.setDigestFile(digestDownloadItem);
}

async function autodetectDigest(originalUrl, entry) {
	const digestUrls = await getDigestUrls(originalUrl);
	const digest = selectDigest(digestUrls);
	if (!digest) {
		console.info(`No viable digest found for ${entry.inputFile} (${entry.id})`);
		return;
	}
	await downloadDigestForEntry(entry, digest);
}

export async function handleDownloadCreated(downloadItem) {
	if (shouldBeIgnored(downloadItem)) {
		return;
	}
	const entry = createListEntry(downloadItem);
	try {
		await autodetectDigest(new URL(downloadItem.url), entry);
		return entry;
	} catch (e) {
		await handleError(e, downloadItem);
	}
}

export async function downloadDigest(url) {
	try {
		const downloadId = await browser.downloads.download({
			url: url.href + '#vd-ignore', // horrible hack, see shouldBeIgnored() for reason
			saveAs: false,
		});
		let dItem = await browser.downloads.search({id: downloadId});
		dItem = dItem[0];
		return dItem;
	} catch (e) {
		throw Error(`unable to download digest ${url.href}: ${e}`);
	}
}

async function handleError(err, entry) {
	console.error(`${err}`);
	await cleanup(entry);
	await notifyUser(Preset.error, err);
}

async function handleVerdict(verdict, filePath) {
	switch (verdict) {
	case 'i':
		console.info(`integrity verified - ${filePath}`);
		await notifyUser(Preset.integrity, filePath);
		break;
	case 'a':
		console.info(`authenticity verified - ${filePath}`);
		await notifyUser(Preset.authenticity, filePath);
		break;
	default:
		console.info(`verification failed - ${filePath}`);
		await notifyUser(Preset.fail, filePath);
	}
}

async function handleResponse(response, filePath) {
	if (response.verdict) {
		handleVerdict(response.verdict, filePath);
	} else if (response.error) {
		console.error(response.error);
		await notifyUser(Preset.error, `${response.error}: ${filePath}`);
	} else {
		throw Error(`invalid response ${JSON.stringify(response)}`);
	}
}

async function sendToNativeApp(entry) {
	const serialized = entry.serialize();
	try {
		const response = await browser.runtime.sendNativeMessage('io.github.vd', serialized);
		console.info(`native app responded: ${JSON.stringify(response, null, '\t')}`);
		await handleResponse(response, entry.inputFile);
	} catch (e) {
		throw Error(`unable to communicate with vd application: ${e}`);
	}
	await cleanup(entry);
}

async function handleDownloadFinished(delta) {
	const entry = downloadList.getByAnyId(delta.id);
	if (!entry) {
		return;
	}
	entry.markDownloaded(delta.id);
	await sendIfReady(entry);
}

export async function sendIfReady(entry) {
	if (!entry.readyForVerification()) {
		return;
	}
	try {
		await sendToNativeApp(entry);
	} catch (e) {
		await handleError(e, entry);
	}
}

async function handleDownloadInterrupted(delta) {
	if (downloadList.hasDigest(delta.id)) {
		console.warn(`digest download ${delta.id} interrupted, deleting entries`);
	} else if (downloadList.hasRegularDownload(delta.id)) {
		console.warn(`download ${delta.id} interrupted, deleting entries`);
	} else {
		console.warn(`unrecorded download (${delta.id}) interrupted`);
		return;
	}
	const entry = downloadList.getByAnyId(delta.id);
	await cleanup(entry);
}

export function handleDownloadChanged(delta) {
	if (delta.state && delta.state.current === 'complete') {
		handleDownloadFinished(delta);
	} else if (delta.state && delta.state.current === 'interrupted') {
		handleDownloadInterrupted(delta);
	}
}

export async function cleanup(entry) {
	if (entry.digestState === DownloadState.downloaded) {
		browser.downloads.removeFile(entry.digestId)
			.catch(error => console.warn(`unable to remove file: ${error}`));
	} else if (entry.digestState === DownloadState.downloading) {
		browser.downloads.cancel(entry.digestId)
			.catch(error => console.warn(`unable to cancel download: ${error}`));
	}
	if (entry.digestId) {
		browser.downloads.erase({id: entry.digestId})
			.catch(error => console.warn(`unable to remove from downloads: ${error}`));
	}
	// do not delete entry from downloadList, it will be dropped when capacity overflows
}
