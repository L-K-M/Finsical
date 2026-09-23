# Build Finsical.app — no Xcode project required, just the CLT toolchain.
APP := Finsical.app
ICON_SRC := ../media-sources/icon-finsical.png
ICONSET := Finsical.iconset
# Osmium UI (npm dependency): the stylesheet and the native window host.
OSMIUM := ../node_modules/osmium-ui
SOURCES := Finsical.swift $(OSMIUM)/macos/OsmiumWindows.swift

all: $(APP)

$(APP): bundle $(SOURCES) Info.plist Finsical.icns
	rm -rf $(APP).staging
	mkdir -p $(APP).staging/Contents/MacOS $(APP).staging/Contents/Resources/web
	cp Info.plist $(APP).staging/Contents/
	cp Finsical.icns $(APP).staging/Contents/Resources/
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
	MACOSX_DEPLOYMENT_TARGET=12.0 swiftc -O -o $(APP).staging/Contents/MacOS/Finsical $(SOURCES)
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
