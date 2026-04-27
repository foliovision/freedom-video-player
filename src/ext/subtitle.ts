/**
 * Subtitle extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import parser from './subtitles/parser';
import type { PlayerApi, SubtitleTrack, SubtitleEntry, Cuepoint } from '../types';

freedomplayer.defaults.subtitleParser = parser;

freedomplayer(function (p: PlayerApi, root: HTMLElement) {
  let currentPoint: number | null = null;
  let wrap: HTMLElement | undefined;
  let subtitleControl: HTMLElement | undefined;
  let subtitleMenu: HTMLElement | undefined;
  let changeHandler: ((idx: string) => void) | undefined;
  let check = false;

  function timeCheck(_e: unknown, api: PlayerApi, time: number): void {
    if (!check) return;
    (api.cuepoints || []).forEach((cue: any, index: number) => {
      const entry = cue.subtitle as SubtitleEntry | undefined;
      if (entry && currentPoint !== index) {
        if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) {
          api.trigger('cuepoint', [api, cue]);
        }
      }
    });
  }

  if (
    !freedomplayer.support.inlineVideo ||
    (!freedomplayer.support.fullscreen && p.conf.native_fullscreen)
  ) {
    p.conf.nativesubtitles = true;
  }

  if (!p.ui) p.ui = {} as any;

  (p.ui as any).createSubtitleControl = function (subtitles: SubtitleTrack[], onChange?: (idx: string) => void): HTMLElement {
    changeHandler = onChange;
    subtitleControl = subtitleControl || common.createElement('strong', { className: 'fp-cc' }, 'CC');
    subtitleMenu = subtitleMenu || common.createElement('div', { className: 'fp-menu fp-subtitle-menu' }, '<strong>Closed Captions</strong>');
    common.find('button', subtitleMenu!).forEach(common.removeNode);
    common.find('a', subtitleMenu!).forEach(common.removeNode);

    const noSubBtn = document.createElement('button');
    noSubBtn.setAttribute('data-subtitle-index', '-1');
    noSubBtn.textContent = 'No subtitles';
    subtitleMenu!.appendChild(noSubBtn);

    (subtitles || []).forEach((st, i) => {
      const srcLang = st.srclang || 'en';
      const label = st.label || 'Default (' + srcLang + ')';
      const btn = document.createElement('button');
      btn.setAttribute('data-subtitle-index', String(i));
      btn.textContent = label;
      subtitleMenu!.appendChild(btn);
    });

    (common.find('.fp-ui', root)[0] as HTMLElement).appendChild(subtitleMenu!);
    (common.find('.fp-controls', root)[0] as HTMLElement).appendChild(subtitleControl!);
    common.toggleClass(subtitleControl!, 'fp-hidden', !subtitles || !subtitles.length);
    return subtitleControl!;
  };

  (p.ui as any).setActiveSubtitleItem = function (idx: number): void {
    setActiveSubtitleClass(idx);
  };

  domOn(root, p.touch_events(), (ev: Event) => {
    const target = ev.target as HTMLElement;
    if (!target) return;

    if (target.matches('.fp-cc') || target.closest('.fp-cc')) {
      if (subtitleMenu && common.hasClass(subtitleMenu, 'fp-active')) p.hideMenu!(subtitleMenu);
      else if (subtitleMenu) p.showMenu!(subtitleMenu);
      return;
    }

    const subItem = target.closest('.fp-subtitle-menu [data-subtitle-index]') as HTMLElement | null;
    if (subItem) {
      ev.preventDefault();
      const idx = subItem.getAttribute('data-subtitle-index')!;
      if (changeHandler) { changeHandler(idx); return; }
      if (idx === '-1') { p.disableSubtitles!(); return; }
      p.loadSubtitles!(Number(idx));
    }
  });

  const createUIElements = (): void => {
    wrap = common.find('.fp-captions', root)[0] as HTMLElement;
    if (!wrap) {
      wrap = common.createElement('div', { 'class': 'fp-captions' });
      const fpPlayer = common.find('.fp-player', root)[0] as HTMLElement;
      if (fpPlayer) fpPlayer.appendChild(wrap);
    }
    Array.from(wrap.children).forEach(child => common.removeNode(child as HTMLElement));
    (p.ui as any).createSubtitleControl(p.video.subtitles);
  };

  p.on('ready', (_ev: unknown, player: PlayerApi, video: { subtitles?: SubtitleTrack[] }) => {
    player.subtitles = [];
    createUIElements();
    common.removeClass(root, 'has-menu');
    p.disableSubtitles!();
    if (!video.subtitles || !video.subtitles.length) return;
    const defaultSubtitle = video.subtitles.filter(one => one['default'])[0];
    if (defaultSubtitle) player.loadSubtitles!(video.subtitles.indexOf(defaultSubtitle));
  });

  p.showSubtitle = function (text: string): void {
    if (wrap) {
      common.html(wrap, text);
      common.addClass(wrap, 'fp-shown');
    }
  };

  p.hideSubtitle = function (): void {
    if (wrap) common.removeClass(wrap, 'fp-shown');
  };

  p.bind('cuepoint', (_e: unknown, _api: PlayerApi, cue: any) => {
    check = false;
    if (cue.subtitle) {
      currentPoint = cue.index;
      p.showSubtitle!(cue.subtitle.text);
    } else if (cue.subtitleEnd) {
      p.hideSubtitle!();
      currentPoint = cue.index;
    }
  });

  p.bind('seek', (_e: unknown, _api: PlayerApi, time: number) => {
    if (currentPoint !== null && p.cuepoints[currentPoint] && (p.cuepoints[currentPoint] as any).time > time) {
      if (wrap) common.removeClass(wrap, 'fp-shown');
      currentPoint = null;
    }
    (p.cuepoints || []).forEach((cue: any, index: number) => {
      const entry = cue.subtitle as SubtitleEntry | undefined;
      if (entry && currentPoint !== index) {
        if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) p.trigger('cuepoint', [p, cue]);
      } else if (cue.subtitleEnd && time >= cue.time && index === (currentPoint || 0) + 1) {
        p.trigger('cuepoint', [p, cue]);
      }
    });
  });

  p.on('unload', () => {
    common.find('.fp-captions', root).forEach(common.removeNode);
  });

  function setActiveSubtitleClass(idx: number): void {
    if (!subtitleMenu) return;
    const prev = common.find('button.fp-selected', subtitleMenu)[0];
    if (prev) common.toggleClass(prev, 'fp-selected');
    const next = common.find('button[data-subtitle-index="' + idx + '"]', subtitleMenu)[0];
    if (next) common.toggleClass(next, 'fp-selected');
    common.toggleClass(root, 'has-subtitles', !!(p.video.subtitles && p.video.subtitles.length));
  }

  const setNativeMode = (i: number | null, mode: TextTrackMode): void => {
    const video = common.find('video.fp-engine', root)[0] as HTMLVideoElement;
    if (!video) return;
    const tracks = video.textTracks;
    if (!tracks.length) return;
    if (i === null) {
      Array.from(tracks).forEach(track => { track.mode = mode; });
    } else {
      tracks[i].mode = mode;
    }
  };

  p.disableSubtitles = function (): PlayerApi {
    p.subtitles = [];
    (p.cuepoints || []).forEach((c: any) => {
      if (c.subtitle || c.subtitleEnd) p.removeCuepoint?.(c);
    });
    if (wrap) Array.from(wrap.children).forEach(child => common.removeNode(child as HTMLElement));
    setActiveSubtitleClass(-1);
    if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine?.engineName === 'html5') {
      setNativeMode(null, 'disabled');
    }
    return p;
  };

  p.loadSubtitles = function (i: number): PlayerApi {
    p.disableSubtitles!();
    const st = p.video.subtitles?.[i];
    if (!st?.src) return p;
    setActiveSubtitleClass(i);

    if (st.rtl) common.addClass(root, 'is-captions-rtl');
    else common.removeClass(root, 'is-captions-rtl');

    if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine?.engineName === 'html5') {
      setNativeMode(i, 'showing');
    }

    common.xhrGet(st.src, (txt: string) => {
      const parserFn = (p.conf.subtitleParser || parser) as (txt: string) => SubtitleEntry[];
      const entries = parserFn(txt);
      entries.forEach((entry: SubtitleEntry, idx: number) => {
        if (!entry.title) entry.title = 'subtitle' + idx;
        const cue = { time: entry.startTime, subtitle: entry, visible: false, index: 0 } as Cuepoint;
        p.subtitles.push(entry);
        p.addCuepoint?.(cue);
        p.addCuepoint?.({ time: entry.endTime, subtitleEnd: entry.title, visible: false, index: 0 } as Cuepoint);

        if (entry.startTime === 0 && !p.video.time && !p.splash) {
          p.trigger('cuepoint', [p, Object.assign({}, cue, { index: 0 })]);
        }
        if (p.splash) p.one('ready', () => { p.trigger('cuepoint', [p, cue]); });
      });
    }, () => {
      p.trigger('error-subtitles', [p, { code: 8, url: st.src }]);
      return false;
    });
    return p;
  };

  domOn(root, p.touch_events(), (ev: Event) => {
    const subItem = (ev.target as HTMLElement)?.closest('.fp-subtitle-menu button[data-subtitle-index]') as HTMLElement | null;
    if (subItem && Number(subItem.dataset.subtitleIndex) > -1) {
      check = true;
      p.on('progress', timeCheck);
    }
  });
});
