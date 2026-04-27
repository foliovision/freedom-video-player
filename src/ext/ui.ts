/**
 * UI extension — main player UI layout and interaction
 *
 * Modernized:
 * - Replaced bean with native addEventListener
 * - Uses <button> instead of <a> for controls
 * - Replaced 7x <em> volume bar with bar-slider (still using <em> pattern for compat; can be further changed to range input)
 * - Only injects active skin SVG pair (play + pause) based on root classes
 * - Removed Flash-related checks
 * - Removed requestAnimationFrame polyfill usage (native is sufficient)
 * - Removed inlineBlock support check
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff, domOne, domFire } from './events';
import slider from './ui/slider';
import barSlider from './ui/bar-slider';
import type { PlayerApi, SliderApi, VolumeSliderApi, SupportFlags } from '../types';

// SVG imports — all variants loaded as strings, only the active pair is injected
import PLAY_ROUNDED_OUTLINE from './ui/svg/play-rounded-outline.svg';
import PLAY_ROUNDED_FILL from './ui/svg/play-rounded-fill.svg';
import PLAY_SHARP_FILL from './ui/svg/play-sharp-fill.svg';
import PLAY_SHARP_OUTLINE from './ui/svg/play-sharp-outline.svg';
import PAUSE_ROUNDED_OUTLINE from './ui/svg/pause-rounded-outline.svg';
import PAUSE_ROUNDED_FILL from './ui/svg/pause-rounded-fill.svg';
import PAUSE_SHARP_FILL from './ui/svg/pause-sharp-fill.svg';
import PAUSE_SHARP_OUTLINE from './ui/svg/pause-sharp-outline.svg';
import FILTERS_SVG from './ui/svg/filters.svg';

function zeropad(val: number): string {
  val = Math.floor(val);
  return val >= 10 ? String(val) : '0' + val;
}

export function format(sec: number, remaining?: boolean): string {
  sec = Math.max(sec || 0, 0);
  sec = remaining ? Math.ceil(sec) : Math.floor(sec);
  const h = Math.floor(sec / 3600);
  let min = Math.floor(sec / 60);
  sec = sec - min * 60;
  if (h >= 1) {
    min -= h * 60;
    return h + ':' + zeropad(min) + ':' + zeropad(sec);
  }
  return zeropad(min) + ':' + zeropad(sec);
}

function selectSVG(root: HTMLElement): { play: string; pause: string } {
  const isEdgy = common.hasClass(root, 'fp-edgy') || common.hasClass(root, 'fp-outlined');
  const isOutlined = common.hasClass(root, 'fp-outlined');

  if (isEdgy && isOutlined) return { play: PLAY_SHARP_OUTLINE, pause: PAUSE_SHARP_OUTLINE };
  if (isEdgy) return { play: PLAY_SHARP_FILL, pause: PAUSE_SHARP_FILL };
  if (isOutlined) return { play: PLAY_ROUNDED_OUTLINE, pause: PAUSE_ROUNDED_OUTLINE };
  return { play: PLAY_ROUNDED_FILL, pause: PAUSE_ROUNDED_FILL };
}

freedomplayer(function (api: PlayerApi, root: HTMLElement) {
  if (!freedomplayer.added_svg_filters) {
    freedomplayer.added_svg_filters = true;
    try {
      const fc = common.createElement('div', {}, FILTERS_SVG);
      document.body.appendChild(fc);
      common.css(fc, { width: '0', height: '0', overflow: 'hidden', position: 'absolute', margin: '0', padding: '0' });
    } catch (e) { /* omit */ }
  }

  // Determine touch event for controls (Modulobox compat)
  let touchEventsCache: string | false = false;
  api.touch_events = function (): string {
    if (touchEventsCache) return touchEventsCache;
    touchEventsCache = 'click.player';
    let el: HTMLElement | null = root;
    for (let i = 0; i < 4; i++) {
      if (el && common.hasClass(el, 'mobx-item')) { touchEventsCache += ' touchend'; break; }
      el = el?.parentElement || null;
    }
    return touchEventsCache;
  };
  api.touch_events();

  const conf = api.conf;
  const support = freedomplayer.support;
  let hovertimer: ReturnType<typeof setInterval>;
  let fullscreenExitHintTimer: ReturnType<typeof setInterval> | false = false;

  common.find('.fp-ui', root).forEach(common.removeNode);
  common.addClass(root, 'freedomplayer');

  if (!common.find('.fp-ratio', root)[0]) {
    const ratio = common.createElement('div', { className: 'fp-ratio', style: 'display: none' });
    root.appendChild(ratio);
  }

  // iOS placeholder video for unmute-all-at-once
  let placeholderVideo: HTMLVideoElement | false = false;
  if (support.iOS && !common.findDirect('video', root)[0] && !common.find('.fp-player > video', root)[0]) {
    placeholderVideo = document.createElement('video');
    placeholderVideo.muted = true;
    placeholderVideo.className = 'fp-placeholder-video';
    placeholderVideo.style.display = 'none';
    root.appendChild(placeholderVideo);
  }

  const iconFilter = 'url(' + window.location.href.replace(window.location.hash, '').replace(/\#$/g, '') + '#';
  const svgPair = selectSVG(root);

  const uiHTML = `
    <div class="fp-waiting">
      <div class="fp-preload"><b></b><b></b><b></b><b></b></div>
    </div>
    <div class="fp-header"></div>
    <p class="fp-speed-flash"></p>
    <div class="fp-play fp-visible">
      <button class="fp-icon fp-playbtn" type="button" aria-label="Play"></button>
      ${svgPair.play}
    </div>
    <div class="fp-pause">
      <button class="fp-icon fp-playbtn" type="button" aria-label="Pause"></button>
      ${svgPair.pause}
    </div>
    <div class="fp-controls">
      <button class="fp-icon fp-playbtn" type="button" aria-label="Play/Pause"></button>
      <span class="fp-elapsed">00:00</span>
      <div class="fp-timeline fp-bar">
        <span class="fp-timestamp"></span>
        <div class="fp-progress fp-color"></div>
      </div>
      <span class="fp-duration"></span>
      <span class="fp-remaining"></span>
      <div class="fp-volume">
        <button class="fp-icon fp-volumebtn" type="button" aria-label="Mute"></button>
        <div class="fp-volumebar fp-bar-slider">
          <em></em><em></em><em></em><em></em><em></em><em></em><em></em>
        </div>
      </div>
      <button class="fp-fullscreen fp-icon" type="button" aria-label="Fullscreen">
        <svg class="fp-fullscreen-enter" xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 40 30" fill="none"><path d="M1 9V1h12" /><path d="M1 9V1h12" transform="matrix(1 0 0 -1 0 26)" /><path d="M1 9V1h12" transform="matrix(-1 0 0 1 36 0)" /><path d="M1 9V1h12" transform="rotate(180 18 13)" /></svg>
        <svg class="fp-fullscreen-exit" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -2 40 30"><path d="M1 9V1h12" transform="translate(22 17)" fill="none" /><path d="M1 9V1h12" transform="matrix(-1 0 0 1 13 17)" fill="none" /><path d="M1 9V1h12" transform="rotate(180 6.5 4.5)" fill="none" /><path d="M1 9V1h12" transform="matrix(1 0 0 -1 22 9)" fill="none" /></svg>
      </button>
      <button class="fp-unload fp-icon" type="button" aria-label="Close"></button>
      <strong class="fp-speed fp-hidden"></strong>
    </div>`.replace(/url\(#/g, iconFilter);

  const ui = common.createElement('div', { className: 'fp-ui', style: 'display: none' }, uiHTML);
  root.appendChild(ui);

  function find(klass: string): HTMLElement {
    return common.find('.fp-' + klass, root)[0] as HTMLElement;
  }

  const waiting = find('waiting');
  const elapsed = find('elapsed');
  const ratio = find('ratio');
  const speedFlash = find('speed-flash');
  const durationEl = find('duration');
  const remaining = find('remaining');
  const timelineTooltip = find('timestamp');
  let origRatio: string;
  const play = find('play');
  const pause = find('pause');
  const timeline = find('timeline');
  const timelineApi = slider(timeline, api, root);
  const fullscreen = find('fullscreen');
  const volumeSlider = find('volumebar');
  const volumeApi = barSlider(volumeSlider, { rtl: api.rtl });
  const noToggle = common.hasClass(root, 'no-toggle');
  const noControls = common.hasClass(root, 'no-controlbar');
  let timelineTooltipHover = false;
  const touchEvents = api.touch_events();

  timelineApi.disableAnimation(common.hasClass(root, 'is-touch'));

  function delayedCalls(): void {
    origRatio = common.css(ratio, 'padding-top') as string;
    ratio.style.display = '';
    ui.style.display = '';
    if (placeholderVideo) placeholderVideo.style.display = '';
    if (conf.ratio) setRatio(conf.ratio);
    const bc = common.css(root, 'background-color') as string;
    const hasBg = (common.css(root, 'background-image') as string) !== 'none' || (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent');
    if (typeof conf.splash === 'string') common.css(root, 'background-image', "url('" + conf.splash + "')");
    if (!hasBg && api.forcedSplash) common.css(root, 'background-color', '#555');
  }
  requestAnimationFrame(delayedCalls);

  api.sliders = api.sliders || {};
  api.sliders.timeline = timelineApi;
  api.sliders.volume = volumeApi;

  let speedAnimationTimers: ReturnType<typeof setTimeout>[] = [];

  function setRatio(val: number, adaptive?: boolean): void {
    common.css(ratio, 'padding-top', val * 100 + '%');
  }

  let lastMove: Date;

  function hover(isOver: boolean): void {
    hoverWorker(isOver && !!api.was_played);
    if (isOver) {
      lastMove = new Date();
      const reg = (e: Event): void => {
        const ev = e as MouseEvent;
        if (!support.touch && typeof ev.clientY === 'number') {
          const rect = ui.getBoundingClientRect();
          const y = ev.clientY - rect.top - document.documentElement.scrollTop;
          common.toggleClass(root, 'is-mouseover-top', y < 0.33 * ui.clientHeight);
          if (common.hasClass(root, 'is-fullscreen') && y < 0.05 * ui.clientHeight && ev.clientX > ui.clientWidth * 0.95) {
            if (!fullscreenExitHintTimer) {
              fullscreenExitHintTimer = setTimeout(() => {
                common.addClass(root, 'is-fullscreen-exit-hint');
                setTimeout(() => {
                  common.removeClass(root, 'is-fullscreen-exit-hint');
                  clearInterval(fullscreenExitHintTimer as ReturnType<typeof setInterval>);
                }, 2000);
                clearInterval(fullscreenExitHintTimer as ReturnType<typeof setInterval>);
                fullscreenExitHintTimer = setInterval(() => { common.toggleClass(fullscreen, 'bold'); }, 300);
              }, 1000);
            }
          } else {
            common.toggleClass(root, 'is-mouseover-bottom', y > 0.8 * ui.clientHeight || timelineTooltipHover);
            if (fullscreenExitHintTimer) { clearInterval(fullscreenExitHintTimer); fullscreenExitHintTimer = false; }
            common.toggleClass(fullscreen, 'bold', false);
            common.removeClass(root, 'is-fullscreen-exit-hint');
          }
        }
        if (typeof (api.video as any).click !== 'undefined') return;
        hoverWorker(!!api.was_played);
        lastMove = new Date();
      };
      api.on('pause.x volume.x', reg);
      domOn(root, 'mousemove.x touchmove.x', reg);
      domOn(timelineTooltip, 'mousemove', () => { timelineTooltipHover = true; });
      domOn(timelineTooltip, 'mouseleave', () => { timelineTooltipHover = false; });
      clearInterval(hovertimer);
      hovertimer = setInterval(() => {
        if (+new Date() - +lastMove > (conf.mouseoutTimeout || 2000)) {
          if (!support.touch || api.playing) {
            if (!support.touch) {
              if (common.hasClass(root, 'is-mouseover-bottom') || common.hasClass(root, 'is-mouseover-top')) return;
            }
            hoverWorker(false);
          }
          lastMove = new Date();
        }
      }, 250);
    } else {
      domOff(root, 'mousemove.x touchmove.x');
      api.off('pause.x volume.x');
      clearInterval(hovertimer);
    }
  }

  api.hover = hover;

  function hoverWorker(flag: boolean): void {
    if (flag) {
      common.addClass(root, 'is-mouseover');
      common.removeClass(root, 'is-mouseout');
    } else {
      common.addClass(root, 'is-mouseout');
      common.removeClass(root, 'is-mouseover');
      common.removeClass(root, 'is-mouseover-top');
      common.removeClass(root, 'is-mouseover-bottom');
    }
  }

  try {
    if (!conf.fullscreen && fullscreen) fullscreen.style.display = 'none';
  } catch (e) { common.removeNode(fullscreen); }

  api.on('dvrwindow', () => { timelineApi.disable(false); });

  api.on('ready', (_ev: unknown, _api: PlayerApi, video: { height?: number; width?: number }) => {
    timelineApi.calc();
    const duration = api.get_video_duration();
    timelineApi.disable(api.disabled || !duration);
    if (conf.adaptiveRatio && video.height && video.width && !isNaN(video.height / video.width)) setRatio(video.height / video.width, true);
    common.toggleClass(root, 'is-long', duration >= 3600);
    volumeApi.slide(api.volumeLevel);
    common.find('.fp-title', ui).forEach(common.removeNode);
    if ((api.video as any).title) {
      common.prepend(ui, common.createElement('div', { className: 'fp-message fp-title' }, (api.video as any).title));
    }
    common.toggleClass(root, 'has-title', !!(api.video as any).title);
    common.html([durationEl, remaining], api.live ? 'Live' : format(duration));
  }).on('unload', () => {
    if (!origRatio && !conf.splash) common.css(ratio, 'paddingTop', '');
    if (api.ready) timelineApi.slide(0);
    common.addClass(play, 'fp-visible');
  }).on('buffer', (_ev: unknown, _api: PlayerApi, buffered: Array<{ start: number; end: number }> | number) => {
    const video = api.video;
    const max = (video.buffer || 0) / api.get_video_duration();
    if (!(video as any).seekable && support.seekable) timelineApi.max(api.conf.live ? Infinity : max);
    if ((video as any).seekable && support.seekable && timelineApi.getMax()) timelineApi.max(1);
    if (!buffered || typeof buffered === 'number') {
      buffered = [{ start: 0, end: video.buffer || 0 }];
    }
    const buffers = common.find('.fp-buffer', timeline);
    if (buffers.length !== (buffered as Array<{ start: number; end: number }>).length) {
      buffers.forEach(common.removeNode);
    }
    (buffered as Array<{ start: number; end: number }>).forEach((b, i) => {
      b.start -= api.get_video_start();
      if (b.start < 0) b.start = 0;
      b.end -= api.get_video_start();
      if (b.end < 0) b.end = 0;
      const existingBuffers = common.find('.fp-buffer', timeline);
      const buffer = existingBuffers[i] || common.createElement('div', { className: 'fp-buffer' });
      const dur = api.get_video_duration();
      if (b.end > dur) b.end = dur;
      if (api.rtl) {
        common.css(buffer as HTMLElement, { right: (100 * b.start / dur) + '%', width: (100 * (b.end - b.start) / dur) + '%' });
      } else {
        common.css(buffer as HTMLElement, { left: (100 * b.start / dur) + '%', width: (100 * (b.end - b.start) / dur) + '%' });
      }
      common.prepend(timeline, buffer);
    });
  }).on('speed', (_e: unknown, _api: PlayerApi, val: number) => {
    if (api.video.time) {
      common.text(speedFlash, val + 'x');
      common.addClass(speedFlash, 'fp-shown');
      speedAnimationTimers = speedAnimationTimers.filter(to => { clearTimeout(to); return false; });
      speedAnimationTimers.push(setTimeout(() => {
        common.addClass(speedFlash, 'fp-hilite');
        speedAnimationTimers.push(setTimeout(() => {
          common.removeClass(speedFlash, 'fp-hilite');
          speedAnimationTimers.push(setTimeout(() => { common.removeClass(speedFlash, 'fp-shown'); }, 300));
        }, 1000));
      }));
    }
  }).on('buffered', () => {
    timelineApi.max(1);
  }).on('progress seek', (_e: { type: string }, _api: PlayerApi, time: number) => {
    const duration = api.get_video_duration();
    const offset = api.video.seekOffset || 0;
    if (typeof time === 'undefined') time = api.video.time || 0;
    if (api.get_custom_time) time = api.get_custom_time(time);
    const percentage = (time - offset) / (duration - offset);
    if (!timelineApi.dragging) {
      if (_e.type !== 'progress' || !_api.seeking) {
        timelineApi.slide(percentage, api.seeking ? 0 : 250);
      }
    }
    common.toggleClass(root, 'is-live-position', duration - time < (conf.livePositionOffset || 120));
    common.html(elapsed, format(time));
    common.html(remaining, format(duration - time, true));
  }).on('finish resume seek', (e: { type: string }) => {
    common.toggleClass(root, 'is-finished', e.type === 'finish');
  }).on('resume', () => {
    if (support.touch) {
      common.addClass(pause, 'fp-visible');
      common.removeClass(play, 'fp-visible');
      common.addClass(play, 'fp-visible-change');
      setTimeout(() => common.removeClass(play, 'fp-visible-change'), 300);
    } else {
      common.addClass(play, 'fp-visible');
      setTimeout(() => common.removeClass(play, 'fp-visible'), 300);
    }
  }).on('pause', () => {
    setTimeout(() => {
      if (api.finished || api.playing) return;
      if (support.touch) {
        common.addClass(play, 'fp-visible');
        common.removeClass(pause, 'fp-visible');
        common.addClass(pause, 'fp-visible-change');
        setTimeout(() => common.removeClass(pause, 'fp-visible-change'), 300);
      } else {
        common.addClass(pause, 'fp-visible');
        setTimeout(() => common.removeClass(pause, 'fp-visible'), 300);
      }
    }, 0);
  }).on('stop', () => {
    common.html(elapsed, format(0));
    timelineApi.slide(0, 100);
  }).on('finish', () => {
    common.html(elapsed, format(api.get_video_duration()));
    timelineApi.slide(1, 100);
    common.removeClass(root, 'is-seeking');
  }).on('beforeseek', () => {
    // placeholder for future use
  }).on('volume', () => {
    volumeApi.slide(api.volumeLevel);
  }).on('disable', () => {
    const flag = api.disabled;
    timelineApi.disable(flag);
    volumeApi.disable(flag);
    common.toggleClass(root, 'is-disabled', api.disabled);
  }).on('mute', (_e: unknown, _api: PlayerApi, flag: boolean) => {
    common.toggleClass(root, 'is-muted', flag);
  }).on('error', (_e: unknown, _api: PlayerApi, error: { code?: number; custom_message?: string; message?: string }) => {
    common.removeClass(root, 'is-loading');
    common.removeClass(root, 'is-seeking');
    common.addClass(root, 'is-error');
    if (error) {
      api.error = true;
      let code = error.code;
      if ((error.message || '').match(/DECODER_ERROR_NOT_SUPPORTED/)) code = 3;
      const message = error.custom_message || (api.engine?.engineName || 'html5') + ': ' + (conf.errors as string[])[code || 0];
      const dismiss = api.message(message);
      common.removeClass(root, 'is-mouseover');
      api.one('load progress', (e: { type: string }) => {
        if (e.type === 'progress' && !api.error) dismiss();
      });
    }
  }).one('resume ready', () => {
    const videoTag = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
    if (!videoTag) return;
    if (!common.width(videoTag) || !common.height(videoTag)) {
      const oldOverflow = root.style.overflow;
      root.style.overflow = 'visible';
      setTimeout(() => {
        if (oldOverflow) root.style.overflow = oldOverflow;
        else root.style.removeProperty('overflow');
      });
    }
  });

  // Interaction events
  domOn(root, 'mouseenter mouseleave', (e: Event) => {
    if (noToggle || noControls) return;
    hover(e.type === 'mouseover');
  });

  domOn(root, 'mouseleave', () => {
    if (timelineApi.dragging || volumeApi.dragging) {
      common.addClass(root, 'is-mouseover');
      common.removeClass(root, 'is-mouseout');
    }
  });

  domOn(root, touchEvents, (e: Event) => {
    if (api.disabled) return;
    const target = e.target as HTMLElement;
    if (
      common.hasParent(target, '.fp-play,.fp-pause') ||
      ((!api.was_played || !support.touch || common.hasClass(root, 'no-controlbar')) &&
       (common.hasClass(target, 'fp-ui') || common.hasClass(target, 'fp-engine'))) ||
      typeof (api.video as any).click !== 'undefined' ||
      common.hasClass(target, 'wpfp_custom_background')
    ) {
      if (e.preventDefault) e.preventDefault();
      if (api.playing) api.manual_pause = true;
      else if (api.paused) api.manual_resume = true;
      api.toggle();
    }
  });

  domOn(root, 'mousemove touchmove', (e: Event) => {
    const target = (e.target as HTMLElement)?.closest('.fp-timeline');
    if (!target) return;
    const ev = e as MouseEvent | TouchEvent;
    let x = 'pageX' in ev ? ev.pageX : 0;
    if (!x && 'touches' in ev && ev.touches.length) x = ev.touches[0].pageX;
    const delta = x - common.offset(timeline).left;
    const percentage = delta / common.width(timeline);
    const duration = api.get_video_duration() - (api.video.seekOffset === undefined ? 0 : api.video.seekOffset);
    const seconds = (api.rtl ? 1 - percentage : percentage) * duration;
    if (percentage < 0) return;

    let currentChapter = '';
    const index = api.get_video_index();
    if ((api as any).fv_timeline_chapters_data?.[index]) {
      (api as any).fv_timeline_chapters_data[index].forEach((chapter: { startTime: number; endTime: number; line: string }) => {
        const startTime = chapter.startTime - api.get_video_start();
        const endTime = chapter.endTime - api.get_video_start();
        if (seconds >= startTime && seconds <= endTime) currentChapter = chapter.line;
      });
    }

    let tooltipText = format(seconds);
    if (currentChapter) tooltipText = tooltipText + ' ' + currentChapter;
    common.html(timelineTooltip, tooltipText);

    let left: number | false = delta;
    if (timelineTooltip.offsetWidth) left -= timelineTooltip.offsetWidth / 2;
    if (left < 0) left = 0;
    if (left > common.width(timeline) - (timelineTooltip.offsetWidth || 0)) left = false;
    if (left !== false) common.css(timelineTooltip, { left: left + 'px', right: 'auto' });
    else common.css(timelineTooltip, { left: 'auto', right: '0px' });
  });

  domOn(root, 'contextmenu', (ev: Event) => {
    const menu = common.find('.fp-context-menu', root)[0] as HTMLElement | undefined;
    if (!menu) return;
    ev.preventDefault();
    const me = ev as MouseEvent;
    api.showMenu!(menu, { left: me.clientX - window.scrollX, top: me.clientY - window.scrollY });
    domOn(root, touchEvents, (ev2: Event) => {
      if ((ev2.target as HTMLElement)?.closest('.fp-context-menu')) ev2.stopPropagation();
    });
  });

  if (conf.poster) common.css(root, 'background-image', 'url(' + conf.poster + ')');

  if (!conf.splash) {
    if (!conf.poster) conf.poster = true;
    const initPoster = (): void => {
      common.addClass(root, 'is-poster');
      common.addClass(play, 'fp-visible');
      api.poster = true;
      api.on('resume.poster progress.poster beforeseek.poster', (ev: { type: string }) => {
        if (ev.type === 'beforeseek' || api.playing) {
          common.removeClass(root, 'is-poster');
          common.removeClass(play, 'fp-visible');
          api.poster = false;
          api.off('.poster');
        }
      });
    };
    api.on('stop', initPoster);
    api.on('ready', (_ev: unknown, _api: PlayerApi, video: { index?: number; autoplay?: boolean }) => {
      if (video.index || video.autoplay) return;
      initPoster();
    });
  }

  domOn(root, touchEvents, (ev: Event) => {
    const target = (ev.target as HTMLElement)?.closest('.fp-toggle, .fp-play, .fp-playbtn');
    if (!target || api.disabled) return;
    if (api.playing) api.manual_pause = true;
    else if (api.paused) api.manual_resume = true;
    api.toggle();
  });

  domOn(root, touchEvents, (ev: Event) => {
    const target = ev.target as HTMLElement;
    if (target?.closest('.fp-volumebtn')) {
      api.mute();
      if (!api.muted) document.querySelectorAll('video.fp-placeholder-video').forEach((v: Element) => { (v as HTMLVideoElement).muted = false; });
    }
    if (target?.closest('.fp-fullscreen')) api.fullscreen?.();
    if (target?.closest('.fp-unload')) api.unload();
  });

  domOn(timeline, 'slide', (_val: unknown) => {
    const val = typeof _val === 'number' ? _val : ((_val as CustomEvent)?.detail?.args?.[0] ?? 0);
    const duration = api.get_video_duration();
    const seekToSeconds = duration ? api.get_video_start() + val * duration : 0;
    api.seeking = true;
    api.manual_seeking = true;
    if (api.custom_seek) api.custom_seek(seekToSeconds);
    else api.seek(seekToSeconds);
  });

  domOn(volumeSlider, 'slide', (_val: unknown) => {
    const val = typeof _val === 'number' ? _val : ((_val as CustomEvent)?.detail?.args?.[0] ?? 0);
    api.volume(val);
  });

  domOn(root, touchEvents, (ev: Event) => {
    if ((ev.target as HTMLElement)?.closest('.fp-duration,.fp-remaining')) {
      if (api.dvr) { api.seekTo(10); return; }
      common.toggleClass(root, 'is-inverted');
    }
  });

  hoverWorker(noToggle);

  api.on('shutdown', () => {
    domOff(timeline, 'slide');
    domOff(volumeSlider, 'slide');
    common.removeNode(ui);
    common.find('.fp-ratio', root).forEach(common.removeNode);
  });

  function checkSize(): void {
    requestAnimationFrame(playerSizeClasses);
  }

  function playerSizeClasses(): void {
    const playerEl = common.find('.fp-player', root)[0] || root;
    const width = (playerEl as HTMLElement).clientWidth;
    common.toggleClass(root, 'is-tiny', width < 400 && width > 0);
    common.toggleClass(root, 'is-small', width >= 400 && width < 600);
  }

  checkSize();

  function debounce(func: () => void, wait: number): () => void {
    let timeout: ReturnType<typeof setTimeout>;
    return () => { clearTimeout(timeout); timeout = setTimeout(func, wait); };
  }

  window.addEventListener('resize', debounce(checkSize, 250));
});
