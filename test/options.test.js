'use strict';

import * as browser from 'sinon-chrome/webextensions';
import * as helpers from './helpers.js';
import * as options from '../src/options/options.js';

beforeAll(() => {
	window.browser = browser;
});

describe('downloadVerifier()', () => {
	beforeEach(() => {
		browser.flush();
	});

	test('does not throw on rejection', async () => {
		browser.tabs.create.rejects();

		await expect(options.downloadVerifier()).toBeUndefined();
	});
});

describe('setOptionName()', () => {
	test('sets name attribute to element', () => {
		const doc = (new DOMParser()).parseFromString(helpers.testHtml, 'text/html');

		options.setOptionName(doc, 'testId', 'testName');
		expect(doc.getElementById('testId').name).toEqual('testName');
	});
});
