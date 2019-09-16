/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "localizer" }]*/

import * as addonSettings
	from '../../3rdparty/AddonSettings/AddonSettings.js';
import * as automaticSettings
	from '../../3rdparty/AutomaticSettings/AutomaticSettings.js';
import { Settings } from '../constants.js';
import * as options from './options.js';
import * as localizer from '../../3rdparty/Localizer/Localizer.js';

options.setOptionName(document, 'sig-rules', Settings.signatureRules);

automaticSettings.setDefaultOptionProvider(addonSettings.getDefaultValue);
automaticSettings.init();
