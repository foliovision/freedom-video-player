@REM Use this file to copile freedomlayer.js into dist
@REM Run with ./Makefile.win.bat
./node_modules/.bin/browserify -t brfs -p browserify-derequire -s freedomplayer lib/index.js > dist/freedomplayer.js