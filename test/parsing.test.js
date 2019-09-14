'use strict';

import * as parsing from '../extension/parsing.js';
import * as helpers from './helpers.js';

describe('getFilename()', () => {
	test('returns filename if present', () => {
		const u = 'https://www.host.io/downloads/f1.txt';

		expect(parsing.getFilename(u)).toBe('f1.txt');
	});

	test('works for windows paths', () => {
		const u = 'C:\\Users\\vd\\Downloads\\f1.txt';

		expect(parsing.getFilename(u)).toBe('f1.txt');
	});

	test('works for URLs with fragment', () => {
		const u = 'https://www.host.io/downloads/f1.txt#annoyingFragment';

		expect(parsing.getFilename(u)).toBe('f1.txt');
	});

	test('returns empty string if not present', () => {
		const u = 'https://www.host.io/downloads/';

		expect(parsing.getFilename(u)).toBe('');
	});
});

describe('getFileDir()', () => {
	test('returns filename if present', () => {
		const u = 'https://www.host.io/downloads/f1.txt';

		expect(parsing.getFileDir(u)).toBe('https://www.host.io/downloads/');
	});

	test('converts windows paths', () => {
		const u = 'C:\\Users\\vd\\Downloads\\f1.txt';

		expect(parsing.getFileDir(u)).toBe('C:/Users/vd/Downloads/');
	});

	test('returns empty string if not present', () => {
		const u = 'f1.ext';

		expect(parsing.getFileDir(u)).toBe('');
	});
});



// jest seems to sometimes match URLs incorrectly, hrefs are used instead
// unfortunately it also means relying on implementation dependent order in some tests
// unless a helper is implemented

describe('getFileDir()', () => {
	test('return file directory as URL', () => {
		expect(parsing.getDirListingUrl('https://host.io/path/md5sums').href)
			.toEqual('https://host.io/path/');
	});
});

describe('getSameOriginLinks()', () => {
	test('extracts link for given host from html document', () => {
		const res = parsing.getSameOriginLinks(helpers.testHtml, new URL('https://host.io/'));
		expect(res).toHaveLength(4);
		expect(res[0].href).toEqual('https://host.io/path/f.ext');
		expect(res[1].href).toEqual('https://host.io/path/f.ext.sha1');
		expect(res[2].href).toEqual('https://host.io/f3.xz');
		//a bit of a nonsense, but there is no other way to scan possible relative path links
		expect(res[3].href).toEqual('https://host.io/nonsense%20?C=N;O=D');
	});
});

describe('filterAgregatedSumsLinks()', () => {
	test('returns all URLs containing digests file', () => {
		const res = parsing.filterAgregatedSumsLinks([
			new URL('https://host.io/path/sha1SUM.txt'),
			new URL('https://host.io/path/link2.sh'),
			new URL('https://path/md5sums'),
			new URL('https://path/md5sums.asc'),
			new URL('https://path/sha512sums'),
			new URL('https://host.io/sha512sums')
		]);
		expect(res).toHaveLength(3);
		expect(res[0].href).toEqual('https://host.io/path/sha1SUM.txt');
		expect(res[1].href).toEqual('https://path/sha512sums');
		expect(res[2].href).toEqual('https://host.io/sha512sums');
	});
});

describe('filterFileSumsLinks()', () => {
	test('filterFileSumsLinks() returns any URLs containing digest file', () => {
		const res = parsing.filterFileSumsLinks('file.name', [
			new URL('https://host.io/file.name.DIGESTS'),
			new URL('https://host.io/file.name.hash.txt'),
			new URL('https://host.io/file.name.gpg'),
			new URL('https://host.io/file.name.sha512'),
			new URL('https://host.io/sha512sums'),
			new URL('https://host.io/sha512.sha1'),
			new URL('https://host.io/notfile.name.sha1'),
			new URL('https://host.io/file.name'),
			new URL('https://host.io/file.name.DIGESTS.asc'),
			new URL('https://host.io/file.name.pgp')
		]);
		expect(res).toHaveLength(3);
		expect(res[0].href).toEqual('https://host.io/file.name.DIGESTS');
		expect(res[1].href).toEqual('https://host.io/file.name.hash.txt');
		expect(res[2].href).toEqual('https://host.io/file.name.sha512');
	});
});

describe('filterSignatureLinks()', () => {
	test('returns any URLs containing file signature', () => {
		const res = parsing.filterSignatureLinks('file.name', [
			new URL('https://host.io/file.name.DIGESTS'),
			new URL('https://host.io/file.name.hash.txt'),
			new URL('https://host.io/file.name.gpg'),
			new URL('https://host.io/file.name.sha512'),
			new URL('https://host.io/sha512sums'),
			new URL('https://host.io/sha512.sha1'),
			new URL('https://host.io/notfile.name.sha1'),
			new URL('https://host.io/file.name'),
			new URL('https://host.io/file.name.DIGESTS.asc'),
			new URL('https://host.io/file.name.pgp'),
			new URL('https://host.io/file.name.asc')
		]);
		expect(res).toHaveLength(3);
		expect(res[0].href).toEqual('https://host.io/file.name.gpg');
		expect(res[1].href).toEqual('https://host.io/file.name.pgp');
		expect(res[2].href).toEqual('https://host.io/file.name.asc');
	});

	test('returns any URLs containing signed *sums file', () => {
		const res = parsing.filterSignatureLinks('sha1sums', [
			new URL('https://host.io/file.name.DIGESTS'),
			new URL('https://host.io/file.name.hash.txt'),
			new URL('https://host.io/file.name.sha512'),
			new URL('https://host.io/sha1sums.sig'),
			new URL('https://host.io/sha1sums.gpg'),
			new URL('https://host.io/sha512.sha1'),
			new URL('https://host.io/notfile.name.sha1'),
			new URL('https://host.io/sha1sums.asc'),
			new URL('https://host.io/file.name'),
			new URL('https://host.io/file.name.DIGESTS.asc'),
		]);
		expect(res).toHaveLength(3);
		expect(res[0].href).toEqual('https://host.io/sha1sums.sig');
		expect(res[1].href).toEqual('https://host.io/sha1sums.gpg');
		expect(res[2].href).toEqual('https://host.io/sha1sums.asc');
	});
});
