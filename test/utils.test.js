'use strict';

import * as browser from 'sinon-chrome/webextensions';

import fetch from 'jest-fetch-mock';

import * as util from '../extension/utils.js';

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
	const res = util.boundedFetch('https://host.io');
	jest.advanceTimersByTime(3000);
	await expect(res).rejects.toEqual('Fetch call to https://host.io timed out');
});

test('get() returns text response correctly', async () => {
	fetch.mockResponseOnce('<html></html>');
	const res = await util.get('https://host.io');
	expect(fetch.mock.calls.length).toEqual(1);
	expect(fetch.mock.calls[0][0]).toEqual('https://host.io');
	expect(res).toEqual('<html></html>');
});

test('get() rejects on non-ok status code', async () => {
	fetch.mockResponseOnce('fail', { status: 404 });
	await expect(util.get('https://host.io')).rejects.toEqual(
		Error('failed fetch() for https://host.io: Not Found')
	);
});

test('get() rejects on fetch rejection', async () => {
	fetch.mockRejectOnce('dns fail');
	await expect(util.get('https://host.io'))
		.rejects.toEqual(Error('failed fetch() for https://host.io: dns fail'));
});

test('toRaw() return raw string without double escapes', () => {
	const res = util.toRaw('^https?://.*/releases/(\\d{2})/(\\w*[^/])/(\\w[\\d_]*)/iso/.*-(\\d\\.\\d).iso');
	expect(res).toEqual(String.raw`^https?://.*/releases/(\d{2})/(\w*[^/])/(\w[\d_]*)/iso/.*-(\d\.\d).iso`);
});

test('isDigestString() returns true if passed valid hex string >= 20 bytes (40 chars!)', () => {
	const res = util.isDigestString('277c1bfe069a889eb752d3c630db34310102b2bb');
	expect(res).toBe(true);
});

test('isDigestString() returns true if passed valid is the middle', () => {
	const res = util.isDigestString('277c1bfe069a889eb752d3c630db34310102b2bb1234');
	expect(res).toBe(true);
});

test('isDigestString() returns true if passed valid hex string <= 64 bytes', () => {
	const res = util.isDigestString('\
277c1bfe069a889eb752d3c630db34310102b2bb\
277c1bfe069a889eb752d3c630db34310102b2bb\
277c1bfe069a889eb752d3c630db34310102b2bb\
12345678\
');
	expect(res).toBe(true);
});

test('isDigestString() returns false if passed valid hex string > 64 bytes', () => {
	const res = util.isDigestString('\
277c1bfe069a889eb752d3c630db34310102b2bb\
277c1bfe069a889eb752d3c630db34310102b2bb\
277c1bfe069a889eb752d3c630db34310102b2bb\
123456789\
');
	expect(res).toBe(false);
});

test('isDigestString() returns false if passed hex string < 20 bytes', () => {
	const res = util.isDigestString('0123456789abcdef01230123456789abcdef01');
	expect(res).toBe(false);
});

test('isDigestString() returns false if passed non-hex string', () => {
	const res = util.isDigestString('\
just a long, more than 40 chars long string string that \
theoretically could be digest if it only used hex characters \
');
	expect(res).toBe(false);
});
