/**
 * Browser/device support detection
 *
 * Modernized: Removed IE, Windows Phone, BlackBerry, Silk, MeeGo detection.
 * Removed vendor-prefix animation detection.
 * Simplified fullscreen detection to standard + webkit.
 */
import type { SupportFlags } from '../types';
import freedomplayer from '../freedomplayer';

(function () {
  const UA = navigator.userAgent;

  const parseIOSVersion = (ua: string): number => {
    const e = /iP(ad|hone)(; CPU)? OS (\d+_\d)/.exec(ua);
    if (e && e.length > 1) return parseFloat(e[e.length - 1].replace('_', '.'));
    return 0;
  };

  const IS_IPAD = /iPad/.test(UA) && !/CriOS/.test(UA);
  const IS_IPAD_CHROME = /iPad/.test(UA) && /CriOS/.test(UA);
  const IS_IPHONE = /iP(hone|od)/i.test(UA) && !/iPad/.test(UA);
  const IS_ANDROID = /Android/.test(UA);
  const IS_ANDROID_FIREFOX = IS_ANDROID && /Firefox/.test(UA);
  const IS_ANDROID_SAMSUNG = IS_ANDROID && /SAMSUNG/.test(UA);
  const IOS_VER = IS_IPAD || IS_IPHONE ? parseIOSVersion(UA) : 0;
  const ANDROID_VER = IS_ANDROID ? parseFloat((/Android (\d+(\.\d+)?)/.exec(UA) || ['', '0'])[1]) : 0;

  const isSafari = /Safari/.test(UA) && !/Chrome/.test(UA);

  const ios = (IS_IPHONE || IS_IPAD || IS_IPAD_CHROME) ? {
    iPhone: IS_IPHONE,
    iPad: IS_IPAD || IS_IPAD_CHROME,
    version: IOS_VER,
    chrome: IS_IPAD_CHROME
  } : false;

  const s: SupportFlags = Object.assign(freedomplayer.support, {
    browser: {
      safari: isSafari,
      chrome: /Chrome/.test(UA) && !/Edge/.test(UA),
      version: (() => {
        const m = /(?:Chrome|Safari|Firefox|Edge)\/([\d.]+)/.exec(UA);
        return m ? m[1] : '0';
      })()
    },
    iOS: ios,
    android: IS_ANDROID ? {
      firefox: IS_ANDROID_FIREFOX,
      opera: /Opera/.test(UA),
      samsung: IS_ANDROID_SAMSUNG,
      version: ANDROID_VER
    } : false,

    subtitles: !!document.createElement('video').addTextTrack,

    // Standard fullscreen API or webkit fallback
    fullscreen: typeof document.fullscreenEnabled === 'boolean'
      ? document.fullscreenEnabled
      : typeof (document as any).webkitFullscreenEnabled === 'boolean'
        ? (document as any).webkitFullscreenEnabled
        : typeof (document as any).webkitCancelFullScreen === 'function',

    touch: 'ontouchstart' in window,

    dataload: !IS_IPAD && !IS_IPHONE,

    volume: !IS_IPAD && !IS_IPHONE && !IS_IPAD_CHROME && !IS_ANDROID,

    cachedVideoTag: !IS_IPAD && !IS_IPHONE && !IS_IPAD_CHROME,

    firstframe: !IS_ANDROID_FIREFOX && !IS_ANDROID_SAMSUNG
      && !(IOS_VER && IOS_VER < 10)
      && !(IS_ANDROID && ANDROID_VER < 4.4),

    // iOS12-COMPAT: inlineVideo check for old iOS — remove when iOS >= 15 is the floor
    inlineVideo: !IS_IPHONE || IOS_VER >= 10,

    hlsDuration: !IS_ANDROID && (!isSafari || IS_IPAD || IS_IPHONE || IS_IPAD_CHROME),

    seekable: !IS_IPAD && !IS_IPAD_CHROME,

    video: true,

    animation: typeof document.createElement('p').style.animationName !== 'undefined',

    autoplay: false,

    preloadMetadata: !ios && !isSafari,
  } satisfies SupportFlags);

  s.autoplay = s.firstframe;
})();
