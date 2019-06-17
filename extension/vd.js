'use strict';

import { DownloadList, DownloadState } from './downloadlist.js';
import {
	getFilename,
	getFileDir,
	getSameOriginLinks,
	matchFileSumsLinks,
	matchAgregatedSumsLinks
} from './parsing.js';
import { Preset, RememberDownloads } from './constants.js';

export const downloadList = new DownloadList(RememberDownloads);

export function shouldBeIgnored(downloadItem) {
	return downloadItem.url.endsWith('#vd-ignore');
	/*
	horrible hack, until FF69 https://bugzilla.mozilla.org/show_bug.cgi?id=1305663
	the following (or ID equiv) is not possible
	return downloadItem.byExtensionName && downloadItem.byExtensionName == 'vd';
	*/
}

function notifyUser(preset, message) {
	const options = {
		iconUrl: browser.runtime.getURL(preset.iconUrl),
		message: message,
		title: preset.title,
		type: 'basic'
	};
	browser.notifications.create(options);
}

export async function get(url) {
	try {
		const response = await fetch(url, { method: 'GET' });
		if (response.ok) {
			return response.text();
		} else {
			throw Error(response.statusText);
		}
	} catch(e) {
		throw Error(`failed fetch() for ${url}: ${e}`);
	}
}

export async function getDigestUrls(url) {
	const filename = getFilename(url.href);
	const fileDir = getFileDir(url.href);
	const responseText = await get(fileDir);
	const urls = getSameOriginLinks(responseText, fileDir);
	const singleFileSums = matchFileSumsLinks(filename, urls);
	return singleFileSums.length != 0 ? singleFileSums : matchAgregatedSumsLinks(urls);
}

export function selectDigest(digests) {
	return digests[0];
}

export function createListEntry(downloadItem, digestItem) {
	return downloadList.createEntry(downloadItem, digestItem.id, digestItem.filename);

}

export async function handleDownloadCreated(downloadItem) {
	if (shouldBeIgnored(downloadItem)) {
		return;
	}
	try {
		const digestUrls = await getDigestUrls(new URL(downloadItem.url));
		const digest = selectDigest(digestUrls);
		if (!digest) {
			console.info(`No viable digest found for ${downloadItem.filename} (${downloadItem.id})`);
			return;
		}
		const digestDownloadItem = await downloadDigest(digest);
		return createListEntry(downloadItem, digestDownloadItem);
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

async function handleError(err, entry) { //todo: pass through whole entry
	console.error(`${err}`);
	await cleanup(entry);
	notifyUser(Preset.error, err);
}


function handleResponse(response, filePath) {
	if (response.verdict) {
		switch (response.verdict) {
		case 'i':
			console.info(`integrity verified - ${filePath}`);
			notifyUser(Preset.integrity, filePath);
			break;
		case 'a':
			console.info(`authenticity verified - ${filePath}`);
			notifyUser(Preset.authenticity, filePath);
			break;
		default:
			console.info(`verification failed - ${filePath}`);
			notifyUser(Preset.fail, filePath);
		}
	} else if (response.error) {
		console.error(response.error);
		notifyUser(Preset.error, filePath);
	}

}

async function sendToNativeApp(entry) {
	const serialized = entry.serialize();
	try {
		const response = await browser.runtime.sendNativeMessage('io.github.vd', serialized);
		console.info(`native app responded: ${JSON.stringify(response, null, '\t')}`);
		handleResponse(response, entry.inputFile);
		await cleanup(entry);
	} catch (e) {
		throw Error(`unable to communicate with vd application: ${e}`);
	}
}

async function handleDownloadFinished(delta) {
	const entry = downloadList.getByAnyId(delta.id);
	if (!entry) {
		return;
	}
	entry.markDownloaded(delta.id);
	if (entry.readyForVerification()) {
		try {
			await sendToNativeApp(entry);
		} catch (e) {
			handleError(e, entry);
		}
	}
}

async function handleDownloadInterrupted(delta) {
	if (downloadList.hasDigest(delta.id)) {
		console.warn(`digest download ${delta.id} interrupted, deleting entries`);
	} else if (downloadList.hasRegularDownload(delta.id)) {
		console.warn(`download ${delta.id} interrupted, deleting entries`);
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
	} else {
		browser.downloads.cancel(entry.digestId)
			.catch(error => console.warn(`unable to cancel download: ${error}`));
	}
	browser.downloads.erase({id: entry.digestId})
		.catch(error => console.warn(`unable to remove from downloads: ${error}`));
	// do not delete entry from downloadList, it will be dropped when capacity overflows
}

