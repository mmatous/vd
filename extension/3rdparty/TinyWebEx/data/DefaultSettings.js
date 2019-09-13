import { Settings } from '../../../constants.js';

export const DEFAULT_SETTINGS = Object.freeze({
	[Settings.useAutodetect]: true,

	[Settings.digestRules]: String.raw`^https://.*\.dl\.sourceforge\.net/project/gparted/gparted-live-stable || https://gparted.org/gparted-live/stable/CHECKSUMS.TXT`
							+ String.raw`${'\n'}^https?://.*/releases/(\d{2})/(\w*[^/])/(\w[\d_]*)/iso/.*-(\d\.\d).iso || https://getfedora.org/static/checksums/Fedora-$|2|-$|1|-$|4|-$|3|-CHECKSUM`,
	[Settings.signatureRules]: String.raw`^https://launchpadlibrarian.net/\d{9}/VeraCrypt%20Setup%20(\d{1}\.\d{2})(.*).exe || https://launchpad.net/veracrypt/trunk/$|1|/+download/VeraCrypt%20Setup%20$|1|$|2|.exe.sig`
});
