'use strict';

import {
	setOptionName
} from '../extension/options/options.js';

test('setOptionName() sets name attribute to element', () => {
	const d = '<!DOCTYPE html><html><head></head><body><input type="checkbox" id="testId"></body></html>';
	const doc = (new DOMParser()).parseFromString(d, 'text/html');

	setOptionName(doc, 'testId', 'testName');
	expect(doc.getElementById('testId').name).toEqual('testName');
});
