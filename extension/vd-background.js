/*******************************************************************************
	vd — a browser extension to verify downloads.
	Copyright © 2019 Martin Matous
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/******************************************************************************/
/******************************************************************************/

'use strict';

import * as AddonSettings
	from './3rdparty/TinyWebEx/AddonSettings/AddonSettings.js';
import { handleMenuClicked } from './contextmenus.js';
import { handleDownloadChanged, handleDownloadCreated } from './vd.js';

AddonSettings.loadOptions().then(() => {
	console.info('AddonSettings module loaded.');
});
AddonSettings.setCaching(false);

browser.downloads.onChanged.addListener(handleDownloadChanged);
browser.downloads.onCreated.addListener(handleDownloadCreated);
browser.menus.onClicked.addListener(handleMenuClicked);
