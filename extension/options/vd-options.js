import * as AddonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as AutomaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';
import { Settings } from '../constants.js';
import { downloadVerifier, handleDomContentLoaded, setOptionName, handleTestVerifierClick } from './options.js';

setOptionName(document, 'notify-error', Settings.notifyError);
setOptionName(document, 'notify-fail', Settings.notifyFail);
setOptionName(document, 'notify-success', Settings.notifySuccess);
setOptionName(document, 'regex-list', Settings.regexList);

document.getElementById('downloadVerifier').addEventListener('click', downloadVerifier);
document.getElementById('testVerifier').addEventListener('click', handleTestVerifierClick);

window.addEventListener('DOMContentLoaded', handleDomContentLoaded);

AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();
