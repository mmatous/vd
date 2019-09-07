'use strict';

import * as addonSettings
	from './3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import { handleMenuClicked } from './contextmenus.js';
import { handleDownloadChanged, handleDownloadCreated, handleInstalled } from './vd.js';

addonSettings.loadOptions().then(() => {
	console.info('AddonSettings module loaded.');
});
addonSettings.setCaching(false);

browser.downloads.onChanged.addListener(handleDownloadChanged);
browser.downloads.onCreated.addListener(handleDownloadCreated);
browser.menus.onClicked.addListener(handleMenuClicked);
browser.runtime.onInstalled.addListener(handleInstalled);
