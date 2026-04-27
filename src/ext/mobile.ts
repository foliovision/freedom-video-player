/**
 * Mobile touch extension
 *
 * Modernized:
 * - Removed IEMobile, Silk, old Android < 4 workarounds
 * - Replaced bean with native addEventListener
 * - Uses standard touch event APIs
 * - iOS12-COMPAT: webkitEnterFullScreen for native iPhone fullscreen
 */
import ICON_FORWARD from './ui/svg/fp-forward.svg';
import ICON_REWIND from './ui/svg/fp-rewind.svg';
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff, domOne } from './events';
import { format } from './ui';
import type { PlayerApi } from '../types';

const support = freedomplayer.support;

if (support.touch) {

  freedomplayer(function (player: PlayerApi, root: HTMLElement) {
    const android = support.android;
    const isAndroid = !!(android && !(android as any).firefox);

    const iconFilter = 'url(' + window.location.href.replace(window.location.hash, '').replace(/\#$/g, '') + '#';

    const ui = common.find('.fp-ui', root)[0] as HTMLElement;
    const timeline = common.find('.fp-timeline', root)[0] as HTMLElement;
    const fullscreen = common.find('.fp-fullscreen', root)[0] as HTMLElement;
    let fullscreenExitHintCount = 0;
    let fullscreenExitHintTimer: ReturnType<typeof setInterval> | null = null;
    let seekTo = 0;
    let intHideForwardRewind: ReturnType<typeof setTimeout>;

    if (!common.hasClass(root, 'no-controlbar')) {
      const forward = common.createElement('div', { className: 'fp-forward' }, ICON_FORWARD.replace(/url\(#/g, iconFilter));
      const rewind = common.createElement('div', { className: 'fp-rewind' }, ICON_REWIND.replace(/url\(#/g, iconFilter));
      ui.appendChild(forward);
      ui.appendChild(rewind);

      domOn(forward, player.touch_events(), (e: Event) => {
        if (player.disabled) return;
        e.preventDefault(); e.stopPropagation();
        hideOverlay(); seek(true);
      });

      domOn(rewind, player.touch_events(), (e: Event) => {
        if (player.disabled) return;
        e.preventDefault(); e.stopPropagation();
        hideOverlay(); seek(false);
      });
    }

    function seek(isForward?: boolean): void {
      if (!seekTo) seekTo = player.video.time || 0;
      seekTo = isForward ? seekTo + 10 : seekTo - 10;
      player.seek(seekTo, () => { seekTo = 0; });
    }

    function hideOverlay(): void {
      player.hover?.(false);
      common.addClass(root, 'is-mobile-seeking');
      clearTimeout(intHideForwardRewind);
      intHideForwardRewind = setTimeout(() => {
        if (timeline && common.hasClass(timeline, 'is-fp-dragging')) { hideOverlay(); return; }
        common.removeClass(root, 'is-mobile-seeking');
      }, 2000);
    }

    // Volume capability check — only run once
    if (!freedomplayer.did_volume_check) {
      freedomplayer.did_volume_check = true;
      const audio = new Audio();
      audio.volume = 0.5;
      setTimeout(() => {
        if (audio.volume !== 0.5 || support.android) {
          common.addClass(root, 'no-volume');
          support.volume = false;
        } else {
          support.volume = true;
        }
      });
    }

    common.addClass(root, 'is-touch');
    if ((player as any).sliders?.timeline) (player as any).sliders.timeline.disableAnimation();

    let hasMoved = false;
    domOn(root, 'touchmove', () => { hasMoved = true; });

    let initialClick = true;
    let lastTap = 0;
    const doubleTapTime = 300;
    let hoverInt: ReturnType<typeof setTimeout>;

    // Double tap seeking
    domOn(root, 'touchend', (e: Event) => {
      const ev = e as TouchEvent;
      const target = ev.target as HTMLElement;
      if (typeof (player.video as any).click !== 'undefined') return;

      const isRewind = target.closest('.fp-rewind') !== null;
      const isForward = target.closest('.fp-forward') !== null;
      const doubleTapDuration = new Date().getTime() - lastTap;

      if (lastTap && doubleTapDuration > 20 && doubleTapDuration < doubleTapTime && (isRewind || isForward)) {
        if (player.video?.duration) {
          let seekTarget = player.video.time || 0;
          clearTimeout(hoverInt);
          if (isRewind) { seekTarget -= 10; if (seekTarget < 0) seekTarget = 0; }
          else { seekTarget += 10; if (seekTarget > (player.video.duration || 0)) seekTarget = player.video.duration || 0; }

          common.addClass(root, 'is-mobile-seeking');
          setTimeout(() => common.removeClass(root, 'is-mobile-seeking'), 500);
          player.seek(seekTarget);
          lastTap = new Date().getTime();
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
      }
      lastTap = new Date().getTime();
    });

    domOn(root, 'touchend click', (e: Event) => {
      if (hasMoved) { hasMoved = false; return; }
      const target = e.target as HTMLElement;

      const video = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
      if (initialClick && player.conf.clickToUnMute && video?.muted && player.conf.autoplay) video.muted = false;
      initialClick = false;

      const usedMobileSeeking = !!(target.closest('.fp-rewind') || target.closest('.fp-forward'));

      const doNotShowOverlay =
        common.hasClass(root, 'is-mouseover') ||
        (common.hasClass(root, 'is-mobile-seeking') && usedMobileSeeking) ||
        (common.hasClass(root, 'fixed-controls') && !!target.closest('.fp-controls')) ||
        (common.hasClass(root, 'no-controlbar') && !common.hasClass(root, 'have-buttons')) ||
        !!target.closest('.wpfp_custom_background');

      if (player.was_played) {
        if (!doNotShowOverlay || target.matches('.fp-ui,.fp-engine,.fp-header') || usedMobileSeeking) {
          clearTimeout(hoverInt);
          if (typeof (player.video as any).click !== 'undefined') return;

          hoverInt = setTimeout(() => {
            if (usedMobileSeeking) {
              player.hover?.(false);
              common.addClass(root, 'is-mobile-seeking');
              hideOverlay();
            } else {
              const x = (e as TouchEvent).changedTouches?.[0]?.clientX ?? (e as MouseEvent).clientX;
              const y = ((e as TouchEvent).changedTouches?.[0]?.clientY ?? (e as MouseEvent).clientY) - window.scrollY;

              if (
                !player.isFullscreen ||
                (x > window.innerWidth / 6 && x < 5 * window.innerWidth / 6 && y > 10 && y < window.innerHeight - 10) ||
                (x > 10 && x < window.innerWidth - 10 && y > 0.8 * window.innerHeight && y < window.innerHeight - 10)
              ) {
                player.hover?.(!doNotShowOverlay);
                if (!doNotShowOverlay) common.removeClass(root, 'is-mobile-seeking');
              }

              if (
                !common.hasClass(root, 'is-mouseover') && player.isFullscreen &&
                x > 7 * window.innerWidth / 8 && x < window.innerWidth - 10 && y > 10 && y < window.innerHeight / 8
              ) {
                fullscreenExitHintCount++;
                if (fullscreenExitHintCount >= 2) {
                  fullscreenExitHintCount = 0;
                  common.addClass(root, 'is-fullscreen-exit-hint');
                  setTimeout(() => {
                    common.removeClass(root, 'is-fullscreen-exit-hint');
                    if (fullscreenExitHintTimer) clearInterval(fullscreenExitHintTimer);
                  }, 2000);
                  if (fullscreenExitHintTimer) clearInterval(fullscreenExitHintTimer);
                  fullscreenExitHintTimer = setInterval(() => {
                    if (fullscreen) common.toggleClass(fullscreen, 'bold');
                  }, 300);
                }
              } else {
                fullscreenExitHintCount = 0;
              }
            }
          }, doubleTapTime / 2);

          if (player.playing && common.hasParent(target, '.fp-pause')) return;
          if (!doNotShowOverlay) { e.preventDefault(); e.stopPropagation(); }
          return;
        }
      }

      if (!player.was_played && !player.splash && common.hasClass(root, 'is-mouseout') && !common.hasClass(root, 'is-mouseover')) {
        setTimeout(() => {
          if (!player.disabled && !player.playing && !player.splash) {
            const engine = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
            engine?.play();
          }
        }, 400);
      }
    });

    // iOS12-COMPAT: webkitEnterFullScreen for native iPhone fullscreen — remove when iOS >= 15 is the floor
    if (!support.fullscreen && player.conf.native_fullscreen) {
      const testVideo = document.createElement('video');
      if (typeof (testVideo as any).webkitEnterFullScreen === 'function') {
        const oldFullscreen = player.fullscreen;
        player.fullscreen = function () {
          const video = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
          if (!video) return oldFullscreen?.apply(player);
          player.trigger('fullscreen', [player]);
          domOn(document, 'webkitfullscreenchange.nativefullscreen', () => {
            if ((document as any).webkitFullscreenElement !== video) return;
            domOff(document, '.nativefullscreen');
            domOn(document, 'webkitfullscreenchange.nativefullscreen', () => {
              if ((document as any).webkitFullscreenElement) return;
              domOff(document, '.nativefullscreen');
              player.trigger('fullscreen-exit', [player]);
            });
          });
          // iOS12-COMPAT: webkitEnterFullScreen — remove when iOS >= 15 is the floor
          (video as any).webkitEnterFullScreen();
          domOne(video, 'webkitendfullscreen', () => {
            domOff(document, 'fullscreenchange.nativefullscreen');
            player.trigger('fullscreen-exit', [player]);
            video.controls = true;
            video.controls = false;
          });
          return player;
        };
      }
    }

    // Android browser gives video.duration == 1 until second 'timeupdate' event
    if (isAndroid) {
      player.bind('ready', () => {
        const video = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
        if (!video) return;
        if (player.conf.splash && video.paused && player.engine?.engineName !== 'hlsjs-lite') {
          video.addEventListener('canplay', () => { video.play(); }, { once: true });
          video.load();
        }
        player.bind('progress.dur', () => {
          if (player.live || player.conf.live) return;
          const duration = video.duration;
          if (duration !== 1) {
            player.video.duration = duration;
            const durationEl = common.find('.fp-duration', root)[0] as HTMLElement;
            if (durationEl) durationEl.innerHTML = format(player.get_video_duration());
            player.unbind('progress.dur');
          }
        });
      });
    }

    player.on('resume', () => { player.hover?.(false); });
  });
}
