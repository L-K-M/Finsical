# Build Finsical.app — no Xcode project required, just the CLT toolchain.
APP := Finsical.app
WEB := $(APP)/Contents/Resources/web

all: $(APP)

$(APP): bundle Finsical.swift Info.plist
	mkdir -p $(APP)/Contents/MacOS
	rm -rf $(WEB)
	mkdir -p $(WEB)
	swiftc -O -o $(APP)/Contents/MacOS/Finsical Finsical.swift
	cp Info.plist $(APP)/Contents/
	cp ../web/index.html ../dist/bundle.js $(WEB)/
	@if [ -d ../web/pack ]; then cp -r ../web/pack $(WEB)/; fi
	@echo "Built $(APP)"

bundle:
	cd .. && npm run build

clean:
	rm -rf $(APP)

.PHONY: all bundle clean
