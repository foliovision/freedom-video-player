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
      trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M116.364 477.091h279.272L256 337.455z"/><path d="M465.455 34.909H46.545C20.945 34.909 0 55.855 0 81.455v279.273c0 25.6 20.945 46.545 46.545 46.545h93.091v-46.545H46.545V81.455h418.909v279.273h-93.091v46.545h93.091c25.6 0 46.545-20.945 46.545-46.545V81.455c.001-25.6-20.944-46.546-46.544-46.546z"/></svg>';
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
