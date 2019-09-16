/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "localizer" }]*/

import * as addonSettings
	from '../../3rdparty/AddonSettings/AddonSettings.js';
import * as automaticSettings
	from '../../3rdparty/AutomaticSettings/AutomaticSettings.js';
import * as constants from '../constants.js';
import * as options from './options.js';
import * as localizer from '../../3rdparty/Localizer/Localizer.js';

options.setOptionName(document, 'use-autodetect', constants.Settings.useAutodetect);

document.getElementById('downloadVerifier').addEventListener('click', options.downloadVerifier);
document.getElementById('testVerifier').addEventListener('click', options.handleTestVerifierClick);

window.addEventListener('DOMContentLoaded', options.handleDomContentLoaded);

automaticSettings.setDefaultOptionProvider(addonSettings.getDefaultValue);
automaticSettings.init();
