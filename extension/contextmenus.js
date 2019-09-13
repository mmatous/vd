'use strict';

import { getFilename, getFileDir } from './parsing.js';
import * as vd from './vd.js';
import { SignedData } from './constants.js';

export const MenuType = Object.freeze({
	selectionDigest: '0',
	linkDigest: '1',
	linkSignature: '2',
	linkSignedDigest: '3'
});

export function parseMenuIds(menuId) {
	const split = menuId.split('-');
	const parentId = parseInt(split[0]);
	const childId = parseInt(split[1]);
	return [ parentId, childId ];
}

export async function handleMenuClicked(info) {
	const [parentId, childId] = parseMenuIds(info.menuItemId);
	const entry = vd.downloadList.getByDownloadId(childId);
	switch (String(parentId)) {
	case MenuType.selectionDigest:
		entry.setDigest(info.selectionText);
		vd.sendIfReady(entry);
		break;
	case MenuType.linkDigest:
		await vd.downloadDigestForEntry(entry, new URL(info.linkUrl));
		break;
	case MenuType.linkSignature:
		await vd.downloadSignatureForEntry(entry, new URL(info.linkUrl), SignedData.data);
		break;
	case MenuType.linkSignedDigest:
		await vd.downloadSignatureForEntry(entry, new URL(info.linkUrl), SignedData.digest);
		break;
	default:
		throw Error(`Invalid parent ID: ${parentId}`);
	}
}

function onMenuCreated() {
	if (browser.runtime.lastError) {
		console.warn(`Error creating menu item: ${browser.runtime.lastError}`);
	}
}

export function createContextMenuParents() {
	browser.menus.create({
		contexts: ['selection'],
		id: MenuType.selectionDigest,
		title: 'Designate selection as hex-encoded digest'
	}, onMenuCreated);

	browser.menus.create({
		contexts: ['link'],
		id: MenuType.linkDigest,
		title: 'Designate link location as digest file'
	}, onMenuCreated);

	browser.menus.create({
		contexts: ['link'],
		id: MenuType.linkSignature,
		title: 'Designate link location as signature file for data'
	}, onMenuCreated);

	browser.menus.create({
		contexts: ['link'],
		id: MenuType.linkSignedDigest,
		title: 'Designate link location as signature file for digest'
	}, onMenuCreated);
}

export function createContextMenuChildren(downloadId, downloadPath) {
	const filename = getFilename(downloadPath);
	const fileDir = getFileDir(downloadPath);

	let childId = `${MenuType.selectionDigest}-${downloadId}`;
	browser.menus.create({
		contexts: ['selection'],
		id: childId,
		parentId: MenuType.selectionDigest,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);

	childId = `${MenuType.linkDigest}-${downloadId}`;
	browser.menus.create({
		contexts: ['link'],
		id: childId,
		parentId: MenuType.linkDigest,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);

	childId = `${MenuType.linkSignature}-${downloadId}`;
	browser.menus.create({
		contexts: ['link'],
		id: childId,
		parentId: MenuType.linkSignature,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);

	childId = `${MenuType.linkSignedDigest}-${downloadId}`;
	browser.menus.create({
		contexts: ['link'],
		id: childId,
		parentId: MenuType.linkSignedDigest,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);
}

export function deleteContextMenu(downloadItemId) {
	browser.menus.remove(`${MenuType.selectionDigest}-${downloadItemId}`)
		.then(() => { console.info(`Deleted selection menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete selection menu entry for ${downloadItemId}`); });
	browser.menus.remove(`${MenuType.linkDigest}-${downloadItemId}`)
		.then(() => { console.info(`Deleted link menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete link menu entry for ${downloadItemId}`); });
	browser.menus.remove(`${MenuType.linkSignature}-${downloadItemId}`)
		.then(() => { console.info(`Deleted link menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete link menu entry for ${downloadItemId}`); });
	browser.menus.remove(`${MenuType.linkSignedDigest}-${downloadItemId}`)
		.then(() => { console.info(`Deleted link menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete link menu entry for ${downloadItemId}`); });
}
