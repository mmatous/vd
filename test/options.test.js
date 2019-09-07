'use strict';

import * as options from '../extension/options/options.js';
import * as helpers from './helpers.js';

test('setOptionName() sets name attribute to element', () => {
	const doc = (new DOMParser()).parseFromString(helpers.testHtml, 'text/html');

	options.setOptionName(doc, 'testId', 'testName');
	expect(doc.getElementById('testId').name).toEqual('testName');
});
