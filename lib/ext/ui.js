'use strict';
var flowplayer = require('../flowplayer'),
    common = require('../common'),
    bean = require('bean'),
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

var PLAY_ROUNDED_OUTLINE = "<svg class=\"fp-play-rounded-outline\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 99.844 99.8434\"><defs><style>.fp-color-play{opacity:0.65;}.controlbutton{fill:#fff;}</style>\n</defs>\n<title>play-rounded-outline</title><path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/><path class=\"controlbutton\" d=\"M41.0359,71.19a5.0492,5.0492,0,0,1-2.5575-.6673c-1.8031-1.041-2.7958-3.1248-2.7958-5.8664V35.1887c0-2.7429.9933-4.8272,2.797-5.8676,1.8025-1.0422,4.1034-.86,6.48.5143L70.4782,44.5672c2.3751,1.3711,3.6826,3.2725,3.6832,5.3545s-1.3076,3.9845-3.6832,5.3562L44.9592,70.0114A7.9384,7.9384,0,0,1,41.0359,71.19Zm.0065-40.123a2.6794,2.6794,0,0,0-1.3582.3413c-1.0263.5926-1.5912,1.9349-1.5912,3.78V64.6563c0,1.8449.5649,3.1866,1.5906,3.7791,1.0281.5932,2.4733.4108,4.07-.512L69.273,53.1906c1.5983-.9227,2.478-2.0838,2.478-3.2689s-.88-2.3445-2.478-3.2666L43.754,31.9227A5.5685,5.5685,0,0,0,41.0423,31.0671Z\" filter=\"url(#f1)\"/></svg>\n"
  , PLAY_ROUNDED_FILL = "<svg class=\"fp-play-rounded-fill\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n  <defs><style>.a{fill:#000;opacity:0.65;}.b{fill:#fff;opacity:1.0;}</style>\n  </defs><title>play-rounded-fill</title>\n  <path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/>\n  <path class=\"b\" d=\"M35.942,35.2323c0-4.7289,3.3506-6.6637,7.446-4.2971L68.83,45.6235c4.0956,2.364,4.0956,6.2319,0,8.5977L43.388,68.91c-4.0954,2.364-7.446.43-7.446-4.2979Z\" filter=\"url(#f1)\"/>\n  </svg>\n  \n"
  , PLAY_SHARP_FILL = "<svg class=\"fp-play-sharp-fill\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n  <defs>\n    <style>.fp-color-play{opacity:0.65;}.controlbutton{fill:#fff;}</style>\n  </defs>\n  <title>play-sharp-fill</title>\n  <path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/>\n  <polygon class=\"controlbutton\" points=\"73.601 50 37.968 70.573 37.968 29.427 73.601 50\" filter=\"url(#f1)\"/>\n</svg>\n"
  , PLAY_SHARP_OUTLINE = "<svg class=\"fp-play-sharp-outline\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 99.844 99.8434\"><defs><style>.controlbuttonbg{opacity:0.65;}.controlbutton{fill:#fff;}</style>\n</defs><title>play-sharp-outline</title><path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/><path class=\"controlbutton\" d=\"M36.9443,72.2473V27.2916L75.8776,49.77Zm2.2-41.1455V68.4371L71.4776,49.77Z\" filter=\"url(#f1)\"/></svg>\n"
  , PAUSE_ROUNDED_OUTLINE = "<svg class=\"fp-pause-rounded-outline\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 99.8434 99.8434\"><defs><style>.fp-color-play{opacity:0.65;}.rect{fill:#fff;}</style>\n</defs><title>pause-rounded-outline</title><path class=\"fp-color-play\" d=\"M49.9212-.0783a50,50,0,1,0,50.0006,50A50.0562,50.0562,0,0,0,49.9212-.0783Z\"/><g class=\"controlbutton\"><path class=\"rect\" d=\"M39.0036,71.9726a7.565,7.565,0,0,1-7.557-7.556v-28.99a7.5565,7.5565,0,0,1,15.113,0v28.99A7.5648,7.5648,0,0,1,39.0036,71.9726Zm0-41.904a5.3647,5.3647,0,0,0-5.3593,5.3582v28.99a5.3587,5.3587,0,0,0,10.7174,0v-28.99A5.3645,5.3645,0,0,0,39.0036,30.0686Z\" filter=\"url(#f1)\"/><path class=\"rect\" d=\"M60.84,71.9726a7.5648,7.5648,0,0,1-7.556-7.556v-28.99a7.5565,7.5565,0,0,1,15.113,0v28.99A7.565,7.565,0,0,1,60.84,71.9726Zm0-41.904a5.3645,5.3645,0,0,0-5.3582,5.3582v28.99a5.3587,5.3587,0,0,0,10.7174,0v-28.99A5.3647,5.3647,0,0,0,60.84,30.0686Z\" filter=\"url(#f1)\"/></g></svg>\n"
  , PAUSE_ROUNDED_FILL = "<svg class=\"fp-pause-rounded-fill\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><style>.fp-color-play{opacity:0.65;}.rect{fill:#fff;}</style>\n</defs><title>pause-rounded-fill</title><path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/><g class=\"controlbutton\" filter=\"url(#f1)\"><rect class=\"rect\" x=\"31.844\" y=\"28.1231\" width=\"13.4362\" height=\"43.5973\" rx=\"6.7181\" ry=\"6.7181\"/><rect class=\"rect\" x=\"54.5638\" y=\"28.1231\" width=\"13.4362\" height=\"43.5973\" rx=\"6.7181\" ry=\"6.7181\"/></g></svg>\n"
  , PAUSE_SHARP_FILL = "<svg class=\"fp-pause-sharp-fill\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><style>.fp-color-play{opacity:0.65;}.rect{fill:#fff;}</style>\n</defs><title>pause-sharp-fill</title><path class=\"fp-color-play\" d=\"M49.9217-.078a50,50,0,1,0,50,50A50.0564,50.0564,0,0,0,49.9217-.078Z\"/><g class=\"controlbutton\" filter=\"url(#f1)\"><rect class=\"rect\" x=\"33.5\" y=\"30.1042\" width=\"12.2634\" height=\"39.7917\"/><rect class=\"rect\" x=\"54.2366\" y=\"30.1042\" width=\"12.2634\" height=\"39.7917\"/></g></svg>\n"
  , PAUSE_SHARP_OUTLINE = "<svg class=\"fp-pause-sharp-outline\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 99.8434 99.8434\"><defs><style>.fp-color-play{opacity:0.65;}.rect{fill:#fff;}</style>\n</defs><title>pause-sharp-outline</title><path class=\"fp-color-play\" d=\"M49.9212-.0783a50,50,0,1,0,50.0006,50A50.0562,50.0562,0,0,0,49.9212-.0783Z\"/><g class=\"controlbutton\" filter=\"url(#f1)\"><path class=\"rect\" d=\"M46.8709,69.9531H33.1385V29.89H46.8709ZM35.1416,67.95h9.7262V31.8935H35.1416Z\"/><path class=\"rect\" d=\"M66.7047,69.9531H52.9722V29.89H66.7047ZM54.9754,67.95h9.7262V31.8935H54.9754Z\"/></g></svg>\n";

