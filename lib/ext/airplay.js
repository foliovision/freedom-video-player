'use strict';
var freedomplayer = require('../freedomplayer')
  , common = require('../common')
  , bean = require('bean');

freedomplayer(function(api, root) {
  api.on('ready', function() {
    var el = common.find('video.fp-engine', root)[0];
    if (!el) return;
    el.setAttribute('x-webkit-airplay', 'allow');

    if (!window.WebKitPlaybackTargetAvailabilityEvent) return;
    el.addEventListener('webkitplaybacktargetavailabilitychanged', function(ev) {
      if (ev.availability !== 'available' && !freedomplayer.airplay_was_available ) return;

      // We remember that Airplay was available as the event "webkitplaybacktargetavailabilitychanged"
      // seems to only come with ev.availability == 'available' for the first video playing
      freedomplayer.airplay_was_available = true;

      common.find('.fp-airplay', root).forEach(common.removeNode);

      var trigger = common.createElement('a', { 'class': 'fp-airplay fp-icon', title: 'Play on AirPlay device'})
      var fs = common.find('.fp-fullscreen')[0];
      fs.parentNode.insertBefore(trigger, fs);
    });

    el.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', function() {
      var trigger = common.find('.fp-airplay', root)[0];
      if (!trigger) return;
      common.toggleClass(trigger, 'fp-active', el.webkitCurrentPlaybackTargetIsWireless);
    });

    // Make sure Airplay is disabled if the video type is not supported
    api.one( 'progress', function() {
      var airplay = common.find('.fp-airplay', root)[0];

      if( !airplay ) return;

      if ( api.engine.engineName == 'html5' ) {
        airplay.style.display = "inline-block";
      } else {
        airplay.style.display = "none";
      }
    })
  });

  bean.on(root, api.touch_events(), '.fp-airplay', function(ev) {
    ev.preventDefault();
    var video = common.find('video.fp-engine', root)[0];
    video.webkitShowPlaybackTargetPicker();
  });


});
