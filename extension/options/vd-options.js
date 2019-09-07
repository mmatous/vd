import * as addonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as automaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';
import { Settings } from '../constants.js';
import * as options from './options.js';

options.setOptionName(document, 'notify-error', Settings.notifyError);
options.setOptionName(document, 'notify-fail', Settings.notifyFail);
options.setOptionName(document, 'notify-success', Settings.notifySuccess);
options.setOptionName(document, 'regex-list', Settings.regexList);

document.getElementById('downloadVerifier').addEventListener('click', options.downloadVerifier);
document.getElementById('testVerifier').addEventListener('click', options.handleTestVerifierClick);

window.addEventListener('DOMContentLoaded', options.handleDomContentLoaded);

automaticSettings.setDefaultOptionProvider(addonSettings.getDefaultValue);
automaticSettings.init();
