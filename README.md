# vd

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

Just works™ on every file download after installing the extension and application.
User feedback is currently limited to extension icon changes for the latest download. You can also consult browser console output.
Regular popup with a list of latest downloads is [in development](https://github.com/mmatous/vd/issues/1)

### Features

- Verify common digest files automatically (e.g. sha1sums or .md5 suffixes)

#### Planned
- Verify signatures
- User-defined lists for searching
- Context menu for manualy pairing digest/signature with download
- Nicer logo!

## Permissions

downloads — this is necessary so vd can access and react to downloads as well as initiate downloads of its own (digest files, signatures).

nativeMessaging — verification itself is performed outside of extension due to API limitations.

notifications — currently the only way of communicating with the user

<all_urls> — extension must be able to query any site to parse it for potential digest/signature links

## Build

On (almost) any OS call following in project directory:
```
yarn install
yarn build
```

## Install

#### Firefox

[Firefox Add-ons web site](https://addons.mozilla.org/en-US/firefox/addon/vdownloads/).

You will also need vd-verifier application. You can get it [here](https://github.com/mmatous/vd-verifier/releases)

#### Chromium based

[Not yet available](https://github.com/mmatous/vd/issues/3).

#### Safari

No plans for porting right now.

## About

### License

[GPLv3](LICENSE).

### Donate

BTC: [3B7EUmUb71q7WWdjLkyfssXVwzkTPSpuef](https://blockexplorer.com/address/3B7EUmUb71q7WWdjLkyfssXVwzkTPSpuef)

ETH: [0x7bd7BAF097F7AAA0733B92376aFf25B5E00FEa05](https://blockscout.com/eth/mainnet/address/0x7bd7baf097f7aaa0733b92376aff25b5e00fea05/)

XMR: 84TsTeWZ8ScZWPEK6yEuxCBG35UscCCd7h1bgjfwLYUcS9bgVPqXW4HUtBEYdRMbagauuuKGUwkxmRpsud2v12PmLQuyTd2
