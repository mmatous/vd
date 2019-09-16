# TinyWebExt MessageHandler

A handler for showing customizable, hidable notification messages in your add-on.

## Features

* automatically logs shown messages to the console
* automatic translation of messages passed in
* dismissable messages
* messages with an action button

## Setup

This module requires a specific HTML markup to be included in the HTML file, where you want to show messages. If a specific message markup is not included or malformed, the module cannot show an error (of this type). Here is how the HTML should be structured:

* All messages must be included in the HTML element with the class `message-container`.
* Inside of that, there must be message (DIVs) with the class `message-box`.
* The subelement `message-text` contains the text of the message, `message-action-button` marks an optional action button and `icon-dismiss` shows an optional icon to dismiss a warning.
* The individual different message types need a specific unique ID, i.e. `messageLoading`, `messageInfo`, `messageSuccess`, `messageWarning` and `messageError` if you want to use the [common messages](#common-messages). These IDs are [hardcoded in the init function of `CommonMessages.js`).
* You should also have aria labels and other elements set.

In the end, here is a copy template on how it should look, [taken from the unit tests](./tests/messageHandler/baseCode.html):
```html
<div class="message-container">
	<div id="messageLoading" aria-label="loading message" data-i18n data-i18n-aria-label="__MSG_ariaMessageLoading__" class="message-box info invisible fade-hide">
		<span class="message-text">wait wait wait</span>
	</div>
	<div id="messageInfo" aria-label="info message" data-i18n data-i18n-aria-label="__MSG_ariaMessageInfo__" class="message-box info invisible fade-hide">
		<span class="message-text">FYI</span>
		<a href="#">
			<button type="button" class="message-action-button micro-button info invisible"></button>
		</a>
		<img class="icon-dismiss invisible" src="/common/img/close.svg" width="24" height="24" tabindex="0" data-i18n data-i18n-aria-label="__MSG_dismissIconDescription__"></span>
	</div>
	<div id="messageSuccess" aria-label="success message" data-i18n data-i18n-aria-label="__MSG_ariaMessageSuccess__" class="message-box success invisible fade-hide">
		<span class="message-text">That worked!</span>
		<a href="#">
			<button type="button" class="message-action-button micro-button success invisible"></button>
		</a>
		<img class="icon-dismiss invisible" src="/common/img/close.svg" width="24" height="24" tabindex="0" data-i18n data-i18n-aria-label="__MSG_dismissIconDescription__"></span>
	</div>
	<div id="messageError" aria-label="error message" data-i18n data-i18n-aria-label="__MSG_ariaMessageError__" class="message-box error invisible fade-hide">
		<span class="message-text">An error happened.</span>
		<a href="#">
			<button type="button" class="message-action-button micro-button error invisible"></button>
		</a>
		<img class="icon-dismiss invisible" src="/common/img/close.svg" width="24" height="24" tabindex="0" data-i18n data-i18n-aria-label="__MSG_dismissIconDescription__"></span>
	</div>
	<div id="messageWarning" aria-label="warning message" data-i18n data-i18n-aria-label="__MSG_ariaMessageWarning__" class="message-box warning invisible fade-hide">
		<span class="message-text">There were some difficulties.</span>
		<a href="#">
			<button type="button" class="message-action-button micro-button warning invisible"></button>
		</a>
		<img class="icon-dismiss invisible" src="/common/img/close.svg" width="24" height="24" tabindex="0" data-i18n data-i18n-aria-label="__MSG_dismissIconDescription__"></span>
	</div>
</div>
```

If one of the (optional) elements, such as a dismiss icon or action button is not present in the HTML code, and someone tries to use it via JS, this will just be ignored, i.e. the HTML has precendence over JS and limits whether it is even possible to show a button/dismiss icon/...
Note that if the whole message type DIV is not there, this will lead to errors.

## Showing messages

### Common Messages

If you want do show error or other messages, you can then just call:
```js
CommonMessages.showError("errorMessage");
```

Respectively hide them with:
```js
CommonMessages.hideError();
```

There are function available for each message type.

### Custom Messages

The [`CustomMessages.js`](CustomMessages.js) module is also used by the `CommonMessages.js` as it's core, i.e. it's also a good rreference to see how the `CustomMessages.js` file is used.

Basicaly, this is the workflow you have to follow:
* First, register your message type with `registerMessageType`. You have to pass it some required values for the message type, such as an ID and a HTML element to use.
* For showing/hiding the message or binding a [hook](#hooks) to the message type, you can then just call `CustomMessages.showMessage`, `CustomMessages.hideMessage` or `CustomMessages.setHook` with the message ID you've registered before.

It is recommend to save the message ID in some constant in your source code, so typos do not lead to major problems. :wink:

### Parameters

All functions that show a message (i.e. `showMessage` etc) do have the same syntax for parameters.

* The first parameter is the string top show or translate. (it automatically searches for translations)
* There is a boolean, you can use to enable the user to dismiss the message.
* You can pass an `actionButton` object, with a `text` for the button and an `action`, i.e. URL or JS function to open/execute, when the button is pressed.
* Any other parameters can be passed for translation.

In such a way you can do something as complex as this:
```js
CommonMessages.showSuccess("resettingOptionsWorked", true, {
    text: "messageUndoButton",
    action: () => {
        browser.storage.sync.set(lastOptionsBeforeReset).then(() => {
            // re-load the options again
            return loadAllOptions();
        }).catch((error) => {
            console.error("Could not undo option resetting: ", error);
            CommonMessages.showError("couldNotUndoAction");
        }).finally(() => {
            CommonMessages.hideSuccess();
        });
    }
})
```

(This is actually [used in TinyWebEx AutomaticSettings](https://github.com/TinyWebEx/AutomaticSettings).)

### Hooks

You can set different hooks (callbacks) that are executed when a message is shown, hidden or dismissed.

**Important:** When a message is dismissed, it is also always hidden afterwards, i.e. both events are triggered.

For this, the function `setHook`, respectively `setGlobalHook` allow you to register callbacks for one message type or all message types.

**Important:** Only one hook can be registered at a time. (Also for global hooks!) Thus, if you want to unset a hook, you can just "register" a new one with the value `null`.

## i18n/l10n

This module does require some specific localisations. Example localisation files for these are included in the [examples dir](`examples/_locales`).
