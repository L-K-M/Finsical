#!/usr/bin/env bash
# Build out/Finsical-<version>-linux.tar.gz: the web app plus the GTK
# shell, for distros without dpkg.
# Usage: linux/build-tarball.sh
#
# The tree is a prefix: bin/finsical finds its files in share/finsical
# beside it, so the tarball can be unpacked anywhere and run in place,
# or merged into /usr/local or ~/.local with --strip-components=1.
# Reproducible for a given SOURCE_DATE_EPOCH (default: the last
# commit's time), matching build-deb.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly SCRIPT_DIR REPOSITORY_ROOT
readonly OUT_DIR="$REPOSITORY_ROOT/out"
readonly PACKAGE=finsical
readonly APP_ID=dev.finsical.app
readonly ICON_SOURCE="$REPOSITORY_ROOT/media-sources/icon-finsical.png"
# The .deb's sizes (build-deb.sh); a Flatpak refuses an icon larger
# than its folder says.
readonly ICON_SIZES=(16 22 24 32 48 64 128 256 512)
# Renders the icons (GdkPixbuf through PyGObject).
readonly PYTHON="${PYTHON:-/usr/bin/python3}"
# The same web payload build-deb.sh installs under /usr/share/finsical.
readonly WEB_FILES=(index.html overview.html addons.html prefs.html stats.html
                    bundle.js overview.js addons.js prefs.js stats.js
                    app.css osmium.css icon.svg)
readonly MACE_SOURCE=core/data/mace.ts

die() {
  echo "build-tarball.sh: $*" >&2
  exit 1
}

for argument in "$@"; do
  case "$argument" in
    -h|--help) sed -n '2,4s/^# //p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $argument" >&2; exit 2 ;;
  esac
done

command -v npm >/dev/null 2>&1 || die "npm not found: install Node.js and npm"
command -v node >/dev/null 2>&1 || die "node not found: install Node.js"
command -v tar >/dev/null 2>&1 || die "tar not found"
"$PYTHON" -c 'import gi; gi.require_version("GdkPixbuf", "2.0"); from gi.repository import GdkPixbuf' 2>/dev/null ||
  die "$PYTHON cannot load GdkPixbuf through PyGObject (it renders the icons):" \
      "install python3-gi and gir1.2-gdkpixbuf-2.0, or set PYTHON to a python3 that has them"
[[ -d "$REPOSITORY_ROOT/node_modules/osmium-ui" ]] ||
  die "node_modules is missing: run npm ci in the repository root"

cd "$REPOSITORY_ROOT"
VERSION="$(node -p 'require("./package.json").version')"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "package.json version '$VERSION' is not plain X.Y.Z"
readonly VERSION

if [[ -z "${SOURCE_DATE_EPOCH:-}" ]]; then
  SOURCE_DATE_EPOCH="$(git -C "$REPOSITORY_ROOT" log -1 --format=%ct 2>/dev/null)" ||
    die "not a git checkout: set SOURCE_DATE_EPOCH"
fi
export SOURCE_DATE_EPOCH LC_ALL=C TZ=UTC
RELEASE_DAY="$(date -u -d "@$SOURCE_DATE_EPOCH" +%F)"

npm run build

umask 022
WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT
TOP="$WORK/Finsical-$VERSION-linux"
install -d -m 0755 "$TOP/bin" "$TOP/share/$PACKAGE/finsical_shell" \
  "$TOP/share/$PACKAGE/web" "$TOP/share/$PACKAGE/core/data" \
  "$TOP/share/applications" "$TOP/share/metainfo" \
  "$TOP/share/man/man6"

