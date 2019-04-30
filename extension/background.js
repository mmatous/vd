/*******************************************************************************
	vd — a browser extension to verify downloads.
	Copyright © 2019 Martin Matous
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/******************************************************************************/
/******************************************************************************/

/* eslint-disable no-console */
/* global browser */
'use strict';

const DownloadState = Object.freeze({'unknown': 1, 'downloading': 2, 'downloaded': 3, 'noexist': 4});
const Preset = Object.freeze({
	'normal': {icon: '../icon/vd-normal.svg', message: ''},
	'error': {icon: '../icon/vd-error.svg', message: ' — error encountered'},
	'fail': {icon: '../icon/vd-fail.svg',  message: ' — verification failed'},
	'integrity': {icon: '../icon/vd-integrity.svg', message: ' — integrity verified'},
	'authenticity': {icon: '../icon/vd-authenticity.svg', message: ' — authenticity verified'}
});

const records = new Map();
const digests = new Map();
const parser = new DOMParser();

function updateIcon(preset) {
	browser.browserAction.setIcon({path: preset.icon});
	browser.browserAction.setTitle({title: 'vd' + preset.message});
}

function resetBrowserAction() {
	updateIcon(Preset.normal);
}

function shouldBeIgnored(downloadItem) {
	return downloadItem.url.endsWith('#vd-ignore');
	/*
	horrible hack, until https://bugzilla.mozilla.org/show_bug.cgi?id=1305663
	gets fixed the following (or ID equiv) is not possible
	return downloadItem.byExtensionName && downloadItem.byExtensionName == 'vd';
	*/
}

