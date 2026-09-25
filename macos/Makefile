# Build Finsical.app — no Xcode project required, just the CLT toolchain.
APP := Finsical.app
ICON_SRC := ../media-sources/icon-finsical.png
ICONSET := Finsical.iconset
# Osmium UI (npm dependency): the stylesheet and the native window host.
OSMIUM := ../node_modules/osmium-ui
SOURCES := Finsical.swift $(OSMIUM)/macos/OsmiumWindows.swift
# Oldest macOS the app runs on; keep in step with LSMinimumSystemVersion in
# Info.plist. swiftc ignores MACOSX_DEPLOYMENT_TARGET and would otherwise
# target the build host's macOS, so pass it explicitly through -target.
MACOS_MIN := 12.0
# Swift language mode. CI also builds with SWIFT_VERSION=6 and
# SWIFTFLAGS=-warnings-as-errors, which keeps the app and Osmium UI's
# window host ready for Swift 6's stricter concurrency checks.
SWIFT_VERSION ?= 5
SWIFTFLAGS ?=

all: $(APP)

# Osmium UI comes from npm: say so rather than "No rule to make target".
$(OSMIUM)/%:
	@echo "$@ is missing: run npm install in the repository root" >&2; exit 1

$(APP): bundle $(SOURCES) Info.plist Finsical.icns \
        ../LICENSE ../THIRD_PARTY_NOTICES.md ../LICENSES/LGPL-2.1.txt \
        ../core/data/mace.ts
	rm -rf $(APP).staging
	mkdir -p $(APP).staging/Contents/MacOS $(APP).staging/Contents/Resources/web \
	         $(APP).staging/Contents/Resources/core/data
	cp Info.plist $(APP).staging/Contents/
	cp Finsical.icns $(APP).staging/Contents/Resources/
	# The bundles compile in LGPL code (core/data/mace.ts): ship that
	# source and the license text with the app. The notices file names
	# both paths, and a release zip carries only what is in here.
	cp ../LICENSE ../THIRD_PARTY_NOTICES.md ../LICENSES/LGPL-2.1.txt \
	   $(APP).staging/Contents/Resources/
	cp ../core/data/mace.ts $(APP).staging/Contents/Resources/core/data/
	cp ../web/index.html ../web/overview.html ../web/addons.html \
	   ../web/prefs.html ../web/stats.html ../web/app.css \
	   $(OSMIUM)/osmium.css \
	   ../dist/bundle.js ../dist/overview.js ../dist/addons.js \
	   ../dist/prefs.js ../dist/stats.js \
	   $(APP).staging/Contents/Resources/web/
	@if [ -d ../web/pack ]; then cp -r ../web/pack $(APP).staging/Contents/Resources/web/; fi
	# assets is required — the Plus machine's shell lives there; fail
	# the build rather than ship an empty silhouette.
	cp -r ../web/assets $(APP).staging/Contents/Resources/web/
	swiftc -O -swift-version $(SWIFT_VERSION) $(SWIFTFLAGS) \
		-target $(shell uname -m)-apple-macos$(MACOS_MIN) \
		-o $(APP).staging/Contents/MacOS/Finsical $(SOURCES)
	# The linked binary is what the OS enforces, so fail the build if its
	# minimum macOS differs from the one Info.plist promises.
	@minos="$$(vtool -show-build $(APP).staging/Contents/MacOS/Finsical | awk '$$1 == "minos" { print $$2 }')"; \
	promised="$$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' Info.plist)"; \
	if [ -z "$$minos" ] || [ "$$minos" != "$$promised" ]; then \
		echo "Binary minos '$$minos' does not match LSMinimumSystemVersion '$$promised'" >&2; \
		exit 1; \
	fi; \
	echo "Binary minos $$minos matches LSMinimumSystemVersion"
	rm -rf $(APP) && mv $(APP).staging $(APP)
	codesign --force --sign - $(APP)
	@echo "Built $(APP)"

# App icon: resample the source PNG into the standard iconset sizes and
# compile with iconutil. macOS masks the square art to the squircle.
Finsical.icns: $(ICON_SRC)
	rm -rf $(ICONSET)
	mkdir $(ICONSET)
	@set -e; for s in 16 32 128 256 512; do \
		sips -z $$s $$s $(ICON_SRC) --out $(ICONSET)/icon_$${s}x$${s}.png >/dev/null; \
		sips -z $$((s * 2)) $$((s * 2)) $(ICON_SRC) --out $(ICONSET)/icon_$${s}x$${s}@2x.png >/dev/null; \
	done
	iconutil -c icns $(ICONSET) -o $@
	rm -rf $(ICONSET)

bundle:
	cd .. && npm run build

clean:
	rm -rf $(APP) $(APP).staging Finsical.icns $(ICONSET)

.PHONY: all bundle clean
