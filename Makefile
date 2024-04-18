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

# https://foliovision.com/player/legal/freedom-player-license
concat: raw
	# freedomplayer.js
	@ node -e "var fs = require('fs'), js=fs.readFileSync('$(JS)', 'utf8'); process.stdout.write(js.replace('//BRANDING', fs.readFileSync('deps/branding.js', 'utf8')));" > $(JS).tmp
	@ mv $(JS).tmp $(JS)

# the raw / non-working player without branding
raw:
	# raw player
	@ mkdir	-p $(DIST)
	@ cat LICENSE.js | $(SET_VERSION) | $(SET_DATE) > $(JS)
	@ echo >> $(JS)
	@ browserify -t brfs -p browserify-derequire -s freedomplayer lib/index.js | $(SET_VERSION) >> $(JS)

min: concat
	# freedomplayer.min.js
	@ uglifyjs $(JS) --comments '/foliovision.com\/player\/legal\/freedom-player-license/' --compress --mangle --output $(DIST)/freedomplayer.min.js

# make all skins
skin:
	# skins
	@ mkdir -p $(SKIN)
	@ postcss skin/css/skin.css -u postcss-import -u autoprefixer -u postcss-preset-env --map --map.sourcesContent true --map.annotation $(SKIN)/skin.css.map -o $(SKIN)/skin.css
	@ postcss skin/css/skin.css -u postcss-import -u autoprefixer -u postcss-preset-env -u cssnano --no-map -o $(SKIN)/skin.min.css
	@ cp -u skin/icons/freedomplayer.woff* $(SKIN)/icons/

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

.PHONY: dist skin deps
