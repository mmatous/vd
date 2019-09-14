/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "localizer" }]*/

import * as addonSettings
	from '../3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import * as automaticSettings
	from '../3rdparty/TinyWebEx/AutomaticSettings/AutomaticSettings.js';
import { Settings } from '../constants.js';
import * as options from './options.js';
import * as localizer from '../3rdparty/TinyWebEx/Localizer/Localizer.js';

options.setOptionName(document, 'digest-rules', Settings.digestRules);

automaticSettings.setDefaultOptionProvider(addonSettings.getDefaultValue);
automaticSettings.init();
