'use strict';
var freedomplayer = require('../freedomplayer'),
  common = require('../common'),
  bean = require('bean'),
  parser = require('./subtitles/parser');

freedomplayer.defaults.subtitleParser = parser;

freedomplayer(function(p, root) {
  var currentPoint, wrap,
    subtitleControl, subtitleMenu, changeHandler, check = false;

  var languages = [
    {"code": "aa", "direction": "ltr"},
    {"code": "ab", "direction": "ltr"},
    {"code": "af", "direction": "ltr"},
    {"code": "ak", "direction": "ltr"},
    {"code": "als", "direction": "ltr"},
    {"code": "am", "direction": "ltr"},
    {"code": "an", "direction": "ltr"},
    {"code": "ang", "direction": "ltr"},
    {"code": "ang", "direction": "ltr"},
    {"code": "ar", "direction": "rtl"},
    {"code": "arc", "direction": "rtl"},
    {"code": "arz", "direction": "rtl"},
    {"code": "as", "direction": "ltr"},
    {"code": "ast", "direction": "ltr"},
    {"code": "av", "direction": "ltr"},
    {"code": "awa", "direction": "ltr"},
    {"code": "ay", "direction": "ltr"},
    {"code": "az", "direction": "ltr"},
    {"code": "ba", "direction": "ltr"},
    {"code": "bar", "direction": "ltr"},
    {"code": "bat-smg", "direction": "ltr"},
    {"code": "bcl", "direction": "ltr"},
    {"code": "be", "direction": "ltr"},
    {"code": "be-x-old", "direction": "ltr"},
    {"code": "bg", "direction": "ltr"},
    {"code": "bh", "direction": "ltr"},
    {"code": "bi", "direction": "ltr"},
    {"code": "bm", "direction": "ltr"},
    {"code": "bn", "direction": "ltr"},
    {"code": "bo", "direction": "ltr"},
    {"code": "bpy", "direction": "ltr"},
    {"code": "br", "direction": "ltr"},
    {"code": "brx", "direction": "ltr"},
    {"code": "bs", "direction": "ltr"},
    {"code": "bug", "direction": "ltr"},
    {"code": "bxr", "direction": "ltr"},
    {"code": "ca", "direction": "ltr"},
    {"code": "cdo", "direction": "ltr"},
    {"code": "ce", "direction": "ltr"},
    {"code": "ceb", "direction": "ltr"},
    {"code": "ch", "direction": "ltr"},
    {"code": "cho", "direction": "ltr"},
    {"code": "chr", "direction": "ltr"},
    {"code": "chy", "direction": "ltr"},
    {"code": "ckb", "direction": "rtl"},
    {"code": "co", "direction": "ltr"},
    {"code": "cr", "direction": "ltr"},
    {"code": "crn", "direction": "ltr"},
    {"code": "cs", "direction": "ltr"},
    {"code": "csb", "direction": "ltr"},
    {"code": "cu", "direction": "ltr"},
    {"code": "cv", "direction": "ltr"},
    {"code": "cy", "direction": "ltr"},
    {"code": "da", "direction": "ltr"},
    {"code": "de", "direction": "ltr"},
    {"code": "diq", "direction": "ltr"},
    {"code": "dsb", "direction": "ltr"},
    {"code": "dv", "direction": "rtl"},
    {"code": "dz", "direction": "ltr"},
    {"code": "ee", "direction": "ltr"},
    {"code": "el", "direction": "ltr"},
    {"code": "en", "direction": "ltr"},
    {"code": "eo", "direction": "ltr"},
    {"code": "es", "direction": "ltr"},
    {"code": "et", "direction": "ltr"},
    {"code": "eu", "direction": "ltr"},
    {"code": "ext", "direction": "ltr"},
    {"code": "fa", "direction": "rtl"},
    {"code": "ff", "direction": "ltr"},
    {"code": "fi", "direction": "ltr"},
    {"code": "fiu-vro", "direction": "ltr"},
    {"code": "fj", "direction": "ltr"},
    {"code": "fo", "direction": "ltr"},
    {"code": "fr", "direction": "ltr"},
    {"code": "frp", "direction": "ltr"},
    {"code": "fur", "direction": "ltr"},
    {"code": "fy", "direction": "ltr"},
    {"code": "ga", "direction": "ltr"},
    {"code": "gan", "direction": "ltr"},
    {"code": "gbm", "direction": "ltr"},
    {"code": "gd", "direction": "ltr"},
    {"code": "gil", "direction": "ltr"},
    {"code": "gl", "direction": "ltr"},
    {"code": "gn", "direction": "ltr"},
    {"code": "got", "direction": "ltr"},
    {"code": "gu", "direction": "ltr"},
    {"code": "gv", "direction": "ltr"},
    {"code": "ha", "direction": "rtl"},
    {"code": "hak", "direction": "ltr"},
    {"code": "haw", "direction": "ltr"},
    {"code": "he", "direction": "rtl"},
    {"code": "hi", "direction": "ltr"},
    {"code": "ho", "direction": "ltr"},
    {"code": "hr", "direction": "ltr"},
    {"code": "ht", "direction": "ltr"},
    {"code": "hu", "direction": "ltr"},
    {"code": "hy", "direction": "ltr"},
    {"code": "hz", "direction": "ltr"},
    {"code": "ia", "direction": "ltr"},
    {"code": "id", "direction": "ltr"},
    {"code": "ie", "direction": "ltr"},
    {"code": "ig", "direction": "ltr"},
    {"code": "ii", "direction": "ltr"},
    {"code": "ik", "direction": "ltr"},
    {"code": "ilo", "direction": "ltr"},
    {"code": "inh", "direction": "ltr"},
    {"code": "io", "direction": "ltr"},
    {"code": "is", "direction": "ltr"},
    {"code": "it", "direction": "ltr"},
    {"code": "iu", "direction": "ltr"},
    {"code": "ja", "direction": "ltr"},
    {"code": "jbo", "direction": "ltr"},
    {"code": "jv", "direction": "ltr"},
    {"code": "ka", "direction": "ltr"},
    {"code": "kg", "direction": "ltr"},
    {"code": "ki", "direction": "ltr"},
    {"code": "kj", "direction": "ltr"},
    {"code": "kk", "direction": "ltr"},
    {"code": "kl", "direction": "ltr"},
    {"code": "km", "direction": "ltr"},
    {"code": "kn", "direction": "ltr"},
    {"code": "khw", "direction": "rtl"},
    {"code": "ko", "direction": "ltr"},
    {"code": "kr", "direction": "ltr"},
    {"code": "ks", "direction": "rtl"},
    {"code": "ksh", "direction": "ltr"},
    {"code": "ku", "direction": "ltr"},
    {"code": "kv", "direction": "ltr"},
    {"code": "kw", "direction": "ltr"},
    {"code": "ky", "direction": "ltr"},
    {"code": "la", "direction": "ltr"},
    {"code": "lad", "direction": "ltr"},
    {"code": "lan", "direction": "ltr"},
    {"code": "lb", "direction": "ltr"},
    {"code": "lg", "direction": "ltr"},
    {"code": "li", "direction": "ltr"},
    {"code": "lij", "direction": "ltr"},
    {"code": "lmo", "direction": "ltr"},
    {"code": "ln", "direction": "ltr"},
    {"code": "lo", "direction": "ltr"},
    {"code": "lzz", "direction": "ltr"},
    {"code": "lt", "direction": "ltr"},
    {"code": "lv", "direction": "ltr"},
    {"code": "map-bms", "direction": "ltr"},
    {"code": "mg", "direction": "ltr"},
    {"code": "man", "direction": "ltr"},
    {"code": "mh", "direction": "ltr"},
    {"code": "mi", "direction": "ltr"},
    {"code": "min", "direction": "ltr"},
    {"code": "mk", "direction": "ltr"},
    {"code": "ml", "direction": "ltr"},
    {"code": "mn", "direction": "ltr"},
    {"code": "mo", "direction": "ltr"},
    {"code": "mr", "direction": "ltr"},
    {"code": "mrh", "direction": "ltr"},
    {"code": "ms", "direction": "ltr"},
    {"code": "mt", "direction": "ltr"},
    {"code": "mus", "direction": "ltr"},
    {"code": "mwl", "direction": "ltr"},
    {"code": "my", "direction": "ltr"},
    {"code": "na", "direction": "ltr"},
    {"code": "nah", "direction": "ltr"},
    {"code": "nap", "direction": "ltr"},
    {"code": "nd", "direction": "ltr"},
    {"code": "nds", "direction": "ltr"},
    {"code": "nds-nl", "direction": "ltr"},
    {"code": "ne", "direction": "ltr"},
    {"code": "new", "direction": "ltr"},
    {"code": "ng", "direction": "ltr"},
    {"code": "nl", "direction": "ltr"},
    {"code": "nn", "direction": "ltr"},
    {"code": "no", "direction": "ltr"},
    {"code": "nr", "direction": "ltr"},
    {"code": "nso", "direction": "ltr"},
    {"code": "nrm", "direction": "ltr"},
    {"code": "nv", "direction": "ltr"},
    {"code": "ny", "direction": "ltr"},
    {"code": "oc", "direction": "ltr"},
    {"code": "oj", "direction": "ltr"},
    {"code": "om", "direction": "ltr"},
    {"code": "or", "direction": "ltr"},
    {"code": "os", "direction": "ltr"},
    {"code": "pa", "direction": "ltr"},
    {"code": "pag", "direction": "ltr"},
    {"code": "pam", "direction": "ltr"},
    {"code": "pap", "direction": "ltr"},
    {"code": "pdc", "direction": "ltr"},
    {"code": "pi", "direction": "ltr"},
    {"code": "pih", "direction": "ltr"},
    {"code": "pl", "direction": "ltr"},
    {"code": "pms", "direction": "ltr"},
    {"code": "ps", "direction": "rtl"},
    {"code": "pt", "direction": "ltr"},
    {"code": "qu", "direction": "ltr"},
    {"code": "rm", "direction": "ltr"},
    {"code": "rmy", "direction": "ltr"},
    {"code": "rn", "direction": "ltr"},
    {"code": "ro", "direction": "ltr"},
    {"code": "roa-rup", "direction": "ltr"},
    {"code": "ru", "direction": "ltr"},
    {"code": "rw", "direction": "ltr"},
    {"code": "sa", "direction": "ltr"},
    {"code": "sc", "direction": "ltr"},
    {"code": "scn", "direction": "ltr"},
    {"code": "sco", "direction": "ltr"},
    {"code": "sd", "direction": "rtl"},
    {"code": "se", "direction": "ltr"},
    {"code": "sg", "direction": "ltr"},
    {"code": "sh", "direction": "ltr"},
    {"code": "si", "direction": "ltr"},
    {"code": "simple", "direction": "ltr"},
    {"code": "sk", "direction": "ltr"},
    {"code": "sl", "direction": "ltr"},
    {"code": "sm", "direction": "ltr"},
    {"code": "sn", "direction": "ltr"},
    {"code": "so", "direction": "ltr"},
    {"code": "sq", "direction": "ltr"},
    {"code": "sr", "direction": "ltr"},
    {"code": "ss", "direction": "ltr"},
    {"code": "st", "direction": "ltr"},
    {"code": "su", "direction": "ltr"},
    {"code": "sv", "direction": "ltr"},
    {"code": "sw", "direction": "ltr"},
    {"code": "ta", "direction": "ltr"},
    {"code": "te", "direction": "ltr"},
    {"code": "tet", "direction": "ltr"},
    {"code": "tg", "direction": "ltr"},
    {"code": "th", "direction": "ltr"},
    {"code": "ti", "direction": "ltr"},
    {"code": "tk", "direction": "ltr"},
    {"code": "tl", "direction": "ltr"},
    {"code": "tlh", "direction": "ltr"},
    {"code": "tn", "direction": "ltr"},
    {"code": "to", "direction": "ltr"},
    {"code": "tpi", "direction": "ltr"},
    {"code": "tr", "direction": "ltr"},
    {"code": "ts", "direction": "ltr"},
    {"code": "tt", "direction": "ltr"},
    {"code": "tum", "direction": "ltr"},
    {"code": "tw", "direction": "ltr"},
    {"code": "ty", "direction": "ltr"},
    {"code": "udm", "direction": "ltr"},
    {"code": "ug", "direction": "ltr"},
    {"code": "uz", "direction": "ltr"},
    {"code": "uz_AF", "direction": "rtl"},
    {"code": "ve", "direction": "ltr"},
    {"code": "vi", "direction": "ltr"},
    {"code": "vec", "direction": "ltr"},
    {"code": "vls", "direction": "ltr"},
    {"code": "vo", "direction": "ltr"},
    {"code": "wa", "direction": "ltr"},
    {"code": "war", "direction": "ltr"},
    {"code": "wo", "direction": "ltr"},
    {"code": "xal", "direction": "ltr"},
    {"code": "xh", "direction": "ltr"},
    {"code": "xmf", "direction": "ltr"},
    {"code": "yi", "direction": "rtl"},
    {"code": "yo", "direction": "ltr"},
    {"code": "za", "direction": "ltr"},
    {"code": "zg", "direction": "ltr"},
    {"code": "zh", "direction": "ltr"},
    {"code": "zh-classical", "direction": "ltr"},
    {"code": "zh-min-nan", "direction": "ltr"},
    {"code": "zh-yue", "direction": "ltr"},
    {"code": "zu", "direction": "ltr"}
]

  // Trigger cuepoint if user enables subtitles during play 
  function time_check(e, api, time) {
    if(check) {
      (api.cuepoints || []).forEach(function(cue, index) { // Find subtitle which wasnt shown
        var entry = cue.subtitle;

        // Skip the subtitle if it was just shown
        if (entry && currentPoint != index) {
          // If the playback position falls between subtitle line start and end time
          if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) {
            // Show the subtitle
            api.trigger('cuepoint', [api, cue]);
          }
        }
      });
    }
  }

  if (
    !freedomplayer.support.inlineVideo ||
      (!freedomplayer.support.fullscreen  && p.conf.native_fullscreen)) p.conf.nativesubtitles = true;

  if (!p.ui) p.ui = {};
  p.ui.createSubtitleControl = function(subtitles, onChange) {
    changeHandler = onChange;
    subtitleControl = subtitleControl || common.createElement('strong', { className: 'fp-cc' }, 'CC');
    subtitleMenu = subtitleMenu || common.createElement('div', {className: 'fp-menu fp-subtitle-menu'}, '<strong>Closed Captions</strong>');
    common.find('a', subtitleMenu).forEach(common.removeNode);
    subtitleMenu.appendChild(common.createElement('a', {'data-subtitle-index': -1}, 'No subtitles'));
    (subtitles || []).forEach(function(st, i) {
      var srcLang = st.srclang || 'en',
          label = st.label || 'Default (' + srcLang + ')';
      var item = common.createElement('a', {'data-subtitle-index': i}, label);
      subtitleMenu.appendChild(item);
    });
    common.find('.fp-ui', root)[0].appendChild(subtitleMenu);
    common.find('.fp-controls', root)[0].appendChild(subtitleControl);
    common.toggleClass(subtitleControl, 'fp-hidden', !subtitles || !subtitles.length);
    return subtitleControl;
  };

  p.ui.setActiveSubtitleItem = function(idx) {
    setActiveSubtitleClass(idx);
  };

  bean.on(root, p.touch_events(), '.fp-cc', function() {
    if (common.hasClass(subtitleMenu, 'fp-active')) p.hideMenu();
    else p.showMenu(subtitleMenu);
  });

  bean.on(root, p.touch_events(), '.fp-subtitle-menu [data-subtitle-index]', function(ev) {
    ev.preventDefault();
    var idx = ev.target.getAttribute('data-subtitle-index');
    if (changeHandler) return changeHandler(idx);
    if (idx === '-1') return p.disableSubtitles();
    p.loadSubtitles(idx);
  });

  var createUIElements = function() {
    wrap = common.find('.fp-captions', root)[0];
    wrap = wrap || common.appendTo(common.createElement('div', {'class': 'fp-captions'}), common.find('.fp-player', root)[0]);
    Array.prototype.forEach.call(wrap.children, common.removeNode);
    p.ui.createSubtitleControl(p.video.subtitles);
  };


  p.on('ready',  function(ev, player, video) {
    player.subtitles = [];

    createUIElements();

    common.removeClass(root, 'has-menu');

    p.disableSubtitles();

    if (!video.subtitles || !video.subtitles.length) return;

    var defaultSubtitle = video.subtitles.filter(function(one) {
      return one['default'];
    })[0];
    if (defaultSubtitle) player.loadSubtitles(video.subtitles.indexOf(defaultSubtitle));
  });

  p.showSubtitle = function(text) {
    common.html(wrap, text);
    common.addClass(wrap, 'fp-shown');
  };

  p.hideSubtitle = function() {
    common.removeClass(wrap, 'fp-shown');
  };

  p.bind("cuepoint", function(e, api, cue) {
    check = false;
    if (cue.subtitle) {
      currentPoint = cue.index;
      p.showSubtitle(cue.subtitle.text);
    } else if (cue.subtitleEnd) {
      p.hideSubtitle();
      currentPoint = cue.index;
    }
  });

  p.bind("seek", function(e, api, time) {
    // Clear future subtitles if seeking backwards
    if (currentPoint && p.cuepoints[currentPoint] && p.cuepoints[currentPoint].time > time) {
      common.removeClass(wrap, 'fp-shown');
      currentPoint = null;
    }
    (p.cuepoints || []).forEach(function(cue, index) {
      var entry = cue.subtitle;
      //Trigger cuepoint if start time before seek position and end time nonexistent or in the future
      if (entry && currentPoint != index) {
        if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) p.trigger("cuepoint", [p, cue]);
      } // Also handle cuepoints that act as the removal trigger
      else if (cue.subtitleEnd && time >= cue.time && index == currentPoint + 1) {
        p.trigger("cuepoint", [p, cue]);
      }
    });

  });

  p.on('unload', function () {
    common.find('.fp-captions', root).forEach(common.removeNode);
  });

  var setActiveSubtitleClass = function(idx) {
    common.toggleClass(common.find('a.fp-selected', subtitleMenu)[0], 'fp-selected');
    common.toggleClass(common.find('a[data-subtitle-index="' + idx + '"]', subtitleMenu)[0], 'fp-selected');
  };

  var setNativeMode = function(i, mode) {
    var tracks = common.find('video.fp-engine', root)[0].textTracks;
    if (!tracks.length) return;
    if (i === null) {
      [].forEach.call(tracks, function(track) { track.mode = mode; });
    }
    else tracks[i].mode = mode;
  };

  p.disableSubtitles = function() {
    p.subtitles = [];
    (p.cuepoints || []).forEach(function(c) {
      if (c.subtitle || c.subtitleEnd) p.removeCuepoint(c);
    });
    if (wrap) Array.prototype.forEach.call(wrap.children, common.removeNode);
    setActiveSubtitleClass(-1);
    if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine.engineName == 'html5') {
      setNativeMode(null, 'disabled');
    }
    return p;
  };

  p.loadSubtitles = function(i, langCode) {
    //First remove possible old subtitles
    p.disableSubtitles();

    var direction;

    // Check if we have langCode
    if( typeof langCode != 'undefined' ) {
      var language = languages.find(function(language) {
        return language.code == langCode.toLowerCase();
      });

      if( typeof language != 'undefined' ) {
        direction = language.direction;
      }
    }

    var st = p.video.subtitles[i];

    var url = st.src;
    if (!url) return;
    setActiveSubtitleClass(i);

    // If we have direction set is-rtl class to root otherwise remove it
    if( typeof direction != 'undefined' && direction == 'rtl' ) {
      common.addClass(root, '.is-captions-rtl');
    } else {
      common.removeClass(root, '.is-captions-rtl');
    }

    if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine.engineName == 'html5') {
      setNativeMode(i, 'showing');
      return;
    }
    common.xhrGet(url, function(txt) {
      var entries = p.conf.subtitleParser(txt);
      entries.forEach(function(entry, idx) {
        if (!entry.title) entry.title = 'subtitle' + idx;
        var cue = { time: entry.startTime, subtitle: entry, visible: false };
        p.subtitles.push(entry);
        p.addCuepoint(cue);
        p.addCuepoint({ time: entry.endTime, subtitleEnd: entry.title, visible: false });

        // initial cuepoint
        if (entry.startTime === 0 && !p.video.time && !p.splash) {
          p.trigger("cuepoint", [p, freedomplayer.extend({}, cue, { index: 0 })]);
        }
        if (p.splash) p.one('ready', function() { p.trigger('cuepoint', [p, cue]); });
      });
    }, function() {
      p.trigger("error-subtitles", [p, {code: 8, url: url } ]); // missing subtitles
      return false;
    });
    return p;
  };

  bean.on(root, p.touch_events(), '.fp-subtitle-menu a[data-subtitle-index]', function() {
    // Only if you picked some actual subtitle, no "No subtitles"
    if( this.dataset.subtitleIndex > -1 ) {
      check = true;

      // Since subtitle load doesn't trigger any event, we just have to keep checking
      // if there are any new cuepoint added
      p.on('progress', time_check);
    }
  });

});