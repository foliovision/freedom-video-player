/**
 * Fullscreen extension
 *
 * Modernized: Uses standard Fullscreen API with webkit fallback only.
 * Removed moz, ms, and old webkit vendor prefixes.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff } from './events';
import type { PlayerApi } from '../types';

const FS_ENTER = 'fullscreen';
const FS_EXIT = 'fullscreen-exit';
let FULL_PLAYER: PlayerApi | null = null;
const FS_SUPPORT = freedomplayer.support.fullscreen;

// Listen for fullscreen change — standard + webkit fallback
domOn(document, 'fullscreenchange.ffscr webkitfullscreenchange.ffscr', () => {
  const el = (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).webkitCurrentFullScreenElement) as HTMLElement | null;
  if (el) {
    if (!FULL_PLAYER && (!el.parentNode || !(el.parentNode as HTMLElement).getAttribute('data-freedomplayer-instance-id'))) return;
    const player = FULL_PLAYER || freedomplayer(el.parentNode as HTMLElement);
    if (player) {
      FULL_PLAYER = player;
      player.trigger(FS_ENTER, [player]);
    }
  } else if (FULL_PLAYER) {
    FULL_PLAYER.trigger(FS_EXIT, [FULL_PLAYER]);
    FULL_PLAYER = null;
  }
});

freedomplayer(function (player: PlayerApi, root: HTMLElement) {
  const wrapper = common.createElement('div', { className: 'fp-player' });
  Array.from(root.children).forEach(el => {
    if (el.matches('.fp-ratio,script')) return;
    wrapper.appendChild(el);
  });
  root.appendChild(wrapper);

  const win = window;
  let scrollY: number;
  let scrollX: number;

  player.isFullscreen = false;

  player.fullscreen = function (flag?: boolean) {
    if (player.disabled || !player.conf.fullscreen) return player;

    if (flag === undefined) flag = !player.isFullscreen;

    if (flag) {
      scrollY = win.scrollY;
      scrollX = win.scrollX;
    }

    if (FS_SUPPORT) {
      if (flag) {
        // Standard API first, webkit fallback
        if (typeof wrapper.requestFullscreen === 'function') {
          wrapper.requestFullscreen();
        } else if (typeof (wrapper as any).webkitRequestFullScreen === 'function') {
          (wrapper as any).webkitRequestFullScreen();
          // Some webkit implementations require a second call without arguments
          if (!(document as any).webkitFullscreenElement) {
            (wrapper as any).webkitRequestFullScreen();
          }
        }
      } else {
        if (typeof document.exitFullscreen === 'function') {
          document.exitFullscreen();
        } else if (typeof (document as any).webkitCancelFullScreen === 'function') {
          (document as any).webkitCancelFullScreen();
        }
      }
    } else {
      player.trigger(flag ? FS_ENTER : FS_EXIT, [player]);
    }

    return player;
  };

  let lastClick = 0;
  player.on('mousedown.fs', () => {
    if (+new Date() - lastClick < 150 && player.ready) player.fullscreen();
    lastClick = +new Date();
  });

  player.on(FS_ENTER, () => {
    common.addClass(root, 'is-fullscreen');
    common.toggleClass(root, 'fp-minimal-fullscreen', common.hasClass(root, 'fp-minimal'));
    common.removeClass(root, 'fp-minimal');
    if (!FS_SUPPORT) common.css(root, 'position', 'fixed');
    player.isFullscreen = true;

  }).on(FS_EXIT, () => {
    common.toggleClass(root, 'fp-minimal', common.hasClass(root, 'fp-minimal-fullscreen'));
    common.removeClass(root, 'fp-minimal-fullscreen');
    if (!FS_SUPPORT) common.css(root, 'position', '');
    common.removeClass(root, 'is-fullscreen');
    player.isFullscreen = false;
    win.scrollTo(scrollX, scrollY);

  }).on('unload', () => {
    if (player.isFullscreen) player.fullscreen();
  });

  player.on('shutdown', () => {
    FULL_PLAYER = null;
    common.removeNode(wrapper);
  });
});
