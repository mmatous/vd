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
		console.warn(`error creating menu item: ${browser.runtime.lastError}`);
	} else {
		console.info('menu item created successfully');
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

export function createContextMenuChildren(downloadItem) {
	const filename = getFilename(downloadItem.filename);
	const fileDir = getFileDir(downloadItem.filename);

	const selectionChildId = `${MenuType.selection}-${downloadItem.id}`;
	browser.menus.create({
		contexts: ['selection'],
		id: selectionChildId,
		parentId: MenuType.selection,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);

	const linkChildId = `${MenuType.link}-${downloadItem.id}`;
	browser.menus.create({
		contexts: ['link'],
		id: linkChildId,
		parentId: MenuType.link,
		title: `${filename} @ ${fileDir}`
	}, onMenuCreated);
}

export function deleteContextMenu(downloadItemId) {
	browser.menus.remove(`${MenuType.selection}-${downloadItemId}`)
		.then(() => { console.info(`deleted selection menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`unable to delete selection menu entry for ${downloadItemId}`); });

	browser.menus.remove(`${MenuType.link}-${downloadItemId}`)
		.then(() => { console.info(`deleted link menu entry for ${downloadItemId}`); })
		.catch(() => { console.warn(`unable to delete link menu entry for ${downloadItemId}`); });
}