var LOADING_ROUNDED_OUTLINE = "<svg class=\"fp-loading-rounded-outline\" width='112px' height='112px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\">\n    <rect x=\"0\" y=\"0\" width=\"76\" height=\"76\" fill=\"rgba(0,0,0,0)\" class=\"bk\"></rect>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(25 25)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n      <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.0s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.0s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(50 25)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n      <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.4s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.4s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(50 50)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n      <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.8s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.8s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(25 50)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n      <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"1.2s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"1.2s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n</svg>\n"
  , LOADING_ROUNDED_FILL = "<svg class=\"fp-loading-rounded-fill\" width='112px' height='112px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\">\n    <rect x=\"0\" y=\"0\" width=\"76\" height=\"76\" fill=\"rgba(0,0,0,0)\" class=\"bk\"></rect>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(25 25)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n      <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.0s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.0s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(50 25)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n      <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.4s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.4s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(50 50)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n      <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.8s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.8s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n    <circle cx=\"0\" cy=\"0\" r=\"10\" transform=\"translate(25 50)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n      <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"1.2s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"1.2s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n    </circle>\n</svg>\n"
  , LOADING_SHARP_FILL = "<svg class=\"fp-loading-sharp-fill\" width='112px' height='112px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\">\n  <rect x=\"0\" y=\"0\" width=\"76\" height=\"76\" fill=\"rgba(0,0,0,0)\" class=\"bk\"></rect>\n  <rect x=\"-10\" y=\"-10\" width=\"20\" height=\"20\" transform=\"translate(25 25)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n    <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.0s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n    <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.0s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-10\" y=\"-10\" width=\"20\" height=\"20\" transform=\"translate(50 25)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n    <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.4s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n    <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.4s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-10\" y=\"-10\" width=\"20\" height=\"20\" transform=\"translate(50 50)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n    <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.8s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n    <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.8s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-10\" y=\"-10\" width=\"20\" height=\"20\" transform=\"translate(25 50)\" fill=\"rgba(0,0,0,.5)\" class=\"sq\">\n    <animate attributeName=\"fill\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"1.2s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n    <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"1.2s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n</svg>\n"
  , LOADING_SHARP_OUTLINE = "<svg class=\"fp-loading-sharp-outline\" width='112px' height='112px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\">\n  <rect x=\"0\" y=\"0\" width=\"76\" height=\"76\" fill=\"rgba(0,0,0,0)\" class=\"bk\"></rect>\n  <rect x=\"-9\" y=\"-9\" width=\"18\" height=\"18\" transform=\"translate(25 25)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n    <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.0s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.0s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-9\" y=\"-9\" width=\"18\" height=\"18\" transform=\"translate(50 25)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n    <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.4s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.4s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-9\" y=\"-9\" width=\"18\" height=\"18\" transform=\"translate(50 50)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n    <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"0.8s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"0.8s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n  <rect x=\"-9\" y=\"-9\" width=\"18\" height=\"18\" transform=\"translate(25 50)\" fill=\"none\" stroke=\"rgba(0,0,0,.5)\" stroke-width=\"3%\" class=\"sq\">\n    <animate attributeName=\"stroke\" from=\"rgba(0,0,0,0)\" to=\"rgba(0,0,0,.5)\" repeatCount=\"indefinite\" dur=\"1.6s\" begin=\"1.2s\" values=\"rgba(0,0,0,.5);rgba(0,0,0,0);rgba(0,0,0,0);rgba(0,0,0,.5);rgba(0,0,0,.5)\" keyTimes=\"0;0.1;0.2;0.4;1\"></animate>\n      <animateTransform attributeName=\"transform\" type=\"scale\" additive=\"sum\" from=\"0.8\" to=\"1\" repeatCount=\"indefinite\" begin=\"1.2s\" dur=\"1.6s\" values=\"1;0.8;0.8;1;1\" keyTimes=\"0;0.1;0.2;0.4;1\"></animateTransform>\n  </rect>\n</svg>\n";

