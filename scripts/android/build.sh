#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$SDK/build-tools/36.0.0"
BUILD="$ROOT/android/app/build"
VARIANT="${KAIFAN_ANDROID_VARIANT:-debug}"
case "$VARIANT" in debug|release) ;; *) echo 'KAIFAN_ANDROID_VARIANT must be debug or release' >&2; exit 2;; esac
MANIFEST="$ROOT/android/app/src/main/AndroidManifest.xml"
APK="$ROOT/outputs/kaifan-monster-android-$VARIANT.apk"
PLATFORM="$SDK/platforms/android-36/android.jar"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/generated/java/com/kaifan/monster" "$ROOT/outputs"
node "$ROOT/scripts/android/build-web.cjs"
if [ "$VARIANT" = release ]; then
 python3 - "$MANIFEST" "$BUILD/generated/AndroidManifest-release.xml" <<'PYXML'
import sys,xml.etree.ElementTree as ET
p=ET.parse(sys.argv[1]);p.getroot().find('application').set('{http://schemas.android.com/apk/res/android}debuggable','false');p.write(sys.argv[2],encoding='utf-8',xml_declaration=True)
PYXML
 MANIFEST="$BUILD/generated/AndroidManifest-release.xml"
fi
cat > "$BUILD/generated/java/com/kaifan/monster/BuildConfig.java" <<'JAVA'
package com.kaifan.monster; public final class BuildConfig { public static final boolean DEBUG=true; }
JAVA
if [ "$VARIANT" = release ]; then
 python3 - "$BUILD/generated/java/com/kaifan/monster/BuildConfig.java" <<'PYJAVA'
import sys
from pathlib import Path
p=Path(sys.argv[1]);p.write_text(p.read_text().replace('DEBUG=true','DEBUG=false'))
PYJAVA
fi
"$BT/aapt2" compile --dir "$ROOT/android/app/src/main/res" -o "$BUILD/resources.zip"
"$BT/aapt2" compile --no-crunch --dir "$BUILD/generated/res" -o "$BUILD/brand-resources.zip"
"$BT/aapt2" link -o "$BUILD/resources.apk" -I "$PLATFORM" --manifest "$MANIFEST" --java "$BUILD/generated/java" --auto-add-overlay -A "$BUILD/generated/assets" "$BUILD/resources.zip" "$BUILD/brand-resources.zip"
find "$ROOT/android/app/src/main/java" "$BUILD/generated/java" -name '*.java' > "$BUILD/java-sources.txt"
"$JAVA_HOME/bin/javac" -source 8 -target 8 -encoding UTF-8 -bootclasspath "$PLATFORM:$BT/core-lambda-stubs.jar" -classpath "$ROOT/android/app/libs/zxing-core-3.5.3.jar" -d "$BUILD/classes" @"$BUILD/java-sources.txt"
find "$BUILD/classes" -name '*.class' > "$BUILD/class-files.txt"
"$BT/d8" --min-api 26 --lib "$PLATFORM" --output "$BUILD/dex" @"$BUILD/class-files.txt" "$ROOT/android/app/libs/zxing-core-3.5.3.jar"
cp "$BUILD/resources.apk" "$BUILD/unsigned.apk"
(cd "$BUILD/dex" && zip -q -u "$BUILD/unsigned.apk" classes*.dex)
"$BT/zipalign" -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ "$VARIANT" = release ]; then
 python3 "$ROOT/scripts/sign-android-release.py" "$BUILD/aligned.apk"
else
KEY="$HOME/.android/kaifan-debug.keystore"
if [ ! -f "$KEY" ]; then
 mkdir -p "$HOME/.android"
 "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$KEY" -storepass android -keypass android -alias kaifan-debug -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Kaifan Android Debug,O=Local Development,C=CN' -noprompt
 chmod 600 "$KEY"
fi
"$BT/apksigner" sign --ks "$KEY" --ks-key-alias kaifan-debug --ks-pass pass:android --key-pass pass:android --out "$APK" "$BUILD/aligned.apk"
fi
"$BT/apksigner" verify --verbose "$APK"
"$BT/aapt2" dump badging "$APK" | sed -n '1,14p'
# Only this task's disposable package intermediates; keep generated sources for core/UI verification.
rm -f "$BUILD/resources.apk" "$BUILD/unsigned.apk" "$BUILD/aligned.apk" "$BUILD/resources.zip" "$BUILD/brand-resources.zip" "$APK.idsig"
