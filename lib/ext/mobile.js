'use strict';
var fs = require('fs'),
  ICON_FORWARD = fs.readFileSync(__dirname + '/ui/svg/fp-forward.svg'),
  ICON_REWIND = fs.readFileSync(__dirname + '/ui/svg/fp-rewind.svg');

var flowplayer = require('../flowplayer'),
    isIeMobile = /IEMobile/.test(window.navigator.userAgent),
    common = require('../common'),
    bean = require('bean'),
    format = require('./ui').format,
    support = flowplayer.support,
    UA = window.navigator.userAgent;
if (support.touch || isIeMobile) {

   flowplayer(function(player, root) {
      var android = support.android,
          isAndroid = android && !android.firefox,
          isSilk = /Silk/.test(UA),
          androidVer = android.version || 0;

      var ui = common.find('.fp-ui')[0],
          forward= common.createElement('div', {className: 'fp-forward' }, ICON_FORWARD ),
          rewind = common.createElement('div', {className: 'fp-rewind' }, ICON_REWIND );

      ui.appendChild(forward);    
      ui.appendChild(rewind);

      // Mobile shows play/pause in overlay, no need for control bar button
      common.find('.fp-controls .fp-playbtn')[0].remove();

      bean.on(forward, 'click', function() {
         if (player.disabled) return;

         var time = player.video.time + 10;
         if( player.video.duration && time > player.video.duration ) time = player.video.duration;
         player.seek( time );
      });
      bean.on(rewind, 'click', function() {
         if (player.disabled) return;

         var time = player.video.time - 10;
         if( time < 0 ) time = parseInt(0);
         player.seek( time );
      });

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
             if (t === 0) { // https://github.com/flowplayer/flowplayer/issues/727
               resumeTimer(api);
             }
           });
         });
      }

      // hide volume
      // more reliable detection of volume capability, we use setTimeout for its simplicity, this covers iPhone and iPad
      var audio = new Audio();
      audio.volume = 0.5;
      setTimeout( function() {
        if(audio.volume != 0.5 ) {
          common.addClass(root, 'fp-mute'); // show mute button
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
      var initialClick = true;
      bean.on(root, 'touchend click', function(e) {
        if (hasMoved) { //not intentional, most likely scrolling
          hasMoved = false;
          return;
        }

        var video = common.find('video.fp-engine', root)[0];
        if (initialClick && player.conf.clickToUnMute && video && video.muted && player.conf.autoplay) video.muted = false;
         initialClick = false;

        if (player.playing && !common.hasClass(root, 'is-mouseover')) {
          common.addClass(root, 'is-mouseover');
          common.removeClass(root, 'is-mouseout');
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (!player.playing && !player.splash && common.hasClass(root, 'is-mouseout') && !common.hasClass(root, 'is-mouseover')) {
          setTimeout(function() {
            if (!player.disabled && !player.playing && !player.splash) {
              common.find('video.fp-engine', root)[0].play();
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


   });

}
