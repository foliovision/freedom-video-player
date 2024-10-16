'use strict';
var freedomplayer = require('../freedomplayer'),
  bean = require('bean'),
  common = require('../common'),
  focused,
  player_focusedRoot;

freedomplayer(function(api, root) {
  // no keyboard configured
  if (!api.conf.keyboard) return;

   // keyboard. single global listener
  bean.on(document, "keydown.fp", function(e) {
    if( typeof(focused) == "undefined" ) return;

    var api = focused,
      focusedRoot = api ? player_focusedRoot : false,
      el = api && !api.disabled ? api : 0,
      metaKeyPressed = e.ctrlKey || e.metaKey || e.altKey,
      key = e.which,
      conf = el && el.conf;

    // no keybinds when controlbar is disabled or video ad
    if( common.hasClass(focusedRoot, "no-controlbar") || common.hasClass(focusedRoot, "is-cva") ) return;

    if (!el || !conf.keyboard || el.disabled) return;

    // help dialog (shift key not truly required)
    if ([63, 187, 191].indexOf(key) != -1) {
      common.toggleClass(focusedRoot, "is-help");
      return false;
    }

    // close help / unload
    if (key == 27 && common.hasClass(focusedRoot, "is-help")) {
      common.toggleClass(focusedRoot, "is-help");
      return false;
    }

    if (!metaKeyPressed && el.ready) {

      e.preventDefault();

      // slow motion / fast forward
      if (e.shiftKey) {
        if (key == 39) el.speed(true);
        else if (key == 37) el.speed(false);
        else if (key == 78) el.next();  //  N
        else if (key == 80) el.prev();  //  P
        return;
      }

      // 1, 2, 3, 4 ..
      if (key < 58 && key > 47) return el.seekTo(key - 48);

      switch (key) {
        case 38: case 75: el.volume(el.volumeLevel + 0.15); break;
        case 40: case 74: el.volume(el.volumeLevel - 0.15); break;
        case 39: case 76: el.seeking = true; el.manual_seeking = true; el.seek(api.video.time+5); break;
        case 37: case 72: el.seeking = true; el.manual_seeking = true; el.seek(api.video.time-5); break;
        case 32: if(api.playing) el.manual_pause = true; el.toggle(); break;
        case 70: if(conf.fullscreen) el.fullscreen(); break;
        case 77: el.mute(); break;
        case 81: el.unload(); break;
        case 67:  //  circle through subtitles
        if( !api.video.subtitles || api.video.subtitles.length == 0 ) break;

        var current_subtitles = focusedRoot.querySelector('.fp-dropdown li.active[data-subtitle-index]').dataset.subtitleIndex;

        if( typeof(current_subtitles) == "undefined" ) current_subtitles = -1;

        current_subtitles++;
        if( current_subtitles > (api.video.subtitles.length - 1) ) {
          current_subtitles = -1;
        }

        api.trigger('subtitles-switched', [current_subtitles]);

        break;

        // . and , to seek forth/back 1 frame
        case 190: case 188:
          if(api.playing) {
            el.manual_pause = true;
            el.pause();
          }
          el.seek( api.video.time + ( key == 190 ? 1/30 : -1/30 ) );
        break;
      }
    }

  });

  // hover
  bean.on(root, "mouseenter mouseleave", function(e) {
    focused = !api.disabled && e.type == 'mouseover' ? api : 0;
    if (focused) player_focusedRoot = root;
  });

});