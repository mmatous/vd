import * as AddonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as AutomaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';
import { Settings } from '../constants.js';
import { downloadVerifier, handleDomContentLoaded, setOptionName, testVerifierWithUiChange } from './options.js';

setOptionName(document, 'notifyError', Settings.notifyError);
setOptionName(document, 'notifyFail', Settings.notifyFail);
setOptionName(document, 'notifySuccess', Settings.notifySuccess);

document.getElementById('downloadVerifier').addEventListener('click', downloadVerifier);
document.getElementById('testVerifier').addEventListener('click', testVerifierWithUiChange);

window.addEventListener('DOMContentLoaded', handleDomContentLoaded);

AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();
