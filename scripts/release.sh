#!/usr/bin/env bash
# Bump, verify, commit, and tag a native macOS release.
# Usage: scripts/release.sh X.Y.Z [--push]
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly INFO_PLIST="$REPOSITORY_ROOT/macos/Info.plist"
readonly README="$REPOSITORY_ROOT/README.md"
readonly PLIST_BUDDY="/usr/libexec/PlistBuddy"
readonly HOST_MACOS="Darwin"
readonly VERSION_PATTERN='^[0-9]+\.[0-9]+\.[0-9]+$'

usage() {
  echo "Usage: scripts/release.sh X.Y.Z [--push]" >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 2
fi

readonly version="$1"
readonly push_option="${2:-}"

if [[ ! "$version" =~ $VERSION_PATTERN ]]; then
  echo "Version must use X.Y.Z." >&2
  exit 2
fi

if [[ -n "$push_option" && "$push_option" != "--push" ]]; then
  usage
  exit 2
fi

if [[ "$(uname -s)" != "$HOST_MACOS" ]]; then
  echo "Releases require macOS." >&2
  exit 1
fi

cd "$REPOSITORY_ROOT"

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Releases must start on main." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean." >&2
  exit 1
fi

# Releasing from anything but origin/main itself tags a tree nobody has
# reviewed on the remote: behind means stale, ahead means unpushed.
git fetch origin main
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "Local main must match origin/main; sync first." >&2
  exit 1
fi

readonly tag="v$version"
if git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null; then
  echo "Tag $tag already exists." >&2
  exit 1
fi

current_build="$($PLIST_BUDDY -c 'Print :CFBundleVersion' "$INFO_PLIST")"
if [[ ! "$current_build" =~ ^[0-9]+$ ]]; then
  echo "CFBundleVersion must be numeric." >&2
  exit 1
fi

# The Info.plist is the version the shipped app reports; package.json is kept
# in step in the same commit so npm tooling never disagrees with the app.
# README's "Latest release" marker follows the same version so the badge
# matches what ships. Validate the marker before any file is rewritten so
# a failed guard leaves the tree clean.
if [[ ! -f "$README" ]] ||
   ! grep -qE '<!-- version -->[0-9]+\.[0-9]+\.[0-9]+<!-- /version -->' "$README"; then
  echo "README missing or version marker malformed: $README" >&2
  exit 1
fi

next_build=$((current_build + 1))
"$PLIST_BUDDY" -c "Set :CFBundleShortVersionString $version" "$INFO_PLIST"
"$PLIST_BUDDY" -c "Set :CFBundleVersion $next_build" "$INFO_PLIST"
npm version "$version" --no-git-tag-version --allow-same-version
# Drop the sed backup on success and on any later abort (set -e / interrupt).
trap 'rm -f "$README.bak"' EXIT
sed -i.bak -E "s|(<!-- version -->)[0-9]+\.[0-9]+\.[0-9]+(<!-- /version -->)|\\1$version\\2|" "$README"
rm -f "$README.bak"
trap - EXIT

"$SCRIPT_DIR/build.sh" --clean

git add "$INFO_PLIST" package.json package-lock.json "$README"
git commit -s -m "Release Finsical $version" \
  -m "Prepare the native macOS release metadata."
git tag -a "$tag" -m "Finsical $version"

if [[ "$push_option" == "--push" ]]; then
  git push origin main "$tag"
fi

echo "Created $tag."
