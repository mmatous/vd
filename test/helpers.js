'use strict';

import { DownloadState } from '../src/constants';

export const testDownloadItem = {
	id: 1,
	url: 'https://host.io/f.ext',
	filename: '/a/verifiable.file',
};

export const testDigestItem = {
	id: 2,
	url: 'https://host.io/f.ext.sha1',
	filename: '/a/verifiable.file.sha1',
	byExtensionId: 'vd@vd.io'
};

export const testSigItem = {
	id: 3,
	url: 'https://host.io/f.ext.asc',
	filename: '/a/f.ext.asc',
	byExtensionId: 'vd@vd.io'
};

export const testDownloadListItem = {
	digestFile: '/a/verifiable.file.sha1',
	digestHex: null,
	digestId: 2,
	digestState: DownloadState.downloading,
	id: 1,
	inputFile: '/a/verifiable.file',
	inputFileState: DownloadState.downloading,
	originalFilename: 'f.ext',
};

export const testHtml =
`
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>title</title>
		<link rel="stylesheet" href="style.css">
		<script src="script.js"></script>
	</head>
	<body>
	<input type="checkbox" id="testId">
	<div>
		<ul>
			<li><a href="https://host.io/path/f.ext">L1</a></li>
			<li><a href="https://host.io/path/f.ext.sha1">L2</a></li>
			<li><a href="f3.xz">F3</a></li>
		</ul>
	</div>
	<a href="https://www.host.com/html/">E1</a>
	<a href="nonsense ?C=N;O=D">G1</a>
	</body>
</html>
`;

export const testHtmlWithSig =
`
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>title</title>
		<link rel="stylesheet" href="style.css">
		<script src="script.js"></script>
	</head>
	<body>
	<input type="checkbox" id="testId">
	<div>
		<ul>
			<li><a href="https://host.io/path/f.ext">L1</a></li>
			<li><a href="https://host.io/path/f.ext.sig">sig</a></li>
			<li><a href="https://host.io/path/f.ext.sha1">L2</a></li>
			<li><a href="f3.xz">F3</a></li>
		</ul>
	</div>
	<a href="https://www.host.com/html/">E1</a>
	<a href="nonsense ?C=N;O=D">G1</a>
	</body>
</html>
`;

export function createAppResponse(integrityStatus, iStatusText, signatureStatus, sStatuses) {
	return {
		integrity: {
			[integrityStatus]: iStatusText
		},
		signatures: {
			[signatureStatus]: sStatuses
		},
	};
}