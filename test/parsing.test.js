'use strict';

import * as parsing from '../extension/parsing.js';
import * as helpers from './helpers.js';

test('getFilename() returns filename if present', () => {
	const u = 'https://www.host.io/downloads/f1.txt';

	expect(parsing.getFilename(u)).toBe('f1.txt');
});

test('getFilename() returns empty string if not present', () => {
	const u = 'https://www.host.io/downloads/';

	expect(parsing.getFilename(u)).toBe('');
});

test('getDirListingUrl() return file directory as URL', () => {
	expect(parsing.getDirListingUrl('https://host.io/path/md5sums'))
		.toEqual(new URL('https://host.io/path/'));
});

test('getSameOriginLinks() extracts link for given host from html document', () => {
	expect(parsing.getSameOriginLinks(helpers.testHtml, new URL('https://host.io/'))).toEqual([
		new URL('https://host.io/f.ext'),
		new URL('https://host.io/f.ext.sha1'),
		new URL('https://host.io/f3.xz'),
		//a bit of a nonsense, but there is no other way to scan possible relative path links
		new URL('https://host.io/nonsense ?C=N;O=D')
	]);
});

test('matchAgregatedSumsLinks() returns all URLs containing digests file', () => {
	expect(parsing.matchAgregatedSumsLinks([
		new URL('https://host.io/path/sha1SUM.txt'), new URL('https://host.io/path/link2.sh'),
		new URL('https://path/md5sums'), new URL('https://path/md5sums.asc'),
		new URL('https://path/sha512sums'), new URL('https://host.io/sha512sums')
	])).toEqual([
		new URL('https://host.io/path/sha1SUM.txt'),
		new URL('https://host.io/sha512sums'),
		new URL('https://path/sha512sums'),
	]);
});

test('matchFileSumsLinks() returns any URLs containing digest file', () => {
	expect(parsing.matchFileSumsLinks('file.name', [
		new URL('https://host.io/file.name.DIGESTS'), new URL('https://host.io/file.name.hash.txt'),
		new URL('https://host.io/file.name.gpg'), new URL('https://host.io/file.name.sha512'),
		new URL('https://host.io/sha512sums'), new URL('https://host.io/sha512.sha1'),
		new URL('https://host.io/notfile.name.sha1'), new URL('https://host.io/file.name'),
		new URL('https://host.io/file.name.DIGESTS.asc'), new URL('https://host.io/file.name.pgp')
	])).toEqual([
		new URL('https://host.io/file.name.DIGESTS'), new URL('https://host.io/file.name.hash.txt'),
		new URL('https://host.io/file.name.sha512')
	]);
});
