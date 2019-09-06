# vd

[![GitHub](https://img.shields.io/github/license/mmatous/vd.svg?style=plastic)](https://github.com/mmatous/vd/blob/master/LICENSE)
[![Mozilla Add-on](https://img.shields.io/amo/v/vdownloads.svg?style=plastic)](https://addons.mozilla.org/en-US/firefox/addon/vdownloads/)
[![Crypto](https://img.shields.io/badge/donate-crypto-blue.svg?style=plastic)](https://github.com/mmatous/vd/wiki/Donate)

Browser extension for verifying downloads.

Currently early in development. Version deemed appropriate for general public will be released as [1.0.0](https://github.com/mmatous/vd/milestone/1). Do not install unless you are willing to manually update [vd-verifier](https://github.com/mmatous/vd-verifier/releases) often.

## Is this as secure and reliable as verifying manually?

No.

There is no way that is both standardized and widespread to store/transmit digests or
signatures. Therefore there is some guesswork involved as to what data belongs together.
This creates room for false positives or false negatives.
This extension is mostly here to help with scenarios where you would not do any checking at all
or where you simply don't care that much.

__Use your regular tools for anything mission critical.__

## Usage

Should just work™ on most file downloads after installing the extension and application.
In case the autodetect fails, user can right click either link to a file containing digest or
a text selection and designate those as either digest file or hex-encoded digest to be paired up
with a download.

User feedback is provided via notifications. You can also consult browser console output.

### Features

- Verify most common digest files automatically (e.g. sha1sums or .sha256 suffixes)
- Manually assign digest to downloaded file
- User-defined lists for searching
- Context menu for manualy pairing digest/signature with download

#### Planned
- Verify signatures
- Nicer logo!
- Localization & accessibility improvements

## Permissions

<all_urls>—extension must be able to query any site to parse it for potential digest/signature links

downloads—this is necessary so vd can access and react to downloads as well as initiate downloads of its own (digest files, signatures).

menus—currently the only way of communicating with the user

nativeMessaging—verification itself is performed outside of extension due to extension API limitations.

notifications—currently the only way of communicating with the user

storage—settings persistence

## Build

On (almost) any OS call following in project directory:
```
yarn install
yarn build
```

## Install

#### Firefox

Download from [![Mozilla Add-on](https://img.shields.io/amo/v/vdownloads.svg?style=plastic)](https://addons.mozilla.org/en-US/firefox/addon/vdownloads/).

You will also need vd-verifier application. You can get it [here](https://github.com/mmatous/vd-verifier/releases)

#### Chromium-based

[Not yet available](https://github.com/mmatous/vd/issues/3).

#### Safari

No plans for porting right now.

## About

### Software used

Libraries from the awesome [TinyWebEx](https://github.com/TinyWebEx) project by [rugk](https://github.com/rugk):

- AddonSettings. [MIT](https://github.com/TinyWebEx/AddonSettings/blob/b5e57fc456395613f6e1e5825c0ab670528eb552/LICENSE.md) license.

- AutomaticSettings. [MIT](https://github.com/TinyWebEx/AutomaticSettings/blob/0b630205ec0aa78628e95ed97137776e399df632/LICENSE.md) license.

### License

[GPLv3](LICENSE).
