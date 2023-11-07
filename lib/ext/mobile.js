'use strict';
var fs = require('fs'),
  icon_filter = 'url(' + window.location.href.replace(window.location.hash, "").replace(/\#$/g, '') + '#',
  ICON_FORWARD = fs.readFileSync(__dirname + '/ui/svg/fp-forward.svg').toString().replace(/url\(#/g, icon_filter),
  ICON_REWIND = fs.readFileSync(__dirname + '/ui/svg/fp-rewind.svg').toString().replace(/url\(#/g, icon_filter);

var freedomplayer = require('../freedomplayer'),
    isIeMobile = /IEMobile/.test(window.navigator.userAgent),
    common = require('../common'),
    bean = require('bean'),
    format = require('./ui').format,
    support = freedomplayer.support,
    UA = window.navigator.userAgent;
if (support.touch || isIeMobile) {

   freedomplayer(function(player, root) {
      var android = support.android,
          isAndroid = android && !android.firefox,
          isSilk = /Silk/.test(UA),
          androidVer = android.version || 0;

      var ui = common.find('.fp-ui', root)[0],
          forward = common.createElement('div', {className: 'fp-forward' }, ICON_FORWARD ),
          rewind = common.createElement('div', {className: 'fp-rewind' }, ICON_REWIND ),
          timeline = common.find('.fp-timeline', root)[0],
          seek_to = 0,
          int_hide_forward_rewind;

      ui.appendChild(forward);    
      ui.appendChild(rewind);

      // Mobile shows play/pause in overlay, no need for control bar button, unless it's audio
      if ( ! common.hasClass( root, 'is-audio' ) ) {
         common.find('.fp-controls .fp-playbtn', root)[0].remove();
      }

      bean.on( common.find('svg', forward)[0], player.touch_events(), function(e) {
         if (player.disabled) return;

         e.preventDefault();
         e.stopPropagation();

         hide_overlay();
         seek( true );
      });

      bean.on( common.find('svg', rewind)[0], player.touch_events(), function(e) {
         if (player.disabled) return;

         e.preventDefault();
         e.stopPropagation();

         hide_overlay();
         seek();
      });

      function seek( is_forward ) {
         if( !seek_to ) seek_to = player.video.time;
         seek_to = is_forward ? seek_to + 10 : seek_to - 10;

         if( seek_to < 0 ) seek_to = parseInt(0);
         if( player.video.duration && seek_to > player.video.duration ) seek_to = player.video.duration;

         player.seek( seek_to, function() {
            // reset the desired seek when it finally finishes
            seek_to = 0;
         } );
      }

      // hide overlay and keep the button showing for a while
      function hide_overlay() {
         player.hover( false );

         common.addClass(root, 'is-mobile-seeking');

         clearInterval( int_hide_forward_rewind );

         int_hide_forward_rewind = setTimeout( function() {

            // Did user start to drag the timeline? Do not hide yet, try later
            if ( common.hasClass(timeline, 'is-fp-dragging') ) {
               hide_overlay();
               return;
            }

            common.removeClass(root, 'is-mobile-seeking');
         }, 2000 );
      }

      // custom load for android
      if (isAndroid && !isIeMobile) {
         if (!/Chrome/.test(UA) && androidVer < 4 || android.samsung && androidVer < 5) {
            var originalLoad = player.load;
            player.load = function() {
               var ret = originalLoad.apply(player, arguments);
               common.find('video.fp-engine', root)[0].load();
               player.trigger('ready', [player, player.video]);
               return ret;
            };
         }
         var timer, currentTime = 0;
         var resumeTimer = function(api) {
           timer = setInterval(function() {
             api.video.time = ++currentTime;
             api.trigger('progress', [api, currentTime]);
           }, 1000);
         };
         player.on('ready pause unload', function() {
           if (timer) {
             clearInterval(timer);
             timer = null;
           }
         });
         player.on('ready', function() {
           currentTime = 0;
         });
         player.on('resume', function(ev, api) {
           if (!api.live) return;
           if (currentTime) { return resumeTimer(api); }
           player.one('progress', function(ev, api, t) {
             if (t === 0) { // https://github.com/foliovision/freedom-video-player/issues/727
               resumeTimer(api);
             }
           });
         });
      }

      // hide volume
      // more reliable detection of volume capability, we use setTimeout for its simplicity, this covers iPhone and iPad
      // the reason is that iPad can no longer be reliably detected using user agent
      var audio = new Audio();
      audio.volume = 0.5;
      setTimeout( function() {
        if(audio.volume != 0.5 || support.android ) {
          common.addClass(root, 'no-volume'); // no volume bar
          support.volume = false;
        } else {
          support.volume = true;
        }
      });

      common.addClass(root, 'is-touch');
      if (player.sliders && player.sliders.timeline) player.sliders.timeline.disableAnimation();

      // fake mouseover effect with click
      var hasMoved = false;
      bean.on(root, 'touchmove', function() {
        hasMoved = true;
      });

      var initialClick = true,
         lastTap = false,
         doubleTapTime = 300,
         hoverInt;

      bean.on(root, 'touchend click', function(e) {
         if ( typeof player.video.click != "undefined" ) {
            return;
         }

         if (hasMoved) { //not intentional, most likely scrolling
            hasMoved = false;
            return;
         }

         var rewind = common.hasClass(e.target, 'fp-rewind' ),
            forward = common.hasClass(e.target, 'fp-forward' );

         var double_tap_duration = new Date().getTime() - lastTap;

         if ( lastTap && double_tap_duration > 20 && double_tap_duration < doubleTapTime && ( rewind || forward ) ) {

            if ( player.video && player.video.duration ) {
               var target = player.video.time;

               // Make sure hover controls do not show
               clearInterval( hoverInt );

               if ( rewind ) {
                  target -= 10;
                  if ( target < 0 ) {
                     target = 0;
                  }

               } else {
                  target += 10;
                  if ( target > player.video.duration ) {
                     target = player.video.duration;
                  }
               }

               common.addClass(root, 'is-mobile-seeking');
               setTimeout( function() {
                  common.removeClass(root, 'is-mobile-seeking');
               }, 500 );

               player.seek( target );

               lastTap = new Date().getTime();

               e.preventDefault();
               e.stopPropagation();
               return;
            }
         }

         lastTap = new Date().getTime();

         var video = common.find('video.fp-engine', root)[0];
         if (initialClick && player.conf.clickToUnMute && video && video.muted && player.conf.autoplay) video.muted = false;
            initialClick = false;

         // Tapping the player when playing should show controls first
         // If you tap into the video area it should hide the controls if they are showing
         var mouseover = common.hasClass(root, 'is-mouseover')
            ||
            // consider mobile forward/rewind buttons as mouseover to make sure they work
            common.hasClass(root, 'is-mobile-seeking') &&
            (
               common.hasClass(e.target, 'fp-forward') ||
               common.hasClass(e.target.parentNode, 'fp-forward') ||
               common.hasClass(e.target, 'fp-rewind') ||
               common.hasClass(e.target.parentNode, 'fp-rewind')
            );

         if ( player.was_played ) {
            if ( !mouseover || common.hasClass(e.target, 'fp-ui') || common.hasClass(e.target, 'fp-engine') || common.hasClass(e.target, 'fp-header') || common.hasClass(e.target, 'fp-rewind') || common.hasClass(e.target, 'fp-forward') ) {

               clearInterval( hoverInt );

               if ( typeof player.video.click != "undefined" ) {
                  return;
               }

               // Delay showing the controls as user might be doing double tap to rewind/seek forward
               hoverInt = setTimeout( function() {
                  player.hover( !mouseover );
                  // We can divide the time required for double tap as the controls appear with smooth transition of opacity
               }, doubleTapTime / 2 );

               // Hower tapping on the place where pause button would show (center) should pause the video right away
               if ( player.playing && common.hasParent( e.target, '.fp-pause') ) {
                  return;
               }

               // Stop any further actions, but only if the controls are not showing,
               // otherwise the open menu would not close!
               if ( ! mouseover ) {
                  e.preventDefault();
                  e.stopPropagation();
               }
               return;
            }
         }

         // First video click before the video was played should play it
         if (!player.was_played && !player.splash && common.hasClass(root, 'is-mouseout') && !common.hasClass(root, 'is-mouseover')) {
            setTimeout(function() {
               if (!player.disabled && !player.playing && !player.splash) {
                  var engine = common.find('video.fp-engine', root);
                  if ( engine[0] ) {
                     engine[0].play();
                  }
               }
            }, 400);
         }


      });

      // native fullscreen
      if (!support.fullscreen && player.conf.native_fullscreen && typeof common.createElement('video').webkitEnterFullScreen === 'function') {
         var oldFullscreen = player.fullscreen;
         player.fullscreen = function() {
            var video = common.find('video.fp-engine', root)[0];
            if (!video) return oldFullscreen.apply(player);
            player.trigger('fullscreen', [player]);
            bean.on(document, 'webkitfullscreenchange.nativefullscreen', function() {
              if (document.webkitFullscreenElement !== video) return;
              bean.off(document, '.nativefullscreen');
              bean.on(document, 'webkitfullscreenchange.nativefullscreen', function() {
                if (document.webkitFullscreenElement) return;
                bean.off(document, '.nativefullscreen');
                player.trigger('fullscreen-exit', [player]);
              });
            });
            video.webkitEnterFullScreen();
            bean.one(video, 'webkitendfullscreen', function() {
              bean.off(document, 'fullscreenchange.nativefullscreen');
              player.trigger('fullscreen-exit', [player]);
              common.prop(video, 'controls', true);
              common.prop(video, 'controls', false);
            });
         };
      }


      // Android browser gives video.duration == 1 until second 'timeupdate' event
      if (isAndroid || isSilk) player.bind("ready", function() {
         var video = common.find('video.fp-engine', root)[0];
         if( video ) {
            if (player.conf.splash && video.paused && player.engine.engineName !== 'hlsjs-lite') {
               bean.one(video, 'canplay', function() {
                  video.play();
               });
               video.load();
            }

            player.bind("progress.dur", function() {
               if (player.live || player.conf.live) return;
               var duration = video.duration;

               if (duration !== 1) {
                  player.video.duration = duration;
                  common.find(".fp-duration", root)[0].innerHTML = format(duration);
                  player.unbind("progress.dur");
               }
            });
         }
      });

      // Resuming playback should hide the overlay
      player.on( 'resume', function() {
         player.hover( false );
      });

   });

}
