'use strict';
var freedomplayer = require('../freedomplayer'),
    common = require('../common'),
    bean = require('bean'),
    fs = require('fs'),
    slider = require('./ui/slider'),
    barSlider = require('./ui/bar-slider');

function zeropad(val) {
   val = parseInt(val, 10);
   return val >= 10 ? val : "0" + val;
}

// display seconds in hh:mm:ss format
function format(sec, remaining) {

   sec = Math.max(sec || 0, 0);
   sec = remaining ? Math.ceil(sec) : Math.floor(sec);

   var h = Math.floor(sec / 3600),
       min = Math.floor(sec / 60);

   sec = sec - (min * 60);

   if (h >= 1) {
      min -= h * 60;
      return h + ":" + zeropad(min) + ":" + zeropad(sec);
   }

   return zeropad(min) + ":" + zeropad(sec);
}

var PLAY_ROUNDED_OUTLINE = fs.readFileSync(__dirname + '/ui/svg/play-rounded-outline.svg', 'utf-8')
  , PLAY_ROUNDED_FILL = fs.readFileSync(__dirname + '/ui/svg/play-rounded-fill.svg', 'utf-8')
  , PLAY_SHARP_FILL = fs.readFileSync(__dirname + '/ui/svg/play-sharp-fill.svg', 'utf-8')
  , PLAY_SHARP_OUTLINE = fs.readFileSync(__dirname + '/ui/svg/play-sharp-outline.svg', 'utf-8')
  , PAUSE_ROUNDED_OUTLINE = fs.readFileSync(__dirname + '/ui/svg/pause-rounded-outline.svg', 'utf-8')
  , PAUSE_ROUNDED_FILL = fs.readFileSync(__dirname + '/ui/svg/pause-rounded-fill.svg', 'utf-8')
  , PAUSE_SHARP_FILL = fs.readFileSync(__dirname + '/ui/svg/pause-sharp-fill.svg', 'utf-8')
  , PAUSE_SHARP_OUTLINE = fs.readFileSync(__dirname + '/ui/svg/pause-sharp-outline.svg', 'utf-8');

