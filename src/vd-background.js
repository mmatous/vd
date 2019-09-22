'use strict';

import * as addonSettings
	from '../3rdparty/AddonSettings/AddonSettings.js';
import { VD } from './vd.js';

addonSettings.loadOptions().then(() => {
	console.info('AddonSettings module loaded.');
});
addonSettings.setCaching(false);

const vd = new VD();
browser.downloads.onChanged.addListener(delta => vd.handleDownloadChanged(delta));
browser.downloads.onCreated.addListener(downloadItem => vd.handleDownloadCreated(downloadItem));
browser.menus.onClicked.addListener(info => vd.handleMenuClicked(info));
browser.runtime.onInstalled.addListener(() => vd.handleInstalled());
