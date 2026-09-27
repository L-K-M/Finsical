#!/usr/bin/env bash
# Install a debug APK on the connected emulator or device, start the tank
# with the smoke-test extra and wait for its verdict in logcat.
# Usage: scripts/android-smoke.sh path/to/debug.apk [timeout-seconds]
set -euo pipefail

readonly ACTIVITY="dev.finsical.app/.MainActivity"
readonly SMOKE_EXTRA="dev.finsical.app.SMOKE_TEST"
readonly LOG_TAG="Finsical"
readonly PASS_MARK="FINSICAL_SMOKE PASS"
readonly FAIL_MARK="FINSICAL_SMOKE FAIL"
readonly POLL_SECONDS=5

if (($# < 1 || $# > 2)); then
  sed -n '4s/^# //p' "$0" >&2
  exit 2
fi

readonly apk="$1"
readonly timeout_seconds="${2:-180}"

adb wait-for-device
adb install -r "$apk"
adb logcat -c
# The Activity reads the extra only when it is created, and only in
# debuggable builds (see SmokeTest.java), so start from a stopped app.
adb shell am force-stop "${ACTIVITY%%/*}"
adb shell am start -W -n "$ACTIVITY" --ez "$SMOKE_EXTRA" true

deadline=$((SECONDS + timeout_seconds))
while ((SECONDS < deadline)); do
  log="$(adb logcat -d -s "$LOG_TAG:V")"
  if grep -qF "$PASS_MARK" <<<"$log"; then
    grep -F "FINSICAL_SMOKE" <<<"$log"
    exit 0
  fi
  if grep -qF "$FAIL_MARK" <<<"$log"; then
    echo "$log" >&2
    exit 1
  fi
  sleep "$POLL_SECONDS"
done

echo "No smoke-test verdict within ${timeout_seconds}s. Log so far:" >&2
adb logcat -d -s "$LOG_TAG:V" >&2
exit 1
