'use strict';
var freedomplayer = require('../freedomplayer'),
  bean = require('bean'),
  common = require('../common'),
  focused,
  focusedRoot,
  focusedEl;

freedomplayer(function(api, root) {
  // no keyboard configured
  if (!api.conf.keyboard) return;

  // Helper function to get all tabbable elements
  function getTabbableElements() {
    return common.find('[tabindex]', root);
  }

  // Helper function to check if any element in the player has focus
  function hasFocusInPlayer() {
    return getTabbableElements().some(function(el) {
      return document.activeElement === el;
    });
  }

  // Helper function to handle focus state
  function handleFocusState( el, isFocused ) {
    if ( ! el ) return;
    
    if ( isFocused ) {
      focused = ! api.disabled ? api : 0;
      if ( focused ) {
        console.log('FV Player element got focus:', el.className);
        focusedRoot = root;
        focusedEl = el;
        common.addClass(root, "is-mouseover");
        api.accessibility_focus = true;
      }

    } else {
      console.log('FV Player element lost focus:', el.className);

      if ( ! hasFocusInPlayer() ) {
        console.log('focusedRoot = false');
        focusedRoot = false;
        focusedEl = null;
        common.removeClass(root, "is-mouseover");
        api.accessibility_focus = false;
      }
    }
  }

  // keyboard. single global listener
  bean.on(document, "keydown.fp", function(e) {
    if( typeof(focused) == "undefined" ) return;

    var api = focused;

    // no keybinds when controlbar is disabled or video ad
    if( common.hasClass( focusedRoot, "no-controlbar") || common.hasClass( focusedRoot, "is-cva") ) return;

    if ( ! api || ! api.conf.keyboard || api.disabled ) return;

    if ( focusedRoot !== root ) {
      return;
    }

    /**
     * Progress bar
     */
    if ( common.hasClass( focusedEl, 'fp-progress' ) ) {

      var handled = true;
      // Home
      if (e.which === 36) {
        api.seekTo( 0 );

      // End
      } else if (e.which === 35) {
        api.seekTo( 10 );

      // Left arrow or down arrow
      } else if ( e.which === 37 || e.which === 40 ) {
        api.seek( api.video.time - 5 );

      // Right arrow or up arrow
      } else if ( e.which === 39 || e.which === 38 ) {
        api.seek( api.video.time + 5 );

      // Do nothing for space and enter keys
      } else if ( e.which === 13 || e.which === 32 ) {

      } else {
        handled = false;
      }

      if ( handled ) {
        e.preventDefault();
      }

    /**
     * Volume bar
     */
    } else if ( common.hasClass( focusedEl, 'fp-volumebar' ) ) {

      var handled = true;
      // Home
      if (e.which === 36) {
        api.volume( 0 );

      // End
      } else if (e.which === 35) {
        api.volume( 1 );

      // Left arrow or down arrow
      } else if ( e.which === 37 || e.which === 40 ) {
        api.volume( api.volumeLevel - 0.15 );

      // Right arrow or up arrow
      } else if ( e.which === 39 || e.which === 38 ) {
        api.volume( api.volumeLevel + 0.15 );

      // Do nothing for space and enter keys
      } else if ( e.which === 13 || e.which === 32 ) {

      } else {
        handled = false;
      }

      if ( handled ) {
        e.preventDefault();
      }

    } else {
      if ( e.which === 13 || e.which === 32 ) {

        e.preventDefault();

        console.log('Space or Enter key pressed');

        /**
         * Play/Pause button
         */
        if ( common.hasClass( focusedEl, 'freedomplayer' ) || common.hasClass( focusedEl, 'fp-playbtn' ) ) {
          api.toggle();

        /**
         * Volume button
         */
        } else if ( common.hasClass( focusedEl, 'fp-volumebtn' ) ) {
          api.mute();

        /**
         * Fullscreen button
         */
        } else if ( common.hasClass( focusedEl, 'fp-fullscreen' ) ) {
          api.fullscreen();
        }
      }
    }

  });

  // Handle focus for all tabbable elements
  getTabbableElements().forEach(function(el) {
    bean.on(el, "focus", function(e) {
      handleFocusState(el, true);
    });

    bean.on(el, "blur", function(e) {
      handleFocusState(el, false);
    });
  });

  // Handle focus on the root element
  bean.on(root, "focus", function(e) {
    handleFocusState(root, true);
  });

  bean.on(root, "blur", function(e) {
    handleFocusState(root, false);
  });

});