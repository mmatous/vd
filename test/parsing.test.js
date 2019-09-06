'use strict';

import {
	getFileDirUrl,
	getFilename,
	getSameOriginLinks,
	matchAgregatedSumsLinks,
	matchFileSumsLinks
} from '../extension/parsing.js';

test('getFilename() returns filename if present', () => {
	const u = 'https://www.host.io/downloads/f1.txt';

	expect(getFilename(u)).toBe('f1.txt');
});

test('getFilename() returns empty string if not present', () => {
	const u = 'https://www.host.io/downloads/';

	expect(getFilename(u)).toBe('');
});

test('getFileDirUrl() return file directory as URL', () => {
	expect(getFileDirUrl('https://host.io/path/md5sums'))
		.toEqual(new URL('https://host.io/path/'));
});

test('getSameOriginLinks() extracts link for given host from html document', () => {
	const response = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>title</title>
			<link rel="stylesheet" href="style.css">
			<script src="script.js"></script>
		</head>
		<body>
		<a href="https://www.host.io/downloads/f1.txt">L1</a>
		<div>
			<ul>
				<li><a href="https://host.io/f2.tar">L2</a></li>
				<li><a href="f3.xz">F3</a></li>
			</ul>
		</div>
		<a href="https://www.host.com/html/">E1</a>
		<a href="nonsense ?C=N;O=D">G1</a>
		</body>
	</html>
	`;

	expect(getSameOriginLinks(response, new URL('https://host.io/'))).toEqual([
		new URL('https://host.io/f2.tar'),
		new URL('https://host.io/f3.xz'),
		//a bit of a nonsense, but there is no other way to scan possible relative path links
		new URL('https://host.io/nonsense ?C=N;O=D')
	]);
});

test('matchAgregatedSumsLinks() returns all URLs containing digests file', () => {
	expect(matchAgregatedSumsLinks([
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
	expect(matchFileSumsLinks('file.name', [
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
