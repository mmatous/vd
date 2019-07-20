'use strict';

import * as browser from 'sinon-chrome/webextensions';

import fetch from 'jest-fetch-mock';

import * as Util from '../extension/utils.js';

jest.useFakeTimers();

beforeAll(() => {
	window.browser = browser;
	window.fetch = fetch;
});

beforeEach(() => {
	fetch.resetMocks();
	jest.clearAllTimers();
	browser.flush();
});

test('boundedFetch() has 2 sec timeout', async () => {
	fetch.mockResponseOnce(
		() => { return new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 4000)); }
	);
	const res = Util.boundedFetch('https://host.io');
	jest.advanceTimersByTime(3000);
	await expect(res).rejects.toEqual('Fetch call to https://host.io timed out');
});

test('get() returns text response correctly', async () => {
	fetch.mockResponseOnce('<html></html>');
	const res = await Util.get('https://host.io');
	expect(fetch.mock.calls.length).toEqual(1);
	expect(fetch.mock.calls[0][0]).toEqual('https://host.io');
	expect(res).toEqual('<html></html>');
});

test('get() rejects on non-ok status code', async () => {
	fetch.mockResponseOnce('fail', { status: 404 });
	await expect(Util.get('https://host.io')).rejects.toEqual(
		Error('failed fetch() for https://host.io: Not Found')
	);
});

test('get() rejects on fetch rejection', async () => {
	fetch.mockRejectOnce('dns fail');
	await expect(Util.get('https://host.io'))
		.rejects.toEqual(Error('failed fetch() for https://host.io: dns fail'));
});

test('toRaw() return raw string without double escapes', () => {
	const res = Util.toRaw('^https?://.*/releases/(\\d{2})/(\\w*[^/])/(\\w[\\d_]*)/iso/.*-(\\d\\.\\d).iso');
	expect(res).toEqual(String.raw`^https?://.*/releases/(\d{2})/(\w*[^/])/(\w[\d_]*)/iso/.*-(\d\.\d).iso`);
});