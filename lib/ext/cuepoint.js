'use strict';
var freedomplayer = require('../freedomplayer'),
    common = require('../common'),
    bean = require('bean');

freedomplayer(function(player, root) {

   var CUE_RE = / ?cue\d+ ?/;

   var cuepointsDisabled = false;

   function setClass(index) {
      root.className = root.className.replace(CUE_RE, " ");
      if (index >= 0) common.addClass(root, 'cue' + index);
   }

   var segments = {}, lastFiredSegment = -0.125;

   var fire = function(cue) {
     setClass(cue.index);
     player.trigger('cuepoint', [player, cue]);
   };

   player.on("progress", function(e, api, time) {
      if (cuepointsDisabled) return;
      var segment = segmentForCue(time);
      while (lastFiredSegment < segment) {
        lastFiredSegment += 0.125;
        if (!segments[lastFiredSegment]) continue;
        segments[lastFiredSegment].forEach(fire);
      }

   }).on("unload", setClass)
   .on('beforeseek', function(ev) {
     setTimeout(function() {
       if (!ev.defaultPrevented) cuepointsDisabled = true;
     });
   }).on("seek", function(ev, api, time) {
     setClass();
     lastFiredSegment = segmentForCue(time || 0) - 0.125;
     cuepointsDisabled = false;
     if (!time && segments[0]) segments[0].forEach(fire);
   }).on('ready', function(e, api, video) {
     lastFiredSegment = -0.125;
     var cues = video.cuepoints || player.conf.cuepoints || [];
     player.setCuepoints(cues);
   }).on('finish', function() {
      var segment = segmentForCue(player.video.duration);
      while (lastFiredSegment < segment) {
        lastFiredSegment += 0.125;
        if (!segments[lastFiredSegment]) continue;
        segments[lastFiredSegment].forEach(fire);
      }
     lastFiredSegment = -0.125;
   });
   if (player.conf.generate_cuepoints) {

      player.bind("load", function() {

         // clean up cuepoint elements of previous playlist items
         common.find('.fp-cuepoint', root).forEach(common.removeNode);

      });
   }

   /**
    * API
    */
   player.setCuepoints = function(cues) {
     player.cuepoints = [];
     segments = {};
     cues.forEach(player.addCuepoint);
     return player;
   };
   player.addCuepoint = function(cue) {
     if (!player.cuepoints) player.cuepoints = [];
     if (typeof cue === 'number') {
       cue = {
          time: cue,
       };
     }
     cue.index = 0;
     var segment = segmentForCue(cue);
     if (!segments[segment]) segments[segment] = [];
     segments[segment].push(cue);
     if (player.cuepoints.length) cue.index = Math.max.apply(null, player.cuepoints.map(function(cue) { return cue.index; })) + 1;
     player.cuepoints.push(cue);

    if (player.conf.generate_cuepoints && cue.visible !== false) {
       var duration = player.video.duration,
           timeline = common.find('.fp-timeline', root)[0];
        common.css(timeline, "overflow", "visible");

        var time = cue.time || cue;
        if (time < 0) time = duration + time;

        var el = common.createElement('a', {className: 'fp-cuepoint fp-cuepoint' + cue.index});
        common.css(el, "left", (time / duration * 100) + "%");

        timeline.appendChild(el);
        bean.on(el, 'mousedown', function(e) {
          e.preventDefault();
          e.stopPropagation();
          player.seek(time);
        });
    }
    return player;
   };

   player.removeCuepoint = function(cue) {
     if (typeof cue === 'number') cue = player.cuepoints.filter(function(c) { return c.index === cue; })[0];
     var idx = player.cuepoints.indexOf(cue),
         segment = segmentForCue(cue);
     if (idx === -1) return;
      player.cuepoints = player.cuepoints.slice(0, idx).concat(player.cuepoints.slice(idx+1));

      var timeline = common.find('.fp-timeline', root)[0];

      common.find('.fp-cuepoint' + cue.index, timeline).forEach(common.removeNode);

     var sIdx = segments[segment].indexOf(cue);
     if (sIdx === -1) return;
     segments[segment] = segments[segment].slice(0, sIdx).concat(segments[segment].slice(sIdx+1));
     return player;
   };

   function segmentForCue(cue) {
     var time = cue && !isNaN(cue.time) ? cue.time : cue;
     if (time < 0) time = player.video.duration + time;
     return Math.round(time/0.125)*0.125;
   }

});
