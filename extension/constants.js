'use strict';

export const REMEMBER_DOWNLOADS = 10;

export const FETCH_TIMEOUT_MS = 2000;

export const Settings = Object.freeze({
	notifyError: 'notify-error',
	notifyFail: 'notify-fail',
	notifySuccess: 'notify-success',

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