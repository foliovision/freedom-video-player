'use strict';
var freedomplayer = require('../freedomplayer'),
    bean = require('bean'),
    common = require('../common'),
   FS_ENTER = "fullscreen",
   FS_EXIT = "fullscreen-exit",
   FULL_PLAYER,
   FS_SUPPORT = freedomplayer.support.fullscreen;

// esc button
bean.on(document, "fullscreenchange.ffscr webkitfullscreenchange.ffscr mozfullscreenchange.ffscr MSFullscreenChange.ffscr", function(e) {
  var el = document.webkitCurrentFullScreenElement || document.mozFullScreenElement || document.fullscreenElement || document.msFullscreenElement;
  if (!FULL_PLAYER && (!el.parentNode || !el.parentNode.getAttribute('data-freedomplayer-instance-id'))) return;
  var player = FULL_PLAYER || freedomplayer(el.parentNode);
  if (el) {
     FULL_PLAYER = player.trigger(FS_ENTER, [player]);
  } else {
     FULL_PLAYER.trigger(FS_EXIT, [FULL_PLAYER]);
     FULL_PLAYER = null;
  }
 });

freedomplayer(function(player, root) {

   var wrapper = common.createElement('div', {className: 'fp-player'});
   Array.prototype.map.call(root.children, common.identity).forEach(function(el) {
     if (common.matches(el, '.fp-ratio,script')) return;
     wrapper.appendChild(el);
   });
   root.appendChild(wrapper);

   var win = window,
      scrollY,
      scrollX;

   player.isFullscreen = false;

   player.fullscreen = function(flag) {

      if (player.disabled || ! player.conf.fullscreen ) return;

      if (flag === undefined) flag = !player.isFullscreen;

      if (flag) {
        scrollY = win.scrollY;
        scrollX = win.scrollX;
      }

      if (FS_SUPPORT) {

         if (flag) {
            ['requestFullScreen', 'webkitRequestFullScreen', 'mozRequestFullScreen', 'msRequestFullscreen'].forEach(function(fName) {
               if (typeof wrapper[fName] === 'function') {
                 wrapper[fName](Element.ALLOW_KEYBOARD_INPUT);
                 if (fName === 'webkitRequestFullScreen' && !document.webkitFullscreenElement) wrapper[fName]();
               }
            });

         } else {
            ['exitFullscreen', 'webkitCancelFullScreen', 'mozCancelFullScreen', 'msExitFullscreen'].forEach(function(fName) {
              if (typeof document[fName] === 'function') {
                document[fName]();
              }
            });
         }

      } else {
         player.trigger(flag ? FS_ENTER : FS_EXIT, [player]);
      }

      return player;
   };

   var lastClick;

   player.on("mousedown.fs", function() {
      if (+new Date() - lastClick < 150 && player.ready) player.fullscreen();
      lastClick = +new Date();
   });

  player.on(FS_ENTER, function() {
      common.addClass(root, 'is-fullscreen');
      common.toggleClass(root, 'fp-minimal-fullscreen', common.hasClass(root, 'fp-minimal'));
      common.removeClass(root, 'fp-minimal');

      if (!FS_SUPPORT) common.css(root, 'position', 'fixed');
      player.isFullscreen = true;

   }).on(FS_EXIT, function() {
      var oldOpacity;
      common.toggleClass(root, 'fp-minimal', common.hasClass(root, 'fp-minimal-fullscreen'));
      common.removeClass(root, 'fp-minimal-fullscreen');
      if (!FS_SUPPORT && player.engine === "html5") {
        oldOpacity = root.css('opacity') || '';
        common.css(root, 'opacity', 0);
      }
      if (!FS_SUPPORT) common.css(root, 'position', '');

      common.removeClass(root, 'is-fullscreen');
      if (!FS_SUPPORT && player.engine === "html5") setTimeout(function() { root.css('opacity', oldOpacity); });
      player.isFullscreen = false;
      win.scrollTo(scrollX, scrollY);
   }).on('unload', function() {
     if (player.isFullscreen) player.fullscreen();
   });

   player.on('shutdown', function() {
     FULL_PLAYER = null;
     common.removeNode(wrapper);
   });

});