flowplayer(function(api, root) {
   // This should only be done once, previously it was done for each player, adding about 5 ms for 10 players
   if( !flowplayer.added_svg_filters ) {
      flowplayer.added_svg_filters = true;

      try {
         var fc;
         document.body.appendChild(fc = common.createElement('div', {}, fs.readFileSync(__dirname + '/ui/svg/filters.svg')));
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

   var conf = api.conf,
      support = flowplayer.support,
      hovertimer;
   common.find('.fp-ratio,.fp-ui', root).forEach(common.removeNode);
   common.addClass(root, 'flowplayer');
   root.appendChild(common.createElement('div', {className: 'fp-ratio'}));

   // Initially the .fp-ui element is hidden, we show it with requestAnimationFrame later on to optimize modern browser loading
   var ui = common.createElement('div', {className: 'fp-ui', style: 'display: none'}, '\
         <div class="fp-waiting">\
           {{ LOADING_SHARP_OUTLINE }}\
           {{ LOADING_SHARP_FILL }}\
           {{ LOADING_ROUNDED_FILL }}\
           {{ LOADING_ROUNDED_OUTLINE }}\
         </div>\
         <div class="fp-header">\
           <a class="fp-share fp-icon"></a>\
           <a class="fp-fullscreen fp-icon"></a>\
           <a class="fp-unload fp-icon"></a>\
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
            <strong class="fp-speed fp-hidden"></strong>\
         </div>'.replace('{{ PAUSE_ROUNDED_FILL }}', PAUSE_ROUNDED_FILL)
                .replace('{{ PAUSE_ROUNDED_OUTLINE }}', PAUSE_ROUNDED_OUTLINE)
                .replace('{{ PAUSE_SHARP_FILL }}', PAUSE_SHARP_FILL)
                .replace('{{ PAUSE_SHARP_OUTLINE }}', PAUSE_SHARP_OUTLINE)
                .replace('{{ PLAY_SHARP_OUTLINE }}', PLAY_SHARP_OUTLINE)
                .replace('{{ PLAY_SHARP_FILL }}', PLAY_SHARP_FILL)
                .replace('{{ PLAY_ROUNDED_OUTLINE }}', PLAY_ROUNDED_OUTLINE)
                .replace('{{ PLAY_ROUNDED_FILL }}', PLAY_ROUNDED_FILL)
                .replace('{{ LOADING_ROUNDED_OUTLINE }}', LOADING_ROUNDED_OUTLINE)
                .replace('{{ LOADING_ROUNDED_FILL }}', LOADING_ROUNDED_FILL)
                .replace('{{ LOADING_SHARP_FILL }}', LOADING_SHARP_FILL)
                .replace('{{ LOADING_SHARP_OUTLINE }}', LOADING_SHARP_OUTLINE)
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
      timelineApi = slider(timeline, api),

      fullscreen = find("fullscreen"),
      volumeSlider = find("volumebar"),
      volumeApi = barSlider(volumeSlider, { rtl: api.rtl }),
      noToggle = common.hasClass(root, 'no-toggle');

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

   function hover(flag) {
     if (flag) {
       common.addClass(root, 'is-mouseover');
       common.removeClass(root, 'is-mouseout');
     } else {
       common.addClass(root, 'is-mouseout');
       common.removeClass(root, 'is-mouseover');
     }
   }

   // loading...
   if (!support.svg) common.html(waiting, "<p>loading &hellip;</p>");

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

      time = time || api.video.time;
      var percentage = (time - offset) / (duration - offset);
      if (!timelineApi.dragging) {
        timelineApi.slide(percentage, api.seeking ? 0 : 250);
      }
      common.toggleClass(root, 'is-live-position', duration - time < conf.livePositionOffset);

      common.html(elapsed, format(time));
      common.html(remaining, format(duration - time, true));

   }).on("finish resume seek", function(e) {
      common.toggleClass(root, "is-finished", e.type == "finish");
   }).on('resume', function() {
      common.addClass(play, 'fp-visible');
      setTimeout(function() { common.removeClass(play, 'fp-visible'); }, 300);
   }).on('pause', function() {
      common.addClass(pause, 'fp-visible');
      setTimeout(function() { common.removeClass(pause, 'fp-visible'); }, 300);
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

      var is_over = e.type == "mouseover",
         lastMove;

      // is-mouseover/out
      hover(is_over);

      if (is_over) {

         var reg = function() {
            hover(true);
            lastMove = new Date();
         };
         api.on("pause.x volume.x", reg);
         bean.on(root, 'mousemove.x touchmove.x', reg);

         // clear any previously set interval
         // if you overlay iframe on top of player you might get 2 mousenter events in a row
         clearInterval(hovertimer);

         hovertimer = setInterval(function() {
            if (new Date() - lastMove > conf.mouseoutTimeout) {
               hover(false);
               lastMove = new Date();
            }
         }, 100);

      } else {
         bean.off(root, 'mousemove.x touchmove.x');
         api.off("pause.x volume.x");
         clearInterval(hovertimer);
      }


   // allow dragging over the player edge
   });
   bean.on(root, "mouseleave", function() {

     if (timelineApi.dragging || volumeApi.dragging) {
       common.addClass(root, 'is-mouseover');
       common.removeClass(root, 'is-mouseout');
     }

   // click
   });
   bean.on(root, "click.player", function(e) {
     if (api.disabled) return;
     if (common.hasClass(e.target, 'fp-ui') || common.hasClass(e.target, 'fp-engine') || e.flash || common.hasParent(e.target, '.fp-play,.fp-pause')) {
         if (e.preventDefault) e.preventDefault();
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
      if (common.hasClass(root, 'is-flash-disabled')) return;
      var menu = common.find('.fp-context-menu', root)[0];
      if (!menu) return;
      ev.preventDefault();
      api.showMenu(menu, {
        left: ev.clientX - w.scrollX,
        top: ev.clientY - w.scrollY
      });
      bean.on(root, 'click', '.fp-context-menu', function(ev) {
         ev.stopPropagation();
      });
   });
   api.on('flashdisabled', function(_e, _a, showMessage) {
     common.addClass(root, 'is-flash-disabled');
     var dismiss;
     if (showMessage !== false) dismiss = api.message('Seems something is blocking Adobe Flash from running');
     api.one('ready progress', function() {
       common.removeClass(root, 'is-flash-disabled');
       if (dismiss) dismiss();
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

   bean.on(root, 'click', '.fp-toggle, .fp-play, .fp-playbtn', function() {
     if (api.disabled) return;
     api.toggle();
   });

   /* controlbar elements */
   bean.on(root, 'click', '.fp-volumebtn', function() { api.mute(); }); bean.on(root, 'click', '.fp-fullscreen', function() { api.fullscreen(); });
   bean.on(root, 'click', '.fp-unload', function() { api.unload(); });

   bean.on(timeline, 'slide', function(val) {
     api.seeking = true;
     api.seekTo(val * 10);
   });

   bean.on(volumeSlider, 'slide', function(val) {
      api.volume(val);
   });

   // times

   bean.on(root, 'click', '.fp-duration,.fp-remaining', function() {
     if (api.dvr) return api.seekTo(10);
     common.toggleClass(root, 'is-inverted');
   });

   hover(noToggle);

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
