'use strict';

export const REMEMBER_DOWNLOADS = 10;

export const FETCH_TIMEOUT_MS = 2000;

export const Settings = Object.freeze({
	digestRules: 'digest-rules',
	signatureRules: 'sig-rules',

	useAutodetect: 'use-autodetect'
});

export const NATIVE_APP_ID = 'io.github.vd';

export const VD_VERIFIER_API_URL = 'https://api.github.com/repos/mmatous/vd-verifier/releases/latest';

export const VD_VERIFIER_URL = 'https://github.com/mmatous/vd-verifier/releases/latest';

export const SignedData = Object.freeze({
	data: 'data',
	digest: 'digest'
});

export const DownloadState = Object.freeze(
	{unknown: 1, downloading: 2, downloaded: 3, noexist: 4, assignedManually: 5}
);
