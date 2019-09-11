import * as addonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as automaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';
import * as options from './options.js';

document.getElementById('downloadVerifier').addEventListener('click', options.downloadVerifier);
document.getElementById('testVerifier').addEventListener('click', options.handleTestVerifierClick);

window.addEventListener('DOMContentLoaded', options.handleDomContentLoaded);

automaticSettings.setDefaultOptionProvider(addonSettings.getDefaultValue);
automaticSettings.init();
