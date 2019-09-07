'use strict';

import {
	downloadDigestForEntry
} from '../extension/vd.js';
import * as ctxMenus from '../extension/contextmenus.js';
import * as browser from 'sinon-chrome/webextensions';
jest.mock('../extension/vd.js');

beforeAll(() => {
	window.browser = browser;
});

beforeEach(() => {
	browser.flush();
});

test('selectDigest() returns first available option if possible', () => {
	const [parent, child] = ctxMenus.parseMenuIds('0-11');
	expect(parent).toEqual(0);
	expect(child).toEqual(11);
});

test('createContextMenuParents() creates 2 parent menus', () => {
	ctxMenus.createContextMenuParents();
	expect(browser.menus.create.callCount).toBe(2);
});

test('deleteContextMenu() deletes a child menu from each parent', () => {
	browser.menus.remove.resolves({});
	ctxMenus.deleteContextMenu('1');
	expect(browser.menus.remove.callCount).toBe(2);
});

test('handleMenuClicked() throws if provided with invalid ID', async () => {
	await expect(ctxMenus.handleMenuClicked({menuItemId: '999-0'}))
		.rejects.toEqual(Error('invalid parent ID: 999'));
});

test('handleMenuClicked() downloads digest file if link menu is clicked', async () => {
	await ctxMenus.handleMenuClicked({
		menuItemId: `${ctxMenus.MenuType.link}-0`,
		linkUrl: 'https://host.io/'
	});
	expect(downloadDigestForEntry.mock.calls.length).toBe(1);
});
