export const Preset = Object.freeze({
	normal: {iconUrl: 'icon/vd-normal.svg', title: ''},
	error: {iconUrl: 'icon/vd-error.svg', title: 'Error encountered'},
	fail: {iconUrl: 'icon/vd-fail.svg',  title: 'Verification failed'},
	integrity: {iconUrl: 'icon/vd-integrity.svg', title: 'Integrity verified'},
	authenticity: {iconUrl: 'icon/vd-authenticity.svg', title: 'Authenticity verified'}
});

export const REMEMBER_DOWNLOADS = 10;

export const FETCH_TIMEOUT_MS = 2000;

export const Settings = Object.freeze({
	notifyError: 'notify-error',
	notifyFail: 'notify-fail',
	notifySuccess: 'notify-success',

	regexList: 'regex-list'
});

export const NATIVE_APP_ID = 'io.github.vd';

export const VD_VERIFIER_API_URL = 'https://api.github.com/repos/mmatous/vd-verifier/releases/latest';

export const VD_VERIFIER_URL = 'https://github.com/mmatous/vd-verifier/releases/latest';
