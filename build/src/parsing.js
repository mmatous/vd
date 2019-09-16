'use strict;';

const parser = new DOMParser();

export function getFilename(filePath) {
	filePath = filePath.replace(/\\/g, '/');
	const lastSlash = filePath.lastIndexOf('/') + 1;
	return filePath.slice(lastSlash).split('#')[0];
}

export function getFileDir(filePath) {
	filePath = filePath.replace(/\\/g, '/');
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
		// ignore linkHref that cannot be made into valid URL
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

export function filterFileSumsLinks(filename, urls) {
	const fileSumsRe = '^' + filename
		+ '(?:.sha(?:512|256|1)|.digests|.hash.txt)(?!.asc|.pgp|.sig|.sign|.gpg)$';
	const re = new RegExp(fileSumsRe, 'i');
	return matchLinks(re, urls);
}

export function filterAgregatedSumsLinks(urls) {
	const agregatedSumsRe = /^(?:sha(?:512|256|1))sum(?!.*.asc|.*.pgp|.*.sig|.*.sign|.*.gpg)/i;
	return matchLinks(agregatedSumsRe, urls);
}

export function filterSignatureLinks(filename, urls) {
	const signatureRe = '^' + filename + '(?:.sig|.asc|.pgp|.gpg)$';
	const re = new RegExp(signatureRe, 'i');
	return matchLinks(re, urls);
}
