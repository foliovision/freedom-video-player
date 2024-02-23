'use strict';
// skip IE policies
// document.ondragstart = function () { return false; };
//
var bean = require('bean'),
    common = require('../../common');


// execute function every <delay> ms
var throttle = function(fn, delay) {
   var locked;

   return function () {
      if (!locked) {
         fn.apply(this, arguments);
         locked = 1;
         setTimeout(function () { locked = 0; }, delay);
      }
   };
};


var slider = function(root, fp_api, fp_root) {

  var progress = common.lastChild(root),
      disabled,
      offset,
      width,
      height,
      vertical,
      size,
      maxValue,
      max,
      skipAnimation = false,
      fragments,

      /* private */
      calc = function() {
         offset = common.offset(root);
         width = common.width(root);
         height = common.height(root);

         /* exit from fullscreen can mess this up.*/
         // vertical = height > width;

         size = vertical ? height : width;
         max = toDelta(maxValue);
      },

      fire = function(value, no_seek) {
         if (!disabled && value != api.value && (!maxValue || value < maxValue)) {
            // do not seek in the video is not intended
            if( !no_seek ) {
               bean.fire(root, 'slide', [ value ]);
               api.value = value;
            }
         }
      },

      mousemove = function(e) {
         var pageX = e.pageX || e.clientX;
         // touchend
         if (!pageX && e.originalEvent && e.originalEvent.pageX) {
            pageX = e.originalEvent.pageX;
         }
         // touchmove
         if (!pageX && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length) {
            pageX = e.originalEvent.touches[0].pageX;
         }
         // touchend again
         if (!pageX && e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
            pageX = e.originalEvent.changedTouches[0].pageX;
         }

         var delta = vertical ? e.pageY - offset.top : pageX - offset.left;
         delta = Math.max(0, Math.min(max || size, delta));

         var value = delta / size;
         if (vertical) value = 1 - value;
         if (fp_api.rtl) value = 1 - value;
         return move(value, 0, true);
      },


      move = function(value, speed) {
         if (speed === undefined) { speed = 0; }
         if (value > 1) value = 1;

         var to = (Math.round(value * 1000) / 10) + "%";
         

         if (!maxValue || value <= maxValue) {
            if (skipAnimation) {
              common.removeClass(progress, 'animated');
            } else {
              common.addClass(progress, 'animated');
              common.css(progress, 'transition-duration', (speed || 0) + 'ms');
            }
               
               var currentProgress = (Math.round(value * 1000) / 10);

               fragments.forEach(function(fragment, index) {
                  
                  var progressElement = document.querySelectorAll('.fp-progress')[index]; //selects ft-progress element based on current object with start and end in fragments array
                  var fragmentWidth = 0;
                  if (currentProgress >= fragment.start && currentProgress <= fragment.end) {
                      fragmentWidth = (((currentProgress - fragment.start) / (fragment.end - fragment.start)) * 100) / fragments.length + "%"; 
                  } else if (currentProgress > fragment.end) {
                      fragmentWidth = "100%";
                  }
                  common.css(progressElement, 'width', fragmentWidth); //this need to be adjusted because it doesnt work for fragments of different sizes
              });
         
         }

         return value;
      },

      toDelta = function(value) {
         return Math.max(0, Math.min(size, vertical ? (1 - value) * height : value * width));
      },

      /* public */
      api = {

         max: function(value) {
            maxValue = value;
         },

         disable: function(flag) {
            disabled = flag;
         },

         setFragments: function(FragmentsArray) {
            fragments = FragmentsArray;
            if( root.querySelector('.fp-progress') ) root.querySelector('.fp-progress').remove(); //remove progress so it can load progress for fragments

            var left = 0;
            
            FragmentsArray.forEach(function(fragment, index) {
               var maxWidth = ((fragment.end - fragment.start) / 100) * 100; //
               console.log(maxWidth)
               root.appendChild(common.createElement('div', {
                  'class': "fp-progress fp-color animated",
                  'style': "transition-duration: 250ms; max-width: " + maxWidth + "%; left:" + left + "%;"
              }));
               left = left + maxWidth 
            })
         },

         slide: function(value, speed, fireEvent) {
            calc();
            if (fireEvent) fire(value);
            move(value, speed);
         },

         // Should animation be handled via css
         disableAnimation: function(value, alsoCssAnimations) {
            skipAnimation = value !== false;
            common.toggleClass(root, 'no-animation', !!alsoCssAnimations);
         }

      };

  calc();

  // bound dragging into document
  bean.on(root, 'mousedown.sld touchstart', function(e) {

    /**
     * Do nothing if the mouse is out of the player (or mobile overlay controls are not showing), unless the 
     * player is in splash mode, seeking, control bar is always on or it's mobile seeking
     */
    if ( 
      common.hasClass(fp_root, 'is-mouseout') &&
      ! common.hasClass(fp_root, 'is-splash') &&
      ! common.hasClass(fp_root, 'is-seeking') &&
      ! common.hasClass(fp_root, 'fixed-controls') &&
      ! common.hasClass(fp_root, 'is-mobile-seeking')
    ) {
      return;
    }

    e.preventDefault();

    if (!disabled) {
      // begin --> recalculate. allows dynamic resizing of the slider
      var delayedFire = throttle(fire, 100);
      calc();
      api.dragging = true;
      fire(mousemove(e));

      bean.on(document, 'mousemove.sld touchmove.sld', function(e) {
        common.addClass(root, 'is-fp-dragging');

        e.preventDefault();

        // do not seek into the position if the video has timeline previews
        delayedFire(mousemove(e), fp_api.video.timeline_vtt );

      });
      bean.one(document, 'mouseup touchend', function(e) {
         // seek into the position if the video has timeline previews
         // and only stop dragging once the video seeks
         // otherwise the playing video progress might update the timeline
         // we do not use proper seek event for failsafe
         if( fp_api.video.timeline_vtt ) {
            fire(mousemove(e));
            setTimeout( function() {
               api.dragging = false;
            }, 250 );

         } else {
            api.dragging = false;
         }
         common.removeClass(root, 'is-fp-dragging');
         bean.off(document, 'mousemove.sld touchmove.sld');
      });

     }

  });
  return api;
};

module.exports = slider;
