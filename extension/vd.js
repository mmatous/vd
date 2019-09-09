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

export async function matchFromList(fileUrl, list) {
	const pairings = list.split('\n');
	for (let pairing of pairings) {
		const p = pairing.split(' || ', 2);
		const raw = utils.toRaw(p[0]);
		const re = new RegExp(raw);
		const matches = re.exec(fileUrl);
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

async function regexListLookup(fileUrl) {
	try {
		const regexList = await addonSettings.get(constants.Settings.regexList);
		const lookup = await matchFromList(fileUrl, regexList);
		if (lookup) {
			return [ new URL(lookup) ];
		}
	} catch (err) {
		console.error(`Regex list lookup error: ${err}`);
	}
	return null;
}

export async function getDigestUrls(fileHref, urls, useRegexList = true) {
	if (useRegexList) {
		const lookup = await regexListLookup(fileHref);
		if (lookup) {
			return lookup;
		}
	}
	const singleFileSums = parsing.matchFileSumsLinks(fileHref, urls);
	return singleFileSums.length != 0 ? singleFileSums : parsing.matchAgregatedSumsLinks(urls);
}

export function handleInstalled() {
	app.versionRequest().catch(() => {
		const err = `vd-verifier is not working correctly.
Please ensure you have the latest version from ${constants.VD_VERIFIER_URL}`;
		utils.notifyUser(constants.Preset.error, err);
	});
}

export function selectSignature(signatureUrls) {
	// there should be at most one anyway
	// if not one sig file is likely not better than other
	return signatureUrls[0];
}

export function selectDigest(digests) {
	// todo: prioritize
	return digests[0];
}

export function registerDownload(downloadItem) {
	if (downloadList.empty()) {
		ctxMenus.createContextMenuParents();
	}
	ctxMenus.createContextMenuChildren(downloadItem.id, downloadItem.filename);
	return downloadList.createEntry(downloadItem);
}

export async function downloadSignatureForEntry(entry, signatureUrl) {
	const sigDownloadItem = await browserDownloadFile(signatureUrl);
	entry.setSignatureFile(sigDownloadItem);
	return sigDownloadItem;
}

export async function downloadDigestForEntry(entry, digestUrl) {
	const digestDownloadItem = await browserDownloadFile(digestUrl);
	entry.setDigestFile(digestDownloadItem);
}

export async function autodetectSignature(filename, urls, entry) {
	const signatureUrls = parsing.filterSignatureLinks(filename, urls);
	const signatureUrl = selectSignature(signatureUrls);
	if (!signatureUrl) {
		console.info(`No viable signature found for ${entry.inputFile} (${entry.id})`);
		return null;
	}
	let sigDownloadItem = await downloadSignatureForEntry(entry, signatureUrl);
	return sigDownloadItem.id;
}

async function autodetectDigest(filename, urls, entry) {
	const digestUrls = await getDigestUrls(filename, urls, true); // todo: load from settings
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
	const entry = registerDownload(downloadItem);
	try {
		const fileDir = parsing.getDirListingUrl(downloadItem.url);
		const dirListingHtml = await utils.get(fileDir);
		const filename = parsing.getFilename(downloadItem.url);
		const urls = parsing.getSameOriginLinks(dirListingHtml, fileDir);

		const signature = await autodetectSignature(filename, urls, entry);
		if (!signature) {
			await autodetectDigest(filename, urls, entry);
		}
		return entry;
	} catch (e) {
		await handleError(e, downloadItem);
	}
}

export async function browserDownloadFile(url) {
	try {
		const downloadId = await browser.downloads.download({
			url: url.href,
			saveAs: false,
		});
		let dItem = await browser.downloads.search({id: downloadId});
		return dItem[0];
	} catch (e) {
		throw Error(`unable to download ${url.href}: ${e}`);
	}
}

async function handleError(err, entry) {
	console.error(`${err.message}`);
	await cleanup(entry.digestId, entry.digestState);
	await cleanup(entry.signatureId, entry.signatureState);
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
	await cleanup(entry.digestId, entry.digestState);
	await cleanup(entry.signatureId, entry.signatureState);
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
	await cleanup(entry.digestId, entry.digestState);
	await cleanup(entry.signatureId, entry.signatureState);
	ctxMenus.deleteContextMenu(entry.id);
}

export function handleDownloadChanged(delta) {
	if (delta.state && delta.state.current === 'complete') {
		handleDownloadFinished(delta);
	} else if (delta.state && delta.state.current === 'interrupted') {
		handleDownloadInterrupted(delta);
	}
}

export async function cleanup(id, state) {
	if (state === DownloadState.downloaded) {
		browser.downloads.removeFile(id)
			.catch(error => console.warn(`Unable to remove file: ${error}`));
	} else if (state === DownloadState.downloading) {
		browser.downloads.cancel(id)
			.catch(error => console.warn(`Unable to cancel download: ${error}`));
	}
	if (id) {
		browser.downloads.erase({id: id})
			.catch(error => console.warn(`Unable to remove from downloads: ${error}`));
	}
	// do not delete from downloadList, it will be dropped when capacity overflows
}

