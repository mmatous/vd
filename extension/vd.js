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

export async function matchHref(fileHref, list) {
	const pairings = list.split('\n');
	for (let pairing of pairings) {
		const p = pairing.split(' || ', 2);
		const raw = utils.toRaw(p[0]);
		const re = new RegExp(raw);
		const matches = re.exec(fileHref);
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

async function rulesListLookup(fileHref, setting) {
	try {
		const rulesList = await addonSettings.get(setting);
		const lookup = await matchHref(fileHref, rulesList);
		if (lookup) {
			return new URL(lookup);
		}
	} catch (err) {
		console.error(`Rules list lookup error: ${err}`);
	}
	return null;
}

export async function getDigestUrls(fileHref, urls) {
	const filename = parsing.getFilename(fileHref);
	const singleFileSums = parsing.filterFileSumsLinks(filename, urls);
	return singleFileSums.length != 0 ? singleFileSums : parsing.filterAgregatedSumsLinks(urls);
}

export function handleInstalled() {
	app.versionRequest().catch(() => {
		const err = browser.i18n.getMessage('versionRequestError');
		utils.notifyUser(browser.i18n.getMessage('errorEncountered'), err);
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

export async function downloadSignatureForEntry(entry, signatureUrl, signedDataKind) {
	const sigDownloadItem = await browserDownloadFile(signatureUrl);
	entry.setSignatureFile(sigDownloadItem, signedDataKind);
	return sigDownloadItem;
}

export async function downloadDigestForEntry(entry, digestUrl) {
	const digestDownloadItem = await browserDownloadFile(digestUrl);
	entry.setDigestFile(digestDownloadItem);
	return digestDownloadItem;
}

export async function autodetectSignature(filename, urls, entry, signedDataKind) {
	const signatureUrls = parsing.filterSignatureLinks(filename, urls);
	const signatureUrl = selectSignature(signatureUrls);
	if (!signatureUrl) {
		console.info(`No viable signature found for ${entry.inputFile}`);
		return null;
	}
	return downloadSignatureForEntry(entry, signatureUrl, signedDataKind);
}

export async function autodetectDigest(fileHref, urls, entry) {
	const digestUrls = await getDigestUrls(fileHref, urls);
	const digestUrl = selectDigest(digestUrls);
	if (!digestUrl) {
		console.info(`No viable digest found for ${entry.inputFile}`);
		return null;
	}
	return downloadDigestForEntry(entry, digestUrl);
}

async function tryLookups(fileHref, entry) {
	const sigUrl = await rulesListLookup(fileHref, constants.Settings.signatureRules);
	if (sigUrl) {
		return downloadSignatureForEntry(entry, sigUrl, constants.SignedData.data);
	} else {
		const digestUrl = await rulesListLookup(fileHref, constants.Settings.digestRules);
		if (digestUrl) {
			return downloadDigestForEntry(entry, digestUrl);
		}
	}
	return null;
}

async function tryAutodetect(filename, fileDir, entry) {
	const dirListingHtml = await utils.get(fileDir);
	const urls = parsing.getSameOriginLinks(dirListingHtml, fileDir);

	const signatureItem = await autodetectSignature(filename, urls, entry, constants.SignedData.data);
	// temporary && until signatures are supported on Win
	if (signatureItem && navigator.platform.indexOf('Win') < 0) {
		return true;
	}
	const digestItem = await autodetectDigest(filename, urls, entry);
	if (digestItem) {
		const digestFilename = parsing.getFilename(digestItem.url);
		await autodetectSignature(digestFilename, urls, entry, constants.SignedData.digest);
		return true;
	}
	return false;
}

export async function handleDownloadCreated(downloadItem) {
	if (shouldBeIgnored(downloadItem)) {
		return;
	}
	const entry = registerDownload(downloadItem);

	let res = null;
	try {
		res = await tryLookups(downloadItem.url, entry);
		if (res) {
			return true;
		}
	} catch (err) {
		await handleError(err, downloadItem);
	}

	const useAutodetect = await addonSettings.get(constants.Settings.useAutodetect);
	if (!useAutodetect) { return false; }
	const filename = parsing.getFilename(downloadItem.url);
	const fileDir = parsing.getDirListingUrl(downloadItem.url);
	try {
		res = await tryAutodetect(filename, fileDir, entry);
		if (res) {
			return true;
		}
	} catch (err) {
		await handleError(err, downloadItem);
	}

	console.info(`No verification files detected for ${downloadItem.url}`);
	return false;
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
		throw Error(`Unable to download ${url.href}: ${e}`);
	}
}

async function handleError(err, entry) {
	console.error(`${err.message}`);
	await cleanup(entry.digestId, entry.digestState);
	await cleanup(entry.signatureId, entry.signatureState);
	await utils.notifyUser(browser.i18n.getMessage('errorEncountered'), err.message);
}

async function handleDownloadFinished(delta) {
	const entry = downloadList.getByAnyId(delta.id);
	if (!entry) {
		return;
	}
	entry.markDownloaded(delta.id);
	await sendReady(entry);
}

export async function sendReady(entry) {
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
	const entry = downloadList.getByAnyId(delta.id);
	if (!entry) {
		console.warn(`Unrecorded download (${delta.id}) interrupted`);
		return;
	}
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