# --- Program ------------------------------------------------------------------
# The launcher looks for share/finsical next to bin/ (same relative
# layout as the .deb's /usr tree), so this tree runs from anywhere.
install -m 0755 "$SCRIPT_DIR/finsical" "$TOP/bin/$PACKAGE"
install -m 0644 "$SCRIPT_DIR"/finsical_shell/*.py "$TOP/share/$PACKAGE/finsical_shell/"
for file in "${WEB_FILES[@]}"; do
  [[ -f "dist/$file" ]] || die "dist/$file is missing after npm run build"
  install -m 0644 "dist/$file" "$TOP/share/$PACKAGE/web/$file"
done
[[ -d dist/assets ]] || die "dist/assets is missing after npm run build"
cp -R dist/assets "$TOP/share/$PACKAGE/web/assets"
if [[ -d web/pack ]]; then
  cp -R web/pack "$TOP/share/$PACKAGE/web/pack"
fi
printf '%s\n' "$VERSION" > "$TOP/share/$PACKAGE/version.txt"
install -m 0644 "$MACE_SOURCE" "$TOP/share/$PACKAGE/$MACE_SOURCE"

# --- Desktop integration ------------------------------------------------------
# Unlike the .deb's absolute Exec=/usr/games/finsical, the tarball's
# desktop file resolves through PATH so extracting under /usr/local or
# ~/.local works without edits.
sed 's|^Exec=/usr/games/finsical|Exec=finsical|' \
  "$SCRIPT_DIR/$APP_ID.desktop" > "$TOP/share/applications/$APP_ID.desktop"
chmod 0644 "$TOP/share/applications/$APP_ID.desktop"
sed -e '/<!-- Template:/d' -e "s|@VERSION@|$VERSION|" -e "s|@DATE@|$RELEASE_DAY|" \
  "$SCRIPT_DIR/$APP_ID.metainfo.xml" > "$TOP/share/metainfo/$APP_ID.metainfo.xml"
"$PYTHON" "$SCRIPT_DIR/render-icons.py" "$ICON_SOURCE" \
  "$TOP/share/icons/hicolor" "$APP_ID" "${ICON_SIZES[@]}"
# The man page's @VERSION@/@DATE@ get the same fill-in as build-deb.sh.
sed -e '/^\.\\" Template:/d' -e "s|@VERSION@|$VERSION|" -e "s|@DATE@|$RELEASE_DAY|" \
  "$SCRIPT_DIR/$PACKAGE.6" | gzip -9n > "$TOP/share/man/man6/$PACKAGE.6.gz"
install -m 0644 THIRD_PARTY_NOTICES.md LICENSE "$TOP/"
# The LGPL decoder's license text, as the macOS/Android builds ship it
# (the .deb can instead point at the system's common-licenses copy).
install -D -m 0644 LICENSES/LGPL-2.1.txt "$TOP/LICENSES/LGPL-2.1.txt"

cat > "$TOP/README.txt" <<EOF
Finsical $VERSION for Linux
===========================

A portable tree for distros without dpkg. It needs GTK 4.12+,
WebKitGTK 2.40+ with its 6.0 API, and PyGObject from your distro's
packages:

    Debian/Ubuntu: python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-webkit-6.0
    Fedora:        python3-gobject python3-cairo gtk4 webkitgtk6.0
    Arch:          python-gobject python-cairo gtk4 webkitgtk-6.0

The Flatpak (Finsical-$VERSION.flatpak) needs none of these.

Run in place:            ./bin/finsical
Install for yourself:    tar -xzf Finsical-$VERSION-linux.tar.gz \\
                           --strip-components=1 -C ~/.local
Install system-wide:     sudo tar -xzf Finsical-$VERSION-linux.tar.gz \\
                           --strip-components=1 -C /usr/local

Wayland note: run with GDK_BACKEND=wayland for a native Wayland window
(the tank can't float above other windows there; see the README's
Linux section on GitHub).
EOF

find "$TOP" -type d -exec chmod 0755 {} +
find "$TOP" -type f -exec chmod 0644 {} +
chmod 0755 "$TOP/bin/$PACKAGE"
if [[ -n "$(find "$TOP" \( -name '__pycache__' -o -name '*.py[co]' \) -print -quit)" ]]; then
  die "bytecode in the staged tree"
fi

mkdir -p "$OUT_DIR"
# Sorted names, root ownership, epoch mtimes and a bare gzip header
# make the artifact reproducible for a given SOURCE_DATE_EPOCH.
tar -C "$WORK" --sort=name --owner=0 --group=0 --numeric-owner \
    --mtime="@$SOURCE_DATE_EPOCH" \
    --use-compress-program='gzip -9n' \
    -cf "$OUT_DIR/Finsical-$VERSION-linux.tar.gz" \
    "$(basename "$TOP")"
echo "built $OUT_DIR/Finsical-$VERSION-linux.tar.gz"
