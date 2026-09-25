#!/usr/bin/env bash
# Verify Finsical and assemble a native app.
# Usage: scripts/build.sh [--target macos|deb|android] [--clean] [--run] [--install]
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly APP_PATH="$REPOSITORY_ROOT/macos/Finsical.app"
readonly INSTALL_PATH="/Applications/Finsical.app"
readonly OUT_DIR="$REPOSITORY_ROOT/out"
readonly ANDROID_DIR="$REPOSITORY_ROOT/android"
readonly ANDROID_ACTIVITY="dev.finsical.app/.MainActivity"
readonly DEB_PACKAGE="finsical"
readonly DEB_LAUNCHER="/usr/games/finsical"
readonly HOST_MACOS="Darwin"
readonly TARGET_MACOS="macos"
readonly TARGET_DEB="deb"
readonly TARGET_ANDROID="android"

usage() {
  sed -n '3s/^# //p' "$0" >&2
}

target=""
clean_requested=0
run_requested=0
install_requested=0

while (($#)); do
  case "$1" in
    --target)
      if (($# < 2)); then usage; exit 2; fi
      target="$2"
      shift
      ;;
    --target=*) target="${1#--target=}" ;;
    --clean) clean_requested=1 ;;
    --run) run_requested=1 ;;
    --install) install_requested=1 ;;
    -h|--help) sed -n '2,3s/^# //p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

host="$(uname -s)"
# Without --target, macOS packages the app as it always has; elsewhere
# only the checks run, so a plain call never needs a packaging toolchain.
if [[ -z "$target" && "$host" == "$HOST_MACOS" ]]; then
  target="$TARGET_MACOS"
fi

case "$target" in
  ""|"$TARGET_MACOS"|"$TARGET_DEB"|"$TARGET_ANDROID") ;;
  *) echo "Unknown target: $target (use macos, deb or android)" >&2; exit 2 ;;
esac

if [[ "$target" == "$TARGET_MACOS" && "$host" != "$HOST_MACOS" ]]; then
  echo "The macos target requires macOS." >&2
  exit 1
fi

if [[ -z "$target" ]] && ((install_requested || run_requested)); then
  echo "--install and --run need a target; pass --target deb or --target android." >&2
  exit 1
fi

cd "$REPOSITORY_ROOT"

version="$(node -p 'require("./package.json").version')"
readonly deb_path="$OUT_DIR/Finsical-$version-linux.deb"
readonly apk_debug_name="Finsical-$version-android-debug.apk"
readonly apk_unsigned_name="Finsical-$version-android-release-unsigned.apk"
readonly apk_debug_path="$OUT_DIR/$apk_debug_name"
readonly apk_unsigned_path="$OUT_DIR/$apk_unsigned_name"

if ((clean_requested)); then
  rm -rf -- "$REPOSITORY_ROOT/dist"
  case "$target" in
    "$TARGET_MACOS")
      rm -rf -- "$APP_PATH" "$REPOSITORY_ROOT/macos/Finsical.app.staging" ;;
    "$TARGET_DEB")
      rm -f -- "$OUT_DIR"/Finsical-*-linux.deb ;;
    "$TARGET_ANDROID")
      rm -rf -- "$ANDROID_DIR/build" "$ANDROID_DIR/app/build" "$ANDROID_DIR/.gradle"
      rm -f -- "$OUT_DIR"/Finsical-*-android-*.apk ;;
  esac
fi

# Also re-sync when the lockfile is newer than node_modules, so a pull that
# changed dependencies never verifies against the previously installed tree.
if [[ ! -d node_modules || package-lock.json -nt node_modules ]]; then
  npm ci
fi

npm run typecheck
npm test
python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .
# The Linux shell's pure logic imports without GTK, so it runs anywhere.
python3 -m unittest discover -s linux/tests -p 'test_*.py' -t linux

build_macos() {
  make -C macos

  if ((install_requested)); then
    rm -rf -- "$INSTALL_PATH"
    ditto "$APP_PATH" "$INSTALL_PATH"
    echo "Installed to $INSTALL_PATH"
    open -R "$INSTALL_PATH" 2>/dev/null ||
      echo "Skipped revealing in Finder (no GUI session)" >&2
  fi

  if ((run_requested)); then
    open "$APP_PATH"
  fi
}

build_deb() {
  "$REPOSITORY_ROOT/linux/build-deb.sh"

  if ((install_requested)); then
    local sudo=()
    ((EUID == 0)) || sudo=(sudo)
    # apt resolves the GTK and WebKitGTK dependencies; a path with a
    # slash tells it this is a file, not a package name.
    "${sudo[@]}" apt-get install --reinstall -y "$deb_path"
  fi

  if ((run_requested)); then
    # --run starts the installed app, so refuse a stale install rather
    # than launch a different version than the one just built.
    local installed
    installed="$(dpkg-query -W -f='${Version}' "$DEB_PACKAGE" 2>/dev/null || true)"
    if [[ "$installed" != "$version" ]]; then
      echo "Finsical $version is not installed (found: ${installed:-none}); add --install." >&2
      exit 1
    fi
    setsid -f "$DEB_LAUNCHER" >/dev/null 2>&1
  fi
}

build_android() {
  (cd "$ANDROID_DIR" && ./gradlew assembleDebug assembleRelease)
  mkdir -p "$OUT_DIR"
  cp "$ANDROID_DIR/app/build/outputs/apk/debug/$apk_debug_name" "$apk_debug_path"
  cp "$ANDROID_DIR/app/build/outputs/apk/release/$apk_unsigned_name" \
     "$apk_unsigned_path"
  echo "Built $apk_debug_path"
  echo "Built $apk_unsigned_path (sign it before distributing; see README)"

  if ((install_requested || run_requested)) && ! command -v adb >/dev/null; then
    echo "--install and --run need adb (Android SDK platform-tools) on PATH." >&2
    exit 1
  fi
  # The debug build: it is signed with this machine's debug key, so it
  # installs on a device or emulator without any release key.
  if ((install_requested)); then
    adb install -r "$apk_debug_path"
  fi
  if ((run_requested)); then
    adb shell am start -n "$ANDROID_ACTIVITY"
  fi
}

case "$target" in
  "$TARGET_MACOS") build_macos ;;
  "$TARGET_DEB") build_deb ;;
  "$TARGET_ANDROID") build_android ;;
  *) echo "Core verified; pass --target deb or --target android to package here (the macOS app requires macOS)." ;;
esac
