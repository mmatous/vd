import { Settings } from '../../../constants.js';
import * as AddonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as AutomaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';

function setOptionName(elementId, optionName) {
	document.getElementById(elementId).name = optionName;
}

setOptionName('notifyError', Settings.notifyError);
setOptionName('notifyFail', Settings.notifyFail);
setOptionName('notifySuccess', Settings.notifySuccess);

AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();
