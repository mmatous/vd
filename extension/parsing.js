'use strict;';

const parser = new DOMParser();

export function getFilename(href) {
	const lastSlash = href.lastIndexOf('/') + 1;
	return href.slice(lastSlash);
}

export function getFileDir(filePath) {
	const lastSlash = filePath.lastIndexOf('/') + 1;
	return filePath.slice(0, lastSlash);
}

export function getDirListingUrl(href) {
	const dir = getFileDir(href);
	return new URL(dir);
}

function makeAbsolute(file, dir) {
	if (file.startsWith('http://') || file.startsWith('https://')) {
		return new URL(file);
	} else {
		return new URL(dir.href + file);
	}
}

function normalizeLink(link, fileDir) {
	try {
		let linkHref = link.getAttribute('href');
		linkHref = makeAbsolute(linkHref, fileDir);
		if (linkHref.origin == fileDir.origin) {
			return linkHref;
		}
	} catch (e) {
		// ignore hrefs that cannot be made into URL
	}
}

export function getSameOriginLinks(htmlString, fileDir) {
	const links = parser.parseFromString(htmlString, 'text/html').getElementsByTagName('a');
	const urls = [];
	for (let link of links) {
		const normalizedLink = normalizeLink(link, fileDir);
		if (normalizedLink) {
			urls.push(normalizedLink);
		}
	}
	return urls;
}

function matchLinks(pattern, urls) {
	const matched = [];
	for (let link of urls) {
		if (pattern.test(getFilename(link.href))) {
			matched.push(link);
		}
	}
	return matched;
}

export function matchFileSumsLinks(filename, urls) {
	const fileSumsRe = '^' + filename
		+ '(?:.sha(?:512|256|1)|.digests|.hash.txt)(?!.asc|.pgp|.sig|.sign)$';
	const re = new RegExp(fileSumsRe, 'i');
	return matchLinks(re, urls);
}

export function matchAgregatedSumsLinks(urls) {
	const agregatedSumsRe = /^(?:sha(?:512|256|1))sum(?!.*.asc|.*.pgp|.*.sig|.*.sign)/i;
	return matchLinks(agregatedSumsRe, urls);
}
