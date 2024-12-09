/* global cast, chrome */
/* eslint-disable no-console */

'use strict';
var freedomplayer = require('../freedomplayer')
  , common = require('../common')
  , bean = require('bean')
  , scriptjs = require('scriptjs');



freedomplayer(function(api, root) {
  if (api.conf.chromecast === false) return;
  scriptjs('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1');
  window['__onGCastApiAvailable'] = function(loaded) {
    if (!loaded) return;
    initialize();
  };

  /*api.on( 'ready', function() {
    createUIElements();
  });*/

  var conf = api.conf.chromecast || {}
    , session
    , trigger;

  function initialize() {
    var context = cast.framework.CastContext.getInstance();

    context.setOptions({
      receiverApplicationId: conf.applicationId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      // Automatically connects when the session was started with the same appId and the same page origin (regardless of tab).
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    cast.framework.CastContext.getInstance().addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      function(event) {
        console.log('Chromecast ' + event.castState);

        if ( event.castState === cast.framework.CastState.NOT_CONNECTED ) {
          session = false;

          if ( api.hijacked ) {
            destroy();
          }
        }

        if ( event.castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE ) {
          createUIElements();
        }
      }
    );
  }

  function createUIElements() {
    common.find('.fp-chromecast', root).forEach(common.removeNode);
    common.find('.fp-chromecast-engine', root).forEach(common.removeNode);
    trigger = common.createElement('a', { 'class': 'fp-chromecast fp-icon', title: 'Play on Cast device'})
    trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="125 40 625 500"><path d="M644 486h37V98H181v83h-55V43h610v498H487v-55h157zm-224-24c6 22 9 44 10 66v13h-54c-1-69-25-128-74-176-48-48-107-73-176-73v-55l29 1a300 300 0 0 1 171 74 304 304 0 0 1 94 150zm-294-79v-34c87-4 192 69 194 192h-55a139 139 0 0 0-139-138v-20zm49 91c22 17 33 39 34 67h-83v-82c18 0 34 5 49 15z"/></svg>';

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
    api.release();
    common.toggleClass(root, 'is-chromecast', false);
    common.toggleClass(trigger, 'fp-active', false);
  }

  bean.on(root, api.touch_events(), '.fp-chromecast', function(ev) {
    ev.preventDefault();
    if ( session ) {
      session.endSession( true );
      session = null;
      destroy();
      api.trigger('pause', [api]);
      return;
    }
    if (api.playing) api.pause();

    cast.framework.CastContext.getInstance().requestSession().then(
      function() {
        session = cast.framework.CastContext.getInstance().getCurrentSession();
        var receiverName = session.getCastDevice().friendlyName;
        common.html(common.find('.fp-chromecast-engine-status')[0], 'Playing on device ' + receiverName);
        var mediaInfo = new chrome.cast.media.MediaInfo(api.video.src);
        var request = new chrome.cast.media.LoadRequest(mediaInfo);

        var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

        castSession.loadMedia(request).then(
          onMediaDiscovered,
          function(errorCode) {
            console.log('Chromecast onMediaError: ' + errorCode);
          }
        );

        function onMediaDiscovered() {
          var remote_player = new cast.framework.RemotePlayer(),
            remote_controller = new cast.framework.RemotePlayerController( remote_player );

          remote_controller.addEventListener( cast.framework.RemotePlayerEventType.ANY_CHANGE, function( e ) {
            if ( 'currentTime' === e.field ) {
              api.trigger( 'progress', [ api, e.value ] );

            } else if( 'isMediaLoaded' === e.field && e.value && ! api.hijacked ) {
              common.toggleClass(root, 'is-chromecast', true);
              common.toggleClass(trigger, 'fp-active', true);
              api.hijack({
                pause: function() {
                  if ( ! remote_player.isPaused ) {
                    remote_controller.playOrPause
                    ();
                  }
                },
                resume: function() {
                  if ( remote_player.isPaused ) {
                    remote_controller.playOrPause
                    ();
                  }
                },
                seek: function(time) {
                  remote_player.currentTime = time;
                  remote_controller.seek();
                }
              });

            } else if ( 'playerState' === e.field ) {
              common.toggleClass( root, 'is-loading', e.value === chrome.cast.media.PlayerState.BUFFERING );

              if ( api.paused && e.value === chrome.cast.media.PlayerState.PLAYING ) {
                api.trigger( 'resume', [ api ] );
              } else if ( api.playing && e.value === chrome.cast.media.PlayerState.PAUSED ) {
                api.trigger( 'pause', [ api ] );
              }
            }
          });
        }
      }, function(err) {
        if ( 'cancel' !== err ) {
          console.error( 'Chromecast session ' + err );
        }
      }
    );
  });

});