async function get(url) {
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

function makeAbsolute(file, dir) {
	if (file.startsWith('http://') || file.startsWith('https://')) {
		return new URL(file);
	} else {
		return new URL(dir.href + file);
	}
}

function processLink(link, fileDir) {
	try {
		let linkHref = link.getAttribute('href');
		linkHref = makeAbsolute(linkHref, fileDir);
		if (linkHref.origin == fileDir.origin) {
			return linkHref;
		}
	} catch (e) {
		console.debug(`skipping, ${e}`);
	}
}

function getSameOriginLinks(htmlString, fileDir) {
	const links = parser.parseFromString(htmlString, 'text/html').getElementsByTagName('a');
	const urls = [];
	for (let link of links) {
		const processedLink = processLink(link, fileDir);
		if (processedLink) {
			urls.push(processedLink);
		}
	}
	return urls;
}

function matchLinks(pattern, urls) {
	const matched = [];
	for (let link of urls) {
		pattern.test(getFilename(link.href)) ?  matched.push(link) : 0;
	}
	return matched;
}

function matchFileSumsLinks(filename, urls) {
	const re = new RegExp('^' + filename
		+ '(?:.sha(?:512|256|1)|.md5|.digests|.hash.txt)(?!.asc|.pgp|.sig|.sign)$', 'i');
	return matchLinks(re, urls);
}

function matchAgregatedSumsLinks(urls) {
	return matchLinks(/^(?:sha(?:512|256|1)|md5)sum(?!.*.asc|.*.pgp|.*.sig|.*.sign)/i, urls);
}

function getFileDir(href) {
	const lastSlash = href.lastIndexOf('/') + 1;
	return new URL(href.slice(0, lastSlash));
}

function getFilename(href) {
	const lastSlash = href.lastIndexOf('/') + 1;
	return href.slice(lastSlash);
}

async function getDigestUrls(url) {
	const filename = getFilename(url.href);
	const fileDir = getFileDir(url.href);
	const responseText = await get(fileDir);
	const urls = getSameOriginLinks(responseText, fileDir);
	const singleFileSums = matchFileSumsLinks(filename, urls);
	return singleFileSums.length != 0 ? singleFileSums : matchAgregatedSumsLinks(urls);
}

function selectDigest(digests) {
	return digests[0];
}

function createEntries(downloadItem, digestPath, digestId) {
	records.set(downloadItem.id, {
		inputFileState: DownloadState.downloading,
		digestState: DownloadState.downloading,
		digestId: digestId,
		originalFilename: getFilename(downloadItem.url),
		inputFile: downloadItem.filename, //is absolute path
		digestFile: digestPath
	});
	digests.set(digestId, downloadItem.id);
}

async function handleDownloadCreated(downloadItem) {
	if (shouldBeIgnored(downloadItem)) {
		return;
	}
	try {
		const digestUrls = await getDigestUrls(new URL(downloadItem.url));
		const digest = selectDigest(digestUrls);
		if (!digest) {
			return;
		}
		const [digestPath, digestId] = await downloadDigest(digest);
		createEntries(downloadItem, digestPath, digestId);
	} catch (e) {
		handleError(e, downloadItem.id);
	}
}

async function downloadDigest(url) {
	try {
		const downloadId = await browser.downloads.download({
			url: url.href + '#vd-ignore', // horrible hack, see shouldBeIgnored() for reason
			saveAs: false,
		});
		let dItem = await browser.downloads.search({id: downloadId});
		dItem = dItem[0];
		return [dItem.filename, downloadId];
	} catch (e) {
		throw Error(`unable to download digest ${url.href}: ${e}`);
	}
}

function handleError(err, downloadId) {
	console.error(`${err}`);
	cleanup(downloadId);
	updateIcon(Preset.error);
}


function handleResponse(response) {
	if (response.verdict) {
		switch (response.verdict) {
		case 'i':
			console.info('integrity verified');
			updateIcon(Preset.integrity);
			break;
		case 'a':
			console.info('authenticity verified');
			updateIcon(Preset.authenticity);
			break;
		default:
			console.info('verification failed');
			updateIcon(Preset.fail);
		}
	} else if (response.error) {
		console.error(response.error);
		updateIcon(Preset.error);
	}

}

function serializeEntry(entry) {
	const res = {};
	res['original-filename'] = entry.originalFilename;
	res['input-file'] = entry.inputFile;
	res['digest-file'] = entry.digestFile;
	return res;
}

async function sendToNativeApp(entryId) {
	const entry = records.get(entryId);
	const serialized = serializeEntry(entry);
	try {
		const response = await browser.runtime.sendNativeMessage('io.github.vd', serialized);
		console.info(`native app responded: ${JSON.stringify(response, null, '\t')}`);
		handleResponse(response);
		cleanup(entryId);
	} catch (e) {
		throw Error(`unable to communicate with vd application: ${e}`);
	}
}

function readyForVerification(entryId) {
	const entry = records.get(entryId);
	return entry.fileState === DownloadState.downloaded
		&& entry.digestState === DownloadState.downloaded;
}

function markDownloaded(id) {
	if (records.has(id)) {
		const entry = records.get(id);
		entry.fileState = DownloadState.downloaded;
		return id;
	} else if (digests.has(id)) {
		const parentId = digests.get(id);
		const entry = records.get(parentId);
		entry.digestState = DownloadState.downloaded;
		return parentId;
	}
	console.warn(`finished download ${id} is not recorded anywhere`);
}

async function handleDownloadFinished(delta) {
	const entryId = markDownloaded(delta.id);
	if (entryId && readyForVerification(entryId)) {
		try {
			await sendToNativeApp(entryId);
		} catch (e) {
			handleError(e, entryId);
		}
	}
}

async function handleDownloadInterrupted(delta) {
	if (digests.has(delta.id)) {
		console.warn(`digest download ${delta.id} interrupted, deleting entries`);
		await cleanup(digests.get(delta.id));
	} else if (records.has(delta.id)) {
		console.warn(`download ${delta.id} interrupted, deleting entries`);
		const entry = records.get(delta.id);
		if (entry && entry.digestState === DownloadState.downloading) {
			browser.downloads.cancel(entry.digestId)
				.catch(error => console.warn(`unable to cancel download: ${error}`));
		}
		await cleanup(delta.id);
	}
}

function handleDownloadChanged(delta) {
	if (delta.state && delta.state.current === 'complete') {
		handleDownloadFinished(delta);
	} else if (delta.state && delta.state.current === 'interrupted') {
		handleDownloadInterrupted(delta);
	}
}

async function cleanup(downloadId) {
	const entry = records.get(downloadId);
	if (entry) {
		records.delete(downloadId);
		if (entry.digestId) {
			digests.delete(entry.digestId);
			await removeTraces(entry.digestId);
		}
	}
}

async function removeTraces(id) {
	await Promise.all([
		browser.downloads.removeFile(id)
			.catch(error => console.warn(`unable to remove file: ${error}`)),
		browser.downloads.erase({id: id})
			.catch(error => console.warn(`unable to remove from downloads: ${error}`))
	]);
}

browser.downloads.onChanged.addListener(handleDownloadChanged);
browser.downloads.onCreated.addListener(handleDownloadCreated);
browser.browserAction.onClicked.addListener(resetBrowserAction);
