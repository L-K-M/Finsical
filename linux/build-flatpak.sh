#!/usr/bin/env bash
# Build out/Finsical-<version>-linux.flatpak: the Linux tarball's tree
# as a Flatpak on the GNOME runtime, bundled for a one-file install.
# Usage: linux/build-flatpak.sh [--install]
#   --install  also install the result for the current user
#
# The bundle names Flathub as its runtime's source, so installing it
# fetches the GNOME runtime from there. Needs flatpak and
# flatpak-builder; the runtime and SDK come from Flathub (user
# installation) on the first build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly SCRIPT_DIR REPOSITORY_ROOT
readonly OUT_DIR="$REPOSITORY_ROOT/out"
readonly WORK_DIR="$OUT_DIR/flatpak"
readonly APP_ID=dev.finsical.app
readonly MANIFEST="$SCRIPT_DIR/$APP_ID.yml"
readonly FLATHUB_REPO=https://dl.flathub.org/repo/flathub.flatpakrepo

die() {
  echo "build-flatpak.sh: $*" >&2
  exit 1
}

install_requested=0
for argument in "$@"; do
  case "$argument" in
    --install) install_requested=1 ;;
    -h|--help) sed -n '2,4s/^# //p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $argument" >&2; exit 2 ;;
  esac
done

command -v flatpak >/dev/null 2>&1 || die "flatpak not found: install flatpak"
command -v flatpak-builder >/dev/null 2>&1 ||
  die "flatpak-builder not found: install flatpak-builder"

cd "$REPOSITORY_ROOT"
VERSION="$(node -p 'require("./package.json").version')"
readonly VERSION

# The tarball is the staged tree: the same files, launcher and desktop
# entry (Exec=finsical, found on the sandbox's PATH).
"$SCRIPT_DIR/build-tarball.sh"
rm -rf "$WORK_DIR/stage" "$WORK_DIR/repo"
mkdir -p "$WORK_DIR/stage"
tar -xzf "$OUT_DIR/Finsical-$VERSION-linux.tar.gz" --strip-components=1 \
  -C "$WORK_DIR/stage"

flatpak remote-add --user --if-not-exists flathub "$FLATHUB_REPO"
# --disable-rofiles-fuse: containers (CI) have no FUSE, and a copy-only
# build gains nothing from it.
flatpak-builder --user --install-deps-from=flathub --force-clean \
  --disable-rofiles-fuse \
  --state-dir="$WORK_DIR/state" --repo="$WORK_DIR/repo" \
  "$WORK_DIR/build" "$MANIFEST"

readonly BUNDLE="$OUT_DIR/Finsical-$VERSION-linux.flatpak"
flatpak build-bundle --runtime-repo="$FLATHUB_REPO" \
  "$WORK_DIR/repo" "$BUNDLE" "$APP_ID"

if ((install_requested)); then
  flatpak install --user -y --noninteractive --bundle "$BUNDLE"
fi
echo "Built ${BUNDLE#"$REPOSITORY_ROOT"/}"
