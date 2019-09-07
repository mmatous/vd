'use strict';

import { getFilename, getFileDir } from './parsing.js';
import {
	downloadDigestForEntry,
	downloadList,
	sendIfReady
} from './vd.js';

export const MenuType = Object.freeze({
	selection: '0',
	link: '1'
});

export function parseMenuIds(menuId) {
	const split = menuId.split('-');
	const parentId = parseInt(split[0]);
	const childId = parseInt(split[1]);
	return [ parentId, childId ];
}

export async function handleMenuClicked(info) {
	const [parentId, childId] = parseMenuIds(info.menuItemId);
	const entry = downloadList.getByDownloadId(childId);
	if (parentId == MenuType.selection) {
		entry.setDigest(info.selectionText);
		sendIfReady(entry);
	} else if (parentId == MenuType.link) {
		await downloadDigestForEntry(entry, new URL(info.linkUrl));
	} else {
		throw Error(`invalid parent ID: ${parentId}`);
	}
}

function onMenuCreated() {
	if (browser.runtime.lastError) {
		console.warn(`Error creating menu item: ${browser.runtime.lastError}`);
	} else {
		console.info('Menu item created successfully');
	}
}

export function createContextMenuParents() {
	browser.menus.create({
		contexts: ['selection'],
		id: MenuType.selection,
		title: 'Designate selection as hex-encoded digest'
	}, onMenuCreated);

	browser.menus.create({
		contexts: ['link'],
		id: MenuType.link,
		title: 'Designate link location as digest file'
	}, onMenuCreated);
}

export function createContextMenuChildren(downloadId, downloadPath) {
	const filename = getFilename(downloadPath);
	const fileDir = getFileDir(downloadPath);

	const selectionChildId = `${MenuType.selection}-${downloadId}`;
	browser.menus.create({
		contexts: ['selection'],
		id: selectionChildId,
		parentId: MenuType.selection,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);

	const linkChildId = `${MenuType.link}-${downloadId}`;
	browser.menus.create({
		contexts: ['link'],
		id: linkChildId,
		parentId: MenuType.link,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);
}

export function deleteContextMenu(downloadItemId) {
	browser.menus.remove(`${MenuType.selection}-${downloadItemId}`)
		.then(() => { console.info(`Deleted selection menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete selection menu entry for ${downloadItemId}`); });

	browser.menus.remove(`${MenuType.link}-${downloadItemId}`)
		.then(() => { console.info(`Deleted link menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`Unable to delete link menu entry for ${downloadItemId}`); });
}
