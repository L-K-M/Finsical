#!/usr/bin/env bash
# Build out/Finsical-<version>-linux.deb: the web app plus the GTK shell.
# Usage: linux/build-deb.sh [--check]
#   --check  also validate the package (desktop-file-validate, appstreamcli, lintian)
#
# A plain dpkg-deb build of a staged tree (no debhelper): Architecture
# all, native version from package.json, reproducible for a given
# SOURCE_DATE_EPOCH (default: the last commit's time).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly SCRIPT_DIR REPOSITORY_ROOT
readonly OUT_DIR="$REPOSITORY_ROOT/out"
readonly PACKAGE=finsical
readonly APP_ID=dev.finsical.app
readonly MAINTAINER="Lukas Mathis <L-K-M@users.noreply.github.com>"
# Section games (Policy 11.11): the program in /usr/games, its manual
# in section 6.
readonly SECTION=games
readonly BIN_DIR=usr/games
readonly MAN_SECTION=6
# Private modules and data go under /usr/share/<package> (Debian
# Python Policy 5.3); the launcher finds them relative to itself.
readonly SHARE_DIR="usr/share/$PACKAGE"
readonly DOC_DIR="usr/share/doc/$PACKAGE"
readonly ICON_SOURCE="$REPOSITORY_ROOT/media-sources/icon-finsical.png"
# 512 is the largest plain size in hicolor's index.theme; AppStream
# wants at least 64.
readonly ICON_SIZES=(16 22 24 32 48 64 128 256 512)
# What `npm run build` puts in dist/, as macos/Makefile ships it.
readonly WEB_FILES=(index.html overview.html addons.html prefs.html stats.html
                    bundle.js overview.js addons.js prefs.js stats.js
                    app.css osmium.css)
readonly DEPENDS="python3 (>= 3.10), python3-gi, python3-gi-cairo, gir1.2-gtk-3.0, gir1.2-webkit2-4.1 (>= 2.40)"
# GStreamer's AIFF and AAC decoders, for importing .aiff and .m4a sounds.
readonly RECOMMENDS="gstreamer1.0-plugins-bad"
# Renders the icons (GdkPixbuf through PyGObject).
readonly PYTHON="${PYTHON:-/usr/bin/python3}"

die() {
  echo "build-deb.sh: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 not found: $2"
}

check_requested=0
for argument in "$@"; do
  case "$argument" in
    --check) check_requested=1 ;;
    -h|--help) sed -n '2,4s/^# //p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $argument" >&2; exit 2 ;;
  esac
done

# --- Prerequisites ------------------------------------------------------------
require_command dpkg-deb "install dpkg"
require_command npm "install Node.js and npm"
require_command node "install Node.js"
require_command gzip "install gzip"
"$PYTHON" - <<'PY' 2>/dev/null ||
import gi
gi.require_version("GdkPixbuf", "2.0")
from gi.repository import GdkPixbuf
PY
  die "$PYTHON cannot load GdkPixbuf through PyGObject (it renders the icons):" \
      "install python3-gi and gir1.2-gdkpixbuf-2.0, or set PYTHON to a python3 that has them"
if ((check_requested)); then
  require_command desktop-file-validate "install desktop-file-utils"
  require_command appstreamcli "install appstream"
  require_command lintian "install lintian"
fi
[[ -d "$REPOSITORY_ROOT/node_modules/osmium-ui" ]] ||
  die "node_modules is missing: run npm ci in the repository root"

cd "$REPOSITORY_ROOT"
VERSION="$(node -p 'require("./package.json").version')"
# A native Debian version: no "-revision", and a hyphenated pre-release
# would turn it into a non-native one with a different changelog name.
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "package.json version '$VERSION' is not plain X.Y.Z"
readonly VERSION

# Reproducibility: one timestamp for every mtime, the gzip headers (-n)
# and dpkg-deb's ar/tar headers (it reads SOURCE_DATE_EPOCH itself).
if [[ -z "${SOURCE_DATE_EPOCH:-}" ]]; then
  SOURCE_DATE_EPOCH="$(git -C "$REPOSITORY_ROOT" log -1 --format=%ct 2>/dev/null)" ||
    die "not a git checkout: set SOURCE_DATE_EPOCH"
fi
export SOURCE_DATE_EPOCH LC_ALL=C TZ=UTC
RELEASE_DAY="$(date -u -d "@$SOURCE_DATE_EPOCH" +%F)" ||
  die "SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH is not a Unix timestamp"
RELEASE_TIME="$(date -u -R -d "@$SOURCE_DATE_EPOCH")"
readonly RELEASE_DAY RELEASE_TIME

