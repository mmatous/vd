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

describe('createContextMenuChildren()', () => {
	test('creates 4 sub-menus', () => {
		ctxMenus.createContextMenuChildren(0, '/a/path/to/file.ext');
		expect(browser.menus.create.callCount).toBe(4);
		expect(browser.menus.create.args[0][0]).toEqual(
			expect.objectContaining({
				title: 'file.ext @ /a/path/to/'
			})
		);
	});
});

describe('createContextMenuParents()', () => {
	test('creates 4 parent menus', () => {
		ctxMenus.createContextMenuParents();
		expect(browser.menus.create.callCount).toBe(4);
	});
});

describe('deleteContextMenu()', () => {
	test('deletes a child menu from each parent', () => {
		browser.menus.remove.resolves({});

		ctxMenus.deleteContextMenu('1');
		expect(browser.menus.remove.callCount).toBe(4);
	});

	test('handles invalid IDs', () => {
		browser.menus.remove.rejects({});

		// this is meant to say .not.toThrow() which jest only supports for mocks
		expect(ctxMenus.deleteContextMenu('-999')).toBeUndefined();
		expect(browser.menus.remove.callCount).toBe(4);
	});
});

describe('handleMenuClicked()', () => {
	test('throws if provided with invalid ID', async () => {
		await expect(ctxMenus.handleMenuClicked({menuItemId: '999-0'}))
			.rejects.toThrow('Invalid parent ID: 999');
	});

	test('downloads file if link menu is clicked', async () => {
		await ctxMenus.handleMenuClicked({
			menuItemId: `${ctxMenus.MenuType.linkDigest}-0`,
			linkUrl: 'https://host.io/'
		});
		expect(downloadDigestForEntry.mock.calls.length).toBe(1);
	});
});

describe('parseMenuIds()', () => {
	test('returns an int array of [parentId, childId]', () => {
		const [parent, child] = ctxMenus.parseMenuIds('0-11');
		expect(parent).toEqual(0);
		expect(child).toEqual(11);
	});
});
