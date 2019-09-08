'use strict';

import * as addonSettings
	from './3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as constants from './constants.js';
import * as ctxMenus from './contextmenus.js';
import {
	DownloadList,
	DownloadState
} from './downloadlist.js';
import * as parsing from './parsing.js';
import * as utils from './utils.js';
import * as app from './app.js';

export const downloadList = new DownloadList(constants.REMEMBER_DOWNLOADS, ctxMenus.deleteContextMenu);

export function shouldBeIgnored(downloadItem) {
	return downloadItem.byExtensionId === 'vd@vd.io';
}

export async function matchFromList(url, list) {
	const pairings = list.split('\n');
	for (let pairing of pairings) {
		const p = pairing.split(' || ', 2);
		const raw = utils.toRaw(p[0]);
		const re = new RegExp(raw);
		const matches = re.exec(url.href);
		if (matches) {
			// start from 1, matches[0] is the full match
			for (let group = 1; group < matches.length; group++) {
				const match = matches[group];
				const replaceRe = String.raw`\$\|${group}\|`;
				p[1] = p[1].replace(new RegExp(replaceRe, 'g'), match);
			}
			return p[1];
		}
	}
	return null;
}

async function regexListLookup(url) {
	try {
		const regexList = await addonSettings.get(constants.Settings.regexList);
		const lookup = await matchFromList(url, regexList);
		if (lookup) {
			return [ new URL(lookup) ];
		}
	} catch (err) {
		console.error(`Regex list lookup error: ${err}`);
	}
	return null;
}

export async function getDigestUrls(fileUrl, useRegexList = true) {
	if (useRegexList) {
		const lookup = await regexListLookup(fileUrl);
		if (lookup) {
			return lookup;
		}
	}
	const filename = parsing.getFilename(fileUrl.href);
	const fileDir = parsing.getDirListingUrl(fileUrl.href);
	const responseText = await utils.get(fileDir);
	const urls = parsing.getSameOriginLinks(responseText, fileDir);
	const singleFileSums = parsing.matchFileSumsLinks(filename, urls);
	return singleFileSums.length != 0 ? singleFileSums : parsing.matchAgregatedSumsLinks(urls);
}

export function handleInstalled() {
	app.versionRequest().catch(() => {
		const err = `vd-verifier is not working correctly.
Please ensure you have the latest version from ${constants.VD_VERIFIER_URL}`;
		utils.notifyUser(constants.Preset.error, err);
	});
}

export function selectDigest(digests) {
	return digests[0];
}

export function createListEntry(downloadItem) {
	if (downloadList.empty()) {
		ctxMenus.createContextMenuParents();
	}
	ctxMenus.createContextMenuChildren(downloadItem.id, downloadItem.filename);
	return downloadList.createEntry(downloadItem);
}

export async function downloadDigestForEntry(entry, digestUrl) {
	const digestDownloadItem = await downloadDigest(digestUrl);
	entry.setDigestFile(digestDownloadItem);
}

async function autodetectDigest(originalUrl, entry) {
	const digestUrls = await getDigestUrls(originalUrl, true); // todo: load from settings
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
			url: url.href,
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
	await utils.notifyUser(constants.Preset.error, err.message);
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
		return false;
	}
	try {
		await app.sendToNativeApp(entry);
	} catch (e) {
		await handleError(e, entry);
		return false;
	}
	await cleanup(entry);
	return true;
}

async function handleDownloadInterrupted(delta) {
	if (downloadList.hasDigest(delta.id)) {
		console.warn(`Digest download ${delta.id} interrupted, deleting entries`);
	} else if (downloadList.hasRegularDownload(delta.id)) {
		console.warn(`Download ${delta.id} interrupted, deleting entries`);
	} else {
		console.warn(`Unrecorded download (${delta.id}) interrupted`);
		return;
	}
	const entry = downloadList.getByAnyId(delta.id);
	await cleanup(entry);
	ctxMenus.deleteContextMenu(entry.id);
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
			.catch(error => console.warn(`Unable to remove file: ${error}`));
	} else if (entry.digestState === DownloadState.downloading) {
		browser.downloads.cancel(entry.digestId)
			.catch(error => console.warn(`Unable to cancel download: ${error}`));
	}
	if (entry.digestId) {
		browser.downloads.erase({id: entry.digestId})
			.catch(error => console.warn(`Unable to remove from downloads: ${error}`));
	}
	// do not delete entry from downloadList, it will be dropped when capacity overflows
}