npm run build

umask 022
WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT
readonly ROOT="$WORK/root"
install -d -m 0755 "$ROOT/DEBIAN" "$ROOT/$BIN_DIR" "$ROOT/$SHARE_DIR/finsical_shell" \
  "$ROOT/$SHARE_DIR/web" "$ROOT/usr/share/applications" "$ROOT/usr/share/metainfo" \
  "$ROOT/$DOC_DIR" "$ROOT/usr/share/man/man$MAN_SECTION" "$ROOT/usr/share/lintian/overrides"

# --- Program ------------------------------------------------------------------
install -m 0755 "$SCRIPT_DIR/finsical" "$ROOT/$BIN_DIR/$PACKAGE"
# Only the modules: no tests, and no bytecode (compiled at install).
install -m 0644 "$SCRIPT_DIR"/finsical_shell/*.py "$ROOT/$SHARE_DIR/finsical_shell/"
for file in "${WEB_FILES[@]}"; do
  [[ -f "dist/$file" ]] || die "dist/$file is missing after npm run build"
  install -m 0644 "dist/$file" "$ROOT/$SHARE_DIR/web/$file"
done
# The machine cases are required: fail rather than ship no silhouette.
[[ -d dist/assets ]] || die "dist/assets is missing after npm run build"
cp -R dist/assets "$ROOT/$SHARE_DIR/web/assets"
# An optional bundled pack (gitignored), as the macOS app ships it.
if [[ -d web/pack ]]; then
  cp -R web/pack "$ROOT/$SHARE_DIR/web/pack"
fi
printf '%s\n' "$VERSION" > "$ROOT/$SHARE_DIR/version.txt"

# --- Desktop integration ------------------------------------------------------
install -m 0644 "$SCRIPT_DIR/$APP_ID.desktop" "$ROOT/usr/share/applications/"
sed -e '/<!-- Template:/d' -e "s|@VERSION@|$VERSION|" -e "s|@DATE@|$RELEASE_DAY|" \
  "$SCRIPT_DIR/$APP_ID.metainfo.xml" > "$ROOT/usr/share/metainfo/$APP_ID.metainfo.xml"
# GdkPixbuf writes no timestamps into the PNGs, so they are reproducible.
"$PYTHON" - "$ICON_SOURCE" "$ROOT/usr/share/icons/hicolor" "$APP_ID" "${ICON_SIZES[@]}" <<'PY'
import os
import sys

import gi
gi.require_version("GdkPixbuf", "2.0")
from gi.repository import GdkPixbuf

source, theme, name, *sizes = sys.argv[1:]
art = GdkPixbuf.Pixbuf.new_from_file(source)
if art.get_width() != art.get_height():
    sys.exit(f"build-deb.sh: {source} is not square")
for size in map(int, sizes):
    folder = os.path.join(theme, f"{size}x{size}", "apps")
    os.makedirs(folder, exist_ok=True)
    icon = art.scale_simple(size, size, GdkPixbuf.InterpType.HYPER)
    icon.savev(os.path.join(folder, f"{name}.png"), "png", [], [])
PY

# --- Documentation ------------------------------------------------------------
# copyright: DEP-5, uncompressed (Policy 12.5). The Unlicense stanza is
# generated from LICENSE so it stays verbatim.
{
  cat "$SCRIPT_DIR/copyright.in"
  printf '\nLicense: Unlicense\n'
  sed -e 's/^$/./' -e 's/^/ /' LICENSE
} > "$ROOT/$DOC_DIR/copyright"
# A native package's changelog is changelog.gz in Debian format; the
# Markdown release notes are NEWS.gz (Policy 12.7). gzip -9n: maximum
# compression, no name or timestamp in the header.
sed -e "s|@VERSION@|$VERSION|" -e "s|@DATE@|$RELEASE_TIME|" -e "s|@MAINTAINER@|$MAINTAINER|" \
  "$SCRIPT_DIR/changelog.in" | gzip -9n > "$ROOT/$DOC_DIR/changelog.gz"
gzip -9n < CHANGELOG.md > "$ROOT/$DOC_DIR/NEWS.gz"
install -m 0644 THIRD_PARTY_NOTICES.md "$ROOT/$DOC_DIR/"
sed -e '/^\.\\" Template:/d' -e "s|@VERSION@|$VERSION|" -e "s|@DATE@|$RELEASE_DAY|" \
  "$SCRIPT_DIR/$PACKAGE.$MAN_SECTION" | gzip -9n > "$ROOT/usr/share/man/man$MAN_SECTION/$PACKAGE.$MAN_SECTION.gz"
# The web UI's pages and version.txt trip an info-level heuristic for
# documentation.
cat > "$ROOT/usr/share/lintian/overrides/$PACKAGE" <<EOF
# HTML pages of the app's web UI, not documentation.
$PACKAGE: package-contains-documentation-outside-usr-share-doc [$SHARE_DIR/web/*.html]
# The version the app shows in About. version.txt is on lintian's own
# list of non-documentation names, but lintian 2.117 applies that list
# with "any" instead of "all" (Lintian/Check/Documentation.pm).
$PACKAGE: package-contains-documentation-outside-usr-share-doc [$SHARE_DIR/version.txt]
EOF

# --- Permissions (independent of the checkout's modes and the umask) ---------
find "$ROOT" -type d -exec chmod 0755 {} +
find "$ROOT" -type f -exec chmod 0644 {} +
chmod 0755 "$ROOT/$BIN_DIR/$PACKAGE"
if [[ -n "$(find "$ROOT" \( -name __pycache__ -o -name '*.py[co]' \) -print -quit)" ]]; then
  die "bytecode in the staged tree; it must be compiled at install time"
fi

# --- Control area -------------------------------------------------------------
# dpkg-gencontrol's rule (Policy 5.6.20): each file or symlink rounded
# up to whole KiB, 1 KiB for anything else.
INSTALLED_SIZE="$(find "$ROOT" -path "$ROOT/DEBIAN" -prune -o -printf '%y %s\n' |
  awk '$1 == "f" || $1 == "l" { s += int(($2 + 1023) / 1024); next } { s += 1 } END { print s }')"

cat > "$ROOT/DEBIAN/control" <<EOF
Package: $PACKAGE
Version: $VERSION
Architecture: all
Maintainer: $MAINTAINER
Installed-Size: $INSTALLED_SIZE
Depends: $DEPENDS
Recommends: $RECOMMENDS
Section: $SECTION
Priority: optional
Homepage: https://github.com/L-K-M/Finsical
Description: retro virtual aquarium
 Finsical shows little pixel fish in a floating window shaped like a
 vintage computer, in the spirit of the 90s Mac classic AquaZone.
 .
 It ships no copyrighted assets: fish, plants, scenery and sounds from
 the original game's add-ons can be imported from the Internet Archive
 or from your own copy.
EOF

# What dh_python3 generates for a private module directory (dh-python's
# postinst-py3compile and prerm-py3clean): compile at install with the
# system's python3, and remove the bytecode before dpkg removes the
# directories, or they are left behind.
cat > "$ROOT/DEBIAN/postinst" <<EOF
#!/bin/sh
set -e
if command -v py3compile >/dev/null 2>&1; then
	py3compile -p $PACKAGE /$SHARE_DIR
fi
EOF
cat > "$ROOT/DEBIAN/prerm" <<EOF
#!/bin/sh
set -e
if command -v py3clean >/dev/null 2>&1; then
	py3clean -p $PACKAGE
else
	dpkg -L $PACKAGE | sed -En -e '/^(.*)\/(.+)\.py\$/s,,rm "\1/__pycache__/\2".*,e'
fi
EOF
chmod 0755 "$ROOT/DEBIAN/postinst" "$ROOT/DEBIAN/prerm"

(cd "$ROOT" && find . -path ./DEBIAN -prune -o -type f -printf '%P\0' | sort -z |
  xargs -0 md5sum) > "$ROOT/DEBIAN/md5sums"
chmod 0644 "$ROOT/DEBIAN/control" "$ROOT/DEBIAN/md5sums"

# dpkg-deb only lowers mtimes newer than SOURCE_DATE_EPOCH; set them all.
find "$ROOT" -exec touch -h -d "@$SOURCE_DATE_EPOCH" {} +

mkdir -p "$OUT_DIR"
readonly DEB="$OUT_DIR/Finsical-$VERSION-linux.deb"
# -Zxz: Ubuntu's dpkg-deb defaults to zstd, which older dpkg can't read.
# --root-owner-group: root:root entries without fakeroot.
dpkg-deb --root-owner-group -Zxz --build "$ROOT" "$DEB"

# --- Checks -------------------------------------------------------------------
if ((check_requested)); then
  CHECK="$WORK/check"
  dpkg-deb -x "$DEB" "$CHECK"
  desktop-file-validate "$CHECK/usr/share/applications/$APP_ID.desktop"
  appstreamcli validate-tree --no-net "$CHECK"
  lintian --profile debian --display-info --fail-on error,warning "$DEB"
  echo "Checks passed"
fi
echo "Built ${DEB#"$REPOSITORY_ROOT"/}"
