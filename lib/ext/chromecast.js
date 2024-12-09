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

  var conf = api.conf.chromecast || {}
    , is_available = false
    , session
    , trigger
    , waiting_for_seek = false;

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
          createChromecastButton();
          is_available = true;
        }
      }
    );
  }

  function createChromecastButton() {
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

  api.bind('ready', function() {

    if ( ! is_available ) return;

    if( get_media() ) {
      createChromecastButton();

    } else {
      console.log('Chromecast: Can\'t find suitable video type');
      common.removeNode( trigger );
    }

  });

  bean.on(root, api.touch_events(), '.fp-chromecast', function(ev) {
    ev.preventDefault();
    if ( session ) {
      session.endSession( true );
      session = null;
      destroy();
      api.trigger('pause', [api]);

      // let the playback continue where it left off on Chromecast
      if( api.video.time ) {
        setTimeout( function() {
          api.seek( api.video.time );
        }, 0 );
      }

      return;
    }
    if (api.playing) api.pause();

    cast.framework.CastContext.getInstance().requestSession().then(
      function() {
        session = cast.framework.CastContext.getInstance().getCurrentSession();
        var receiverName = session.getCastDevice().friendlyName;
        common.html(common.find('.fp-chromecast-engine-status')[0], 'Playing on device ' + receiverName);

        load_media();

      }, function(err) {
        if ( 'cancel' !== err ) {
          console.error( 'Chromecast session ' + err );
        }
      }
    );
  });

  function get_media() {
    var media = false;

    // we need MP4 or MPEG-DASH
    var sources = api.video.sources_fvqs || api.video.sources;
    for( var i in sources ) {
      var type = sources[i].type;
      // Use MP4, or MPEG-DASH if it's not the Vimeo JSON
      if( type == 'video/mp4' || type == 'video/fv-mp4' || type == 'application/dash+xml' && !sources[i].src.match(/.json/) ) {
        media = sources[i];
        break;
      }
    }

    // fallback to HLS
    if( !media ) {
      for( var j in sources ) {
        if( sources[j].type == 'application/x-mpegurl' ) {
          media = sources[j];
          break;
        }
      }
    }

    // if it's using encryption, we cannot use it
    if( api.video.fvhkey && !api.conf.hls_cast ) return false;

    if( media ) {
      // make sure you use the best quality available
      // this also prefers Hls over MP4 for Vimeo videos as Vimeo HLS wouldn't play on our Chromecast
      var top_quality = false,
        mp4_qualities = ['fullhd','hd','md','sd'];

      // check what's available and pick a MP4 video as Chromecast doesn't like Vimeo HLS. Tested on https://flowplayer.com/developers/tools/stream-tester
      for( var quality in mp4_qualities ) {
        var re = new RegExp('-'+mp4_qualities[quality]);
        for( var k in api.video.sources_fvqs ) {
          var source = api.video.sources_fvqs[k]
          if( source.src.match(re) && source.type == 'video/mp4' ) {
            top_quality = source;
            break;
          }
        }

        if( top_quality ) {
          media = top_quality;
          break;
        }
      }

    }

    return media;
  }

  function load_media() {
    var media = get_media();

    if( !media ) {
      return false;
    }

    var mediaInfo = new chrome.cast.media.MediaInfo( media.src, media.type );
    var request = new chrome.cast.media.LoadRequest(mediaInfo);

    var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

    castSession.loadMedia(request).then(
      onMediaDiscovered,
      function(errorCode) {
        console.log('Chromecast onMediaError: ' + errorCode);
      }
    );
  }
  
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

        // when seeking we must wait for it to buffer to be able to really tell if it did seek
        if ( api.seeking ) {
          if ( e.value === chrome.cast.media.PlayerState.BUFFERING ) {
            waiting_for_seek = true;

          // once it continues playing we know the seek succeeded
          } else if ( e.value === chrome.cast.media.PlayerState.PLAYING && waiting_for_seek ) {
            waiting_for_seek = false;
            api.trigger('seek', [api]);
          }
        }
      }
    });
  }
});
