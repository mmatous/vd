import { VD_VERIFIER_URL } from '../constants.js';
import { getJson, testVerifier } from '../utils.js';

export function setOptionName(doc, elementId, optionName) {
	doc.getElementById(elementId).name = optionName;
}

export async function getLatestVersion() {
	const apiUrl = 'https://api.github.com/repos/mmatous/vd-verifier/releases/latest';
	const response = await getJson(apiUrl);
	return response.tag_name;
}

export function downloadVerifier() {
	browser.tabs.create({ url: VD_VERIFIER_URL })
		.catch(() => {
			console.warn(`Unable to open tab at ${VD_VERIFIER_URL}`);
		});
}

export function testVerifierWithUiChange() {
	testVerifier().then((version) => {
		document.getElementById('testResult').value = `Setup OK, version: ${version}`;
	}).catch((err) => {
		console.error(`vd-verifier ${err}`);
		const errResponse = `Something went wrong.
			Please ensure you have the latest version of vd-verifier installed correctly.`;
		document.getElementById('testResult').value = errResponse;
	});
}

export function handleDomContentLoaded() {
	testVerifierWithUiChange();

	getLatestVersion().then((result) => {
		document.getElementById('latestVersion').value = `Latest version: ${result}`;
	});
}