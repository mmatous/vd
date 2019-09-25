#!/usr/bin/env bash

BUILD_DIR=./build
SRC_DIR=.

mkdir -p "$BUILD_DIR"
rsync -a --relative "$SRC_DIR/3rdparty/AddonSettings/AddonSettings.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/AddonSettings/LICENSE.md" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/3rdparty/AutomaticSettings/AutomaticSettings.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/AutomaticSettings/internal" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/AutomaticSettings/LICENSE.md" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/3rdparty/data" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/3rdparty/Localizer/Localizer.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/Localizer/replaceInnerContent.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/Localizer/LICENSE.md" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/3rdparty/MessageHandler/CommonMessages.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/MessageHandler/CustomMessages.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/MessageHandler/LICENSE.md" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/3rdparty/lodash/_baseGetTag.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_freeGlobal.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_getPrototype.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_getRawTag.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_objectToString.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_overArg.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_root.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/_Symbol.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/debounce.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/isFunction.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/isObject.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/isObjectLike.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/isPlainObject.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/isSymbol.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/now.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/toNumber.js" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/3rdparty/lodash/LICENSE" "$BUILD_DIR/."

rsync -a --relative "$SRC_DIR/src" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/LICENSE" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/manifest.json" "$BUILD_DIR/."
rsync -a --relative "$SRC_DIR/_locales" "$BUILD_DIR/."
