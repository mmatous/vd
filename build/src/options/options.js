import { versionRequest } from '../app.js';
import { VD_VERIFIER_API_URL, VD_VERIFIER_URL } from '../constants.js';
import { getJson } from '../utils.js';

export function setOptionName(doc, elementId, optionName) {
	doc.getElementById(elementId).name = optionName;
}

export async function getLatestVersion() {
	const response = await getJson(VD_VERIFIER_API_URL);
	return response.tag_name;
}

export function downloadVerifier() {
	browser.tabs.create({ url: VD_VERIFIER_URL })
		.catch(() => {
			console.warn(`Unable to open tab at ${VD_VERIFIER_URL}`);
		});
}

export function handleTestVerifierClick() {
	versionRequest().then((version) => {
		document.getElementById('testResult').value = browser.i18n.getMessage('versionResponse', version);
	}).catch((err) => {
		console.error(`vd-verifier responded: ${err.message}`);
		const errResponse = browser.i18n.getMessage('versionRequestError');
		document.getElementById('testResult').value = errResponse;
	});
}

export function handleDomContentLoaded() {
	handleTestVerifierClick();	// act as if user pressed the test button

	getLatestVersion().then((result) => {
		document.getElementById('latestVersion').value = browser.i18n.getMessage('latestVersion', result);
	});
}