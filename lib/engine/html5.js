'use strict';
var freedomplayer = require('../freedomplayer')
  , common = freedomplayer.common
  , html5factory = require('./html5-factory');

var VIDEO = document.createElement('video');

function getType(type) {
   return /mpegurl/i.test(type) ? "application/x-mpegurl" : type;
}

function canPlay(type) {
   if (!/^(video|application)/i.test(type))
      type = getType(type);
   var canPlay = !!VIDEO.canPlayType(type).replace("no", '');

   // Chrome 142+ does support HLS natively, but we have to test it a lot more before we stop using HLS.js for it
   if ( 'application/x-mpegurl' === type && flowplayer.support.browser.chrome && parseInt(flowplayer.support.browser.version) >= 142 ) {
      canPlay = false;
   }

   return canPlay;
}

var engine;

engine = function(player, root) {

  return html5factory('html5', player, root, canPlay, function(video, api) {
    if (api.currentSrc !== video.src) {
      common.find('source', api).forEach(common.removeNode);
      api.src = video.src;
      api.type = video.type;
    } else if (video.autoplay) {
      api.load();
    }

  });
};


engine.canPlay = function(type) {
  return freedomplayer.support.video && canPlay(type);
};

engine.engineName = 'html5';

freedomplayer.engines.push(engine);
