/* eslint-disable no-unused-vars, no-undef */

//Freedom Player with extensions

var freedomplayer = module.exports = require('./freedomplayer');

//Compatibility bridge with flowplayer
window.flowplayer = freedomplayer;

if(typeof jQuery != 'undefined') {
  jQuery.fn.flowplayer = jQuery.fn.freedomplayer;
}

//Support needed before engines
require('./ext/support');

//Engines
require('./engine/hlsjs');
require('./engine/html5');

//Extensions
//require('./ext/slider'); //TODO enable
require('./ext/ui');
require('./ext/message');
require('./ext/keyboard');
require('./ext/playlist');
require('./ext/cuepoint');
require('./ext/subtitle');
require('./ext/analytics');
require('./ext/airplay');
require('./ext/chromecast');
require('./ext/qsel');
require('./ext/menu');
//Have to add fullscreen last
require('./ext/fullscreen');

require('./ext/mobile');
//BRANDING
