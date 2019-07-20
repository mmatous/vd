import { Settings } from '../../../constants.js';

export const DEFAULT_SETTINGS = Object.freeze({
	[Settings.notifyError]: true,
	[Settings.notifyFail]: true,
	[Settings.notifySuccess]: true,

	[Settings.regexList]: String.raw`^https://.*\.dl\.sourceforge\.net/project/gparted/gparted-live-stable || https://gparted.org/gparted-live/stable/CHECKSUMS.TXT`
							+ String.raw`${'\n'}^https?://.*/releases/(\d{2})/(\w*[^/])/(\w[\d_]*)/iso/.*-(\d\.\d).iso || https://getfedora.org/static/checksums/Fedora-$|2|-$|1|-$|4|-$|3|-CHECKSUM`
});
