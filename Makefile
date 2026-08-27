export PATH := ./node_modules/.bin/:$(PATH)

# version and date
VERSION=$(shell cat VERSION)
SET_VERSION=sed "s/@VERSION/${VERSION}/g"

DATE=$(shell git log -1 --pretty=format:%ad --date=short)
SET_DATE=sed "s/@DATE/${DATE}/"

# paths
DIST=./dist
JS=$(DIST)/freedomplayer.js
SKIN=$(DIST)/skin

# Build with rollup (TypeScript -> JS)
concat: raw
	# freedomplayer.js
	@ node -e "var fs = require('fs'), js=fs.readFileSync('$(JS)', 'utf8'); process.stdout.write(js.replace('//BRANDING', fs.readFileSync('deps/branding.js', 'utf8')));" > $(JS).tmp
	@ mv $(JS).tmp $(JS)

# the raw / non-working player without branding
raw:
	# raw player
	@ mkdir -p $(DIST)
	@ cat LICENSE.js | $(SET_VERSION) | $(SET_DATE) > $(JS).header
	@ echo >> $(JS).header
	@ rollup -c rollup.config.mjs
	@ cat $(JS).header $(JS) > $(JS).tmp
	@ mv $(JS).tmp $(JS)
	@ rm $(JS).header

min: concat
	# freedomplayer.min.js is produced by rollup as well
	@ echo "freedomplayer.min.js already built by rollup"

# make CSS sequence: SASS Preprocess > PostCSS Postprocess > Prettier Format > awk Append newlines > Copy to dist > Print filesize
skin:
	# skins
	@ mkdir -p $(SKIN)
	@ sass skin/sass/skin.sass \
	| postcss \
	| prettier --stdin-filepath skin.css \
 	| awk '/}/ {print; print ""; next} {print}' \
	> $(SKIN)/skin.css
	@ cp -r skin/icons $(SKIN)
	@ echo "# skin.css" `wc -c < $(SKIN)/skin.css`B

zip: min concat skin
	@ cp index.html $(DIST)
	@ cp LICENSE.md $(DIST)
	@ rm -f $(DIST)/freedomplayer.zip
	cd $(DIST) && zip -r freedomplayer-$(VERSION).zip * -x \*DS_Store

clean:
	# cleaning
	@ rm -rf $(DIST)

deps:
	@ npm install

all: clean zip

# shortcuts
js: concat

browserlist:
	@ npx browserslist@latest --update-db

typecheck:
	@ tsc --noEmit

.PHONY: dist skin deps typecheck