freedomplayer(function(api, root) {
   // This should only be done once, previously it was done for each player, adding about 5 ms for 10 players
   if( !freedomplayer.added_svg_filters ) {
      freedomplayer.added_svg_filters = true;

      try {
         var fc;
         document.body.appendChild(fc = common.createElement('div', {}, fs.readFileSync(__dirname + '/ui/svg/filters.svg', 'utf-8')));
         common.css(fc, {
            width: 0,
            height: 0,
            overflow: 'hidden',
            position: 'absolute',
            margin: 0,
            padding: 0
         });

      } catch (e) { /* omit */ }
   }

   // Determine what touch event should be used for controls
   // The problem is that when Freedom Player is embedded in Modulobox, it break all the click events by running e.preventDefault() on touchstart or touchend
   // So in that case we also let the controls work with touchend which seems to work
   var touch_events = false;
   api.touch_events = function() {

      // Use cached value if available
      if( touch_events ) {
         return touch_events;
      }

      touch_events = 'click.player';
      var el = root;
      for (var i = 0; i < 4; i++) {
         if ( common.hasClass(el, 'mobx-item') ) {
            touch_events += ' touchend';
            break;
         }

         if( el.parentElement ) {
            el = el.parentElement;
         } else {
            break;
         }
      }

      return touch_events;
   }
   api.touch_events();

   var conf = api.conf,
      support = freedomplayer.support,
      hovertimer,
      fullscreen_exit_hint_timer;

   common.find('.fp-ratio,.fp-ui', root).forEach(common.removeNode);
   common.addClass(root, 'freedomplayer');
   root.appendChild(common.createElement('div', {className: 'fp-ratio'}));

   // Initially the .fp-ui element is hidden, we show it with requestAnimationFrame later on to optimize modern browser loading
   // TODO: Remove SVG transforms
   var ui = common.createElement('div', {className: 'fp-ui', style: 'display: none'}, '\
         <div class="fp-waiting">\
          <div class="fp-preload"><b></b><b></b><b></b><b></b></div>\
         </div>\
         <div class="fp-header">\
         </div>\
         <p class="fp-speed-flash"></p>\
         <div class="fp-play fp-visible">\
           <a class="fp-icon fp-playbtn"></a>\
           {{ PLAY_ROUNDED_FILL }}\
           {{ PLAY_ROUNDED_OUTLINE }}\
           {{ PLAY_SHARP_FILL }}\
           {{ PLAY_SHARP_OUTLINE }}\
         </div>\
         <div class="fp-pause">\
           <a class="fp-icon fp-playbtn"></a>\
           {{ PAUSE_SHARP_OUTLINE }}\
           {{ PAUSE_SHARP_FILL }}\
           {{ PAUSE_ROUNDED_OUTLINE }}\
           {{ PAUSE_ROUNDED_FILL }}\
         </div>\
         <div class="fp-controls">\
            <a class="fp-icon fp-playbtn"></a>\
            <span class="fp-elapsed">00:00</span>\
            <div class="fp-timeline fp-bar">\
               <span class="fp-timestamp"></span>\
               <div class="fp-progress fp-color"></div>\
            </div>\
            <span class="fp-duration"></span>\
            <span class="fp-remaining"></span>\
            <div class="fp-volume">\
               <a class="fp-icon fp-volumebtn"></a>\
               <div class="fp-volumebar fp-bar-slider">\
                 <em></em><em></em><em></em><em></em><em></em><em></em><em></em>\
               </div>\
            </div>\
            <a class="fp-fullscreen fp-icon"></a>\
            <a class="fp-unload fp-icon"></a>\
            <strong class="fp-speed fp-hidden"></strong>\
         </div>'.replace('{{ PAUSE_ROUNDED_FILL }}', PAUSE_ROUNDED_FILL)
                .replace('{{ PAUSE_ROUNDED_OUTLINE }}', PAUSE_ROUNDED_OUTLINE)
                .replace('{{ PAUSE_SHARP_FILL }}', PAUSE_SHARP_FILL)
                .replace('{{ PAUSE_SHARP_OUTLINE }}', PAUSE_SHARP_OUTLINE)
                .replace('{{ PLAY_SHARP_OUTLINE }}', PLAY_SHARP_OUTLINE)
                .replace('{{ PLAY_SHARP_FILL }}', PLAY_SHARP_FILL)
                .replace('{{ PLAY_ROUNDED_OUTLINE }}', PLAY_ROUNDED_OUTLINE)
                .replace('{{ PLAY_ROUNDED_FILL }}', PLAY_ROUNDED_FILL)
                .replace(/url\(#/g, 'url(' + window.location.href.replace(window.location.hash, "").replace(/\#$/g, '') + '#')
   );
   root.appendChild(ui);

   if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame( function() {
         ui.style.display = '';
      });

   } else {
      ui.style.display = '';
   }

   function find(klass) {
     return common.find(".fp-" + klass, root)[0];
   }

   // widgets
  var waiting = find('waiting'),
      elapsed = find("elapsed"),
      ratio = find("ratio"),
      speedFlash = find('speed-flash'),
      durationEl = find("duration"),
      remaining = find('remaining'),
      timelineTooltip = find('timestamp'),
      origRatio = common.css(ratio, 'padding-top'),
      play = find('play'),
      pause = find('pause'),

      // sliders
      timeline = find("timeline"),
      timelineApi = slider(timeline, api, root),

      fullscreen = find("fullscreen"),
      volumeSlider = find("volumebar"),
      volumeApi = barSlider(volumeSlider, { rtl: api.rtl }),
      noToggle = common.hasClass(root, 'no-toggle'),
      timelineTooltip_hover = false;

   timelineApi.disableAnimation(common.hasClass(root, 'is-touch'));
   api.sliders = api.sliders || {};
   api.sliders.timeline = timelineApi;
   api.sliders.volume = volumeApi;

   var speedAnimationTimers = [];

   // aspect ratio
   function setRatio(val) {
     common.css(ratio, 'padding-top', val * 100 + "%");
     if (!support.inlineBlock) common.height(common.find('object', root)[0], common.height(root));
   }

   var lastMove;

   function hover( is_over ) {
      // is-mouseover/out
      // Show hover controls if video was already played
      hover_worker(is_over && api.was_played);

      if (is_over) {

         lastMove = new Date();

         var reg = function(e) {

            if ( 'number' === typeof( e.clientY ) ) {
               var rect = ui.getBoundingClientRect()
               var y = e.clientY - rect.top - document.documentElement.scrollTop;

               // Show header if mouse is over the top 1/3 of the player
               common.toggleClass(root, 'is-mouseover-top', y < ( 0.33 * ui.clientHeight ) );

               // Show fullscreen exit hint if mouse is over the top 1/3 of the player and on the right 1/3 of the player
               if ( common.hasClass(root, 'is-fullscreen') && y < ( 0.05 * ui.clientHeight ) && e.clientX > ( ui.clientWidth * 0.95 ) ) {
                  if ( !fullscreen_exit_hint_timer ) {
                     fullscreen_exit_hint_timer = setTimeout( function() {
                        common.toggleClass(root, 'is-mouseover-bottom', true );

                        clearInterval( fullscreen_exit_hint_timer );

                        fullscreen_exit_hint_timer = setInterval( function() {
                           common.toggleClass( fullscreen, 'bold' );
                        }, 500 );
                     }, 1000 );
                  }

               } else {
                  // Show control bar if mouse is over the bottom 1/5 of the player
                  common.toggleClass(root, 'is-mouseover-bottom', y > ( 0.8 * ui.clientHeight ) || timelineTooltip_hover );

                  clearInterval( fullscreen_exit_hint_timer );
                  fullscreen_exit_hint_timer = false;

                  common.toggleClass( fullscreen, 'bold', false );  
               }
            }

            if ( typeof api.video.click != "undefined" ) {
               return;
            }

            // Show hover controls if video was already played
            hover_worker(api.was_played);
            lastMove = new Date();
         };
         api.on("pause.x volume.x", reg);
         bean.on(root, 'mousemove.x touchmove.x', reg);

         bean.on(timelineTooltip, 'mousemove', function() {
            timelineTooltip_hover = true;
         });

         bean.on(timelineTooltip, 'mouseleave', function() {
            timelineTooltip_hover = false;
         });

         // clear any previously set interval
         // if you overlay iframe on top of player you might get 2 mousenter events in a row
         clearInterval(hovertimer);

         hovertimer = setInterval(function() {
            if (new Date() - lastMove > conf.mouseoutTimeout ) {
               // Do not remove the hover controls if the video is paused on mobile
               if( !support.touch || api.playing ) {
                  hover_worker(false);
               }
               lastMove = new Date();
            }
         }, 250);

      } else {
         bean.off(root, 'mousemove.x touchmove.x');
         api.off("pause.x volume.x");
         clearInterval(hovertimer);
      }
   }

   api.hover = hover;

   function hover_worker(flag) {
     if (flag) {
       common.addClass(root, 'is-mouseover');
       common.removeClass(root, 'is-mouseout');
     } else {

       // Do not hide the hover controls if the mouse is over the bottom or top of the player and it's NOT MOBILE
       if ( ! support.touch ) {
         if ( common.hasClass( root, 'is-mouseover-bottom' ) || common.hasClass( root, 'is-mouseover-top' ) ) {
           return;
         }
       }

       common.addClass(root, 'is-mouseout');
       common.removeClass(root, 'is-mouseover');
     }
   }

   if (conf.ratio) setRatio(conf.ratio);

   // no fullscreen in IFRAME
   try {
      if (!conf.fullscreen) common.removeNode(fullscreen);

   } catch (e) {
      common.removeNode(fullscreen);
   }

   api.on('dvrwindow', function() {
     timelineApi.disable(false);
   });

   api.on("ready", function(ev, api, video) {

      var duration = api.video.duration;

      timelineApi.disable(api.disabled || !duration);

      if (conf.adaptiveRatio && !isNaN(video.height / video.width)) setRatio(video.height / video.width, true);

      // initial time & volume
      common.html([durationEl, remaining], api.live ? 'Live' : format(duration));

      // do we need additional space for showing hour
      common.toggleClass(root, 'is-long', duration >= 3600);
      volumeApi.slide(api.volumeLevel);

      if (api.engine.engineName === 'flash') timelineApi.disableAnimation(true, true);
      else timelineApi.disableAnimation(false);
      common.find('.fp-title', ui).forEach(common.removeNode);
      if (video.title) {

        common.prepend(ui, common.createElement('div', {
          className: 'fp-message fp-title'
        }, video.title));
      }
      common.toggleClass(root, 'has-title', !!video.title);


   }).on("unload", function() {
     if (!origRatio && !conf.splash) common.css(ratio, "paddingTop", "");
     timelineApi.slide(0);
     common.addClass(play, 'fp-visible');

   // buffer
   }).on("buffer", function(ev, api, buffered) {
      var video = api.video,
      max = video.buffer / video.duration;

      if (!video.seekable && support.seekable) timelineApi.max(api.conf.live ? Infinity : max);
      if (!buffered || typeof buffered === 'number') { // Legacy
        buffered = [{
          start: 0,
          end: video.buffer
        }]
      }
      var buffers = common.find('.fp-buffer', timeline);
      if (buffers.length !== buffered.length) {
        buffers.forEach(common.removeNode);
        buffers = [];
      }
      buffered.forEach(function(b, i) {
        var buffer = buffers[i] || common.createElement('div', {
          className: 'fp-buffer'
        });

        if(b.end > video.duration) return;

        common.css(buffer, {
          left: (100 * b.start / video.duration) + '%',
          width: (100 * (b.end - b.start) / video.duration) + '%'
        });
        common.prepend(timeline, buffer);
      });
   }).on("speed", function(e, api, val) {
     if (api.video.time) {
       common.text(speedFlash, val + "x");
       common.addClass(speedFlash, 'fp-shown');
       speedAnimationTimers = speedAnimationTimers.filter(function(to) {
         clearTimeout(to);
         return false;
       });
       speedAnimationTimers.push(setTimeout(function() {
        common.addClass(speedFlash, 'fp-hilite');
        speedAnimationTimers.push(setTimeout(function() {
          common.removeClass(speedFlash, 'fp-hilite');
          speedAnimationTimers.push(setTimeout(function() {
            common.removeClass(speedFlash, 'fp-shown');
          }, 300));
        }, 1000));
       }));
     }

   }).on("buffered", function() {
      timelineApi.max(1);

   // progress
   }).on("progress seek", function(_e, _api, time) {

      var duration = api.video.duration,
       offset = api.video.seekOffset || 0;

      if ( typeof time == "undefined" ) {
         time = api.video.time;
      }

      var percentage = (time - offset) / (duration - offset);
      if (!timelineApi.dragging) {
         // Only update timeline if it's not a video progress while already seeking
         // This avoids timeline jumping left/right while seeking
         if (_e.type != 'progress' || !_api.seeking) {
            timelineApi.slide(percentage, api.seeking ? 0 : 250);
         }
      }
      common.toggleClass(root, 'is-live-position', duration - time < conf.livePositionOffset);

      common.html(elapsed, format(time));
      common.html(remaining, format(duration - time, true));

   }).on("finish resume seek", function(e) {
      common.toggleClass(root, "is-finished", e.type == "finish");
   }).on('resume', function() {
      // Show the play/pause button for mobile
      if( support.touch ) {
         common.addClass(pause, 'fp-visible');
         common.removeClass(play, 'fp-visible');

         common.addClass(play, 'fp-visible-change');
         setTimeout(function() { common.removeClass(play, 'fp-visible-change'); }, 300);

      // Flash the play/pause button for desktop
      } else {
         common.addClass(play, 'fp-visible');
         setTimeout(function() { common.removeClass(play, 'fp-visible'); }, 300);
      }
   }).on('pause', function() {
      // Show the play/pause button for mobile
      if( support.touch ) {
         common.addClass(play, 'fp-visible');
         common.removeClass(pause, 'fp-visible');

         common.addClass(pause, 'fp-visible-change');
         setTimeout(function() { common.removeClass(pause, 'fp-visible-change'); }, 300);

      // Flash the play/pause button for desktop
      } else {
         common.addClass(pause, 'fp-visible');
         setTimeout(function() { common.removeClass(pause, 'fp-visible'); }, 300);
      }
   }).on("stop", function() {
      common.html(elapsed, format(0));
      timelineApi.slide(0, 100);

   }).on("finish", function() {
      common.html(elapsed, format(api.video.duration));
      timelineApi.slide(1, 100);
      common.removeClass(root, 'is-seeking');

   // misc
   }).on("beforeseek", function() {
      //TODO FIXME
      //progress.stop();

   }).on("volume", function() {
      volumeApi.slide(api.volumeLevel);


   }).on("disable", function() {
      var flag = api.disabled;
      timelineApi.disable(flag);
      volumeApi.disable(flag);
      common.toggleClass(root, 'is-disabled', api.disabled);

   }).on("mute", function(e, api, flag) {
      common.toggleClass(root, 'is-muted', flag);

   }).on("error", function(e, api, error) {
      common.removeClass(root, 'is-loading');
      common.removeClass(root, 'is-seeking');
      common.addClass(root, 'is-error');
      if (error) {
         api.error = true;

         var code = error.code;
         if( (error.message || '').match(/DECODER_ERROR_NOT_SUPPORTED/) ) {
            code = 3;
         }

         var dismiss = api.message((api.engine && api.engine.engineName || 'html5') + ": " + conf.errors[code] );
         //common.find('p', el)[0].innerHTML = error.url || video.url || video.src || conf.errorUrls[error.code];
         common.removeClass(root, 'is-mouseover');
         api.one('load progress', function(e) {
            if( e.type == 'progress' && !api.error ) dismiss();
         });
      }


   // hover
   }).one('resume ready', function() {
     var videoTag = common.find('video.fp-engine', root)[0];
     if (!videoTag) return;
     if (!common.width(videoTag) || !common.height(videoTag)) {
       var oldOverflow = root.style.overflow;
       root.style.overflow = 'visible';
       setTimeout(function() {
         if (oldOverflow) root.style.overflow = oldOverflow;
         else root.style.removeProperty('overflow');
       });
     }
   });

   //Interaction events
   bean.on(root, "mouseenter mouseleave", function(e) {
      if (noToggle) return;

      var is_over = e.type == "mouseover";

      hover( is_over );

   // allow dragging over the player edge
   });
   bean.on(root, "mouseleave", function() {

     if (timelineApi.dragging || volumeApi.dragging) {
       common.addClass(root, 'is-mouseover');
       common.removeClass(root, 'is-mouseout');
     }

   // click
   });
   bean.on(root, touch_events, function(e) {
      if (api.disabled) return;

      // Click/tap on play/pause always works
      // However click/tap anywhere in the player should only play the video on mobile if it was not yet played
      if (
         common.hasParent(e.target, '.fp-play,.fp-pause') ||
         ( !api.was_played || !support.touch ) && (common.hasClass(e.target, 'fp-ui') || common.hasClass(e.target, 'fp-engine')) ||
         typeof api.video.click != "undefined"
      ) {
         if (e.preventDefault) e.preventDefault();
         if (api.playing) api.manual_pause = true;
         return api.toggle();
      }
   });

   bean.on(root, 'mousemove touchmove', '.fp-timeline', function(ev) {
     var x = ev.pageX || ev.clientX;
     if (!x && ev.originalEvent && ev.originalEvent.touches && ev.originalEvent.touches.length) {
        x = ev.originalEvent.touches[0].pageX;
     }
     var delta = x - common.offset(timeline).left,
         percentage = delta / common.width(timeline),
         video = api.video,
         duration = video.duration - (video.seekOffset === undefined ? 0 : video.seekOffset),
         seconds = (api.rtl ? 1 - percentage : percentage) * duration;
     if (percentage < 0) return;
     common.html(timelineTooltip, format(seconds));
     var left = (delta - common.width(timelineTooltip) / 2);
     if (left < 0) left = 0;
     if (left > common.width(timeline) - common.width(timelineTooltip)) left = false;
     if (left !== false) common.css(timelineTooltip, {
       left: left + 'px',
       right: 'auto'
     });
     else common.css(timelineTooltip, {
       left: 'auto',
       right: '0px'
     });

   });

   bean.on(root, 'contextmenu', function(ev) {
      var w = window;
      var menu = common.find('.fp-context-menu', root)[0];
      if (!menu) return;
      ev.preventDefault();
      api.showMenu(menu, {
        left: ev.clientX - w.scrollX,
        top: ev.clientY - w.scrollY
      });
      bean.on(root, touch_events, '.fp-context-menu', function(ev) {
         ev.stopPropagation();
      });
   });

   // poster -> background image
   if (conf.poster) common.css(root, 'background-image', "url(" + conf.poster + ")");

   var bc = common.css(root, 'background-color'),
      has_bg = common.css(root, 'background-image') != "none" || bc && bc != "rgba(0, 0, 0, 0)" && bc != "transparent";

   // is-poster class
   if (has_bg && !conf.splash) {
      if (!conf.poster) conf.poster = true;
      var initPoster = function() {
        common.addClass(root, "is-poster");
        common.addClass(play, 'fp-visible');
        api.poster = true;
        api.on('resume.poster progress.poster beforeseek.poster', function(ev) {
          if (ev.type === 'beforeseek' || api.playing) {
            common.removeClass(root, 'is-poster');
            common.removeClass(play, 'fp-visible');
            api.poster = false;
            api.off('.poster');
          }
        });
      }
      api.on('stop', function() { initPoster(); });
      api.on('ready', function(_ev, _api, video) {
        if (video.index || video.autoplay) return; // No poster for playlist items
        initPoster();
      });
   }

   if (typeof conf.splash === 'string') {
     common.css(root, 'background-image', "url('" + conf.splash + "')");
   }

   // default background color if not present
   if (!has_bg && api.forcedSplash) {
      common.css(root, "background-color", "#555");
   }

   bean.on(root, touch_events, '.fp-toggle, .fp-play, .fp-playbtn', function() {
     if (api.disabled) return;
     if(api.playing) api.manual_pause = true;
     api.toggle();
   });

   /* controlbar elements */
   bean.on(root, touch_events, '.fp-volumebtn', function() { api.mute(); });
   bean.on(root, touch_events, '.fp-fullscreen', function() { api.fullscreen(); });
   bean.on(root, touch_events, '.fp-unload', function() { api.unload(); });

   bean.on(timeline, 'slide', function(val) {
     api.seeking = true;
     api.manual_seeking = true;
     api.seekTo(val * 10);
   });

   bean.on(volumeSlider, 'slide', function(val) {
      api.volume(val);
   });

   // times

   bean.on(root, touch_events, '.fp-duration,.fp-remaining', function() {
     if (api.dvr) return api.seekTo(10);
     common.toggleClass(root, 'is-inverted');
   });

   hover_worker(noToggle);

   api.on('shutdown', function() {
     bean.off(timeline);
     bean.off(volumeSlider);

     common.removeNode(ui);
     common.find('.fp-ratio', root).forEach(common.removeNode);
   });

   function check_size() {
      var playerEl = common.find('.fp-player', root)[0] || root;
      common.toggleClass(root, 'is-tiny', playerEl.clientWidth < 400);
      common.toggleClass(root, 'is-small', playerEl.clientWidth < 600 && playerEl.clientWidth >= 400);
   }

   check_size();

   window.addEventListener('resize', check_size );
});


module.exports.format = format;
