# Build Finsical.app — no Xcode project required, just the CLT toolchain.
APP := Finsical.app

all: $(APP)

$(APP): bundle Finsical.swift Info.plist
	rm -rf $(APP).staging
	mkdir -p $(APP).staging/Contents/MacOS $(APP).staging/Contents/Resources/web
	cp Info.plist $(APP).staging/Contents/
	cp ../web/index.html ../dist/bundle.js $(APP).staging/Contents/Resources/web/
	@if [ -d ../web/pack ]; then cp -r ../web/pack $(APP).staging/Contents/Resources/web/; fi
	swiftc -O -o $(APP).staging/Contents/MacOS/Finsical Finsical.swift
	rm -rf $(APP) && mv $(APP).staging $(APP)
	@echo "Built $(APP)"

bundle:
	cd .. && npm run build

clean:
	rm -rf $(APP) $(APP).staging

.PHONY: all bundle clean
