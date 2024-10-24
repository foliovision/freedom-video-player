/* global chrome */
/* eslint-disable no-console */

'use strict';
var freedomplayer = require('../freedomplayer')
  , common = require('../common')
  , bean = require('bean')
  , scriptjs = require('scriptjs');



freedomplayer(function(api, root) {
  if (api.conf.chromecast === false) return;
  scriptjs('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js');
  window['__onGCastApiAvailable'] = function(loaded) {
    if (!loaded) return;
    initialize();
  };

  /*api.on( 'ready', function() {
    createUIElements();
  });*/

  var conf = api.conf.chromecast || {}
    , session
    , timer
    , trigger;

  function initialize() {
    var applicationId, sessionRequest, apiConfig;
    applicationId = conf.applicationId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
    sessionRequest = new chrome.cast.SessionRequest(applicationId);
    apiConfig = new chrome.cast.ApiConfig(
      sessionRequest,
      sessionListener,
      receiverListener
    );
    chrome.cast.initialize(apiConfig, onInitSuccess, onError);
  }

  function sessionListener() {
    console.log('sessionListener');
  }

  function receiverListener(ev) {
    if (ev !== chrome.cast.ReceiverAvailability.AVAILABLE) return;
    createUIElements();
  }

  function onInitSuccess() {
    /* noop */
  }

  function onError() {
    console.log('onError');
  }

  function createUIElements() {
    common.find('.fp-chromecast', root).forEach(common.removeNode);
    common.find('.fp-chromecast-engine', root).forEach(common.removeNode);
    trigger = common.createElement('a', { 'class': 'fp-chromecast fp-icon', title: 'Play on Cast device'})
    trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="125 40 625 500"><path fill="whitesmoke" d="M644 486h37V98H181v83h-55V43h610v498H487v-55h157zm-224-24c6 22 9 44 10 66v13h-54c-1-69-25-128-74-176-48-48-107-73-176-73v-55l29 1a300 300 0 0 1 171 74 304 304 0 0 1 94 150zm-294-79v-34c87-4 192 69 194 192h-55a139 139 0 0 0-139-138v-20zm49 91c22 17 33 39 34 67h-83v-82c18 0 34 5 49 15z"/></svg>';

    var fs = common.find('.fp-fullscreen')[0];
    fs.parentNode.insertBefore(trigger, fs);

    var chromeCastEngine = common.createElement('div', { 'class': 'fp-chromecast-engine' })
      , chromeCastStatus = common.createElement('p', { 'class': 'fp-chromecast-engine-status' })
      , chromeCastIcon = common.createElement('p', { 'class': 'fp-chromecast-engine-icon' });
    chromeCastEngine.appendChild(chromeCastIcon);
    chromeCastEngine.appendChild(chromeCastStatus);
    var engine = common.find('.fp-engine', root)[0];
    if (!engine) common.prepend(common.find('.fp-player', root)[0] || root, chromeCastEngine);
    else engine.parentNode.insertBefore(chromeCastEngine, engine);
  }

  function destroy() {
    clearInterval(timer);
    timer = null;
    api.release();
    common.toggleClass(root, 'is-chromecast', false);
    common.toggleClass(trigger, 'fp-active', false);
  }

  bean.on(root, api.touch_events(), '.fp-chromecast', function(ev) {
    ev.preventDefault();
    if (session) {
      api.trigger('pause', [api]);
      session.stop();
      session = null;
      destroy();
      return;
    }
    if (api.playing) api.pause();
    chrome.cast.requestSession(function(s) {
      session = s;
      var receiverName = session.receiver.friendlyName;
      common.html(common.find('.fp-chromecast-engine-status')[0], 'Playing on device ' + receiverName);
      var mediaInfo = new chrome.cast.media.MediaInfo(api.video.src);
      var request = new chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request, onMediaDiscovered, function onMediaError() { });

      function onMediaDiscovered(media) {
        media.addUpdateListener(function(alive) {
          if (!session) return; // Already destoryed
          timer = timer || setInterval(function() {
            api.trigger('progress', [api, media.getEstimatedTime()]);
          }, 500);
          if (!alive) {
            destroy();
            api.trigger('finish', [api]);
          } else {
            common.toggleClass(root, 'is-chromecast', true);
            common.toggleClass(trigger, 'fp-active', true);
            api.hijack({
              pause: function() {
                media.pause();
              },
              resume: function() {
                media.play();
              },
              seek: function(time) {
                var req = new chrome.cast.media.SeekRequest();
                req.currentTime = time;
                media.seek(req);
              }
            });
          }
          var playerState = media.playerState;
          if (api.paused && playerState === chrome.cast.media.PlayerState.PLAYING) api.trigger('resume', [api]);
          if (api.playing && playerState === chrome.cast.media.PlayerState.PAUSED) api.trigger('pause', [api]);
          common.toggleClass(root, 'is-loading', playerState === chrome.cast.media.PlayerState.BUFFERING);
        });
      }
    }, function(err) {
      console.error('requestSession error', err);
    });
  });

});
