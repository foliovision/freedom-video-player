/**
 * Freedom Player core module
 *
 * Modernized:
 * - Replaced extend-object with Object.assign
 * - Replaced is-function with typeof check
 * - Replaced bean with native event handling
 * - Removed Flash references
 * - TypeScript types throughout
 */
import * as common from './common';
import slider from './ext/ui/slider';
import barSlider from './ext/ui/bar-slider';
import setupEvents from './ext/events';
import URLResolver from './ext/resolve';
import type { PlayerApi, PlayerConf, VideoObject, EngineApi, ExtensionFn, SupportFlags } from './types';

const instances: PlayerApi[] = [];
const extensions: ExtensionFn[] = [];

const oldHandler = window.onbeforeunload;
window.onbeforeunload = function (ev: BeforeUnloadEvent) {
  instances.forEach(api => {
    if (api.conf.splash) {
      api.unload();
    } else {
      api.bind('error', () => {
        common.find('.freedomplayer.is-error .fp-message').forEach(common.removeNode);
      });
    }
  });
  if (oldHandler) return (oldHandler as (ev: BeforeUnloadEvent) => string | void)(ev);
};

const isSafari = /Safari/.exec(navigator.userAgent) && !/Chrome/.exec(navigator.userAgent);
const m = /(\d+\.\d+) Safari/.exec(navigator.userAgent);
const safariVersion = m ? Number(m[1]) : 100;

interface Freedomplayer {
  (fn: ExtensionFn): void;
  (fn: number | undefined): PlayerApi | undefined;
  (fn: HTMLElement, opts?: Partial<PlayerConf>, callback?: () => void): PlayerApi | undefined;
  (fn: { jquery?: boolean; [key: number]: HTMLElement }, opts?: Partial<PlayerConf>, callback?: () => void): PlayerApi | undefined;
  (fn: string, opts?: Partial<PlayerConf>, callback?: () => void): PlayerApi | undefined;

  version: string;
  engines: EngineFactory[];
  engine(name: string): EngineFactory | undefined;
  extensions: [string | string[], string | string[]][];
  conf: Partial<PlayerConf>;
  set(key: string | Partial<PlayerConf>, value?: unknown): void;
  registerExtension(js: string | string[], css: string | string[]): void;
  support: SupportFlags;
  defaults: PlayerConf;
  common: typeof common;
  slider: typeof slider;
  barSlider: typeof barSlider;
  extend: typeof Object.assign;
  is_rtl?: boolean;
  did_rtl_check?: boolean;
  added_svg_filters?: boolean;
  did_volume_check?: boolean;
  airplay_was_available?: boolean;
  [key: string]: unknown;
}

interface EngineFactory {
  (player: PlayerApi, root: HTMLElement): EngineApi;
  engineName: string;
  canPlay(type: string, conf?: Partial<PlayerConf>): boolean;
  extensions?: unknown[];
  plugin?(ext: unknown): void;
}

const freedomplayer: Freedomplayer = function (fn: unknown, opts?: unknown, callback?: () => void): unknown {
  if (typeof fn === 'function') {
    extensions.push(fn as ExtensionFn);
    return;
  }
  if (typeof fn === 'number' || typeof fn === 'undefined') {
    return instances[fn as number || 0];
  }
  if ((fn as HTMLElement).nodeType) {
    const el = fn as HTMLElement;
    if (el.getAttribute('data-freedomplayer-instance-id') !== null) {
      return instances[Number(el.getAttribute('data-freedomplayer-instance-id'))];
    }
    if (!opts) return;
    return initializePlayer(el, opts as Partial<PlayerConf>, callback);
  }
  if ((fn as { jquery?: boolean }).jquery) {
    return (freedomplayer as Function)((fn as { [key: number]: HTMLElement })[0], opts, callback);
  }
  if (typeof fn === 'string') {
    const el = common.find(fn as string)[0] as HTMLElement;
    return el && (freedomplayer as Function)(el, opts, callback);
  }
} as Freedomplayer;

Object.assign(freedomplayer, {
  version: '@VERSION',
  engines: [] as EngineFactory[],

  engine(name: string) {
    return freedomplayer.engines.filter(e => e.engineName === name)[0];
  },

  extensions: [] as [string | string[], string | string[]][],

  conf: {} as Partial<PlayerConf>,

  set(key: string | Partial<PlayerConf>, value?: unknown) {
    if (typeof key === 'string') (freedomplayer.conf as Record<string, unknown>)[key] = value;
    else Object.assign(freedomplayer.conf, key);
  },

  registerExtension(js: string | string[], css: string | string[]) {
    freedomplayer.extensions.push([js, css]);
  },

  support: {} as SupportFlags,

  defaults: {
    debug: false,
    disabled: false,
    fullscreen: window === window.top,
    keyboard: true,
    ratio: 9 / 16,
    adaptiveRatio: false,
    rtmp: 0,
    proxy: 'best',
    hlsQualities: true,
    seekStep: false,
    splash: false,
    live: false,
    livePositionOffset: 120,
    speeds: [0.25, 0.5, 1, 1.5, 2],
    tooltip: true,
    mouseoutTimeout: 2000,
    mutedAutoplay: true,
    clickToUnMute: false,
    volume: 1,
    errors: [
      '',
      'Video loading aborted',
      'Network error',
      'Video not properly encoded',
      'Video file not found',
      'Unsupported video',
      'Skin not found',
      'SWF file not found',
      'Subtitles not found',
      'Invalid RTMP URL',
      'Unsupported video format.'
    ],
    errorUrls: ['', '', '', '', '', '', '', '', '', '', ''],
    msg: { click_to_unmute: 'Click to unmute' },
    playlist: [],
    hlsFix: isSafari && safariVersion < 8,
    disableInline: false,
  } as PlayerConf,

  common,
  slider,
  barSlider,
  extend: Object.assign,
});

let playerCount = 0;

if (typeof (window as any).jQuery !== 'undefined') {
  const $ = (window as any).jQuery;

  $(function () {
    if (typeof $.fn.freedomplayer === 'function') {
      $('.freedomplayer:has(video:not(.fp-engine),script[type="application/json"])').freedomplayer();
    }
  });

  const videoTagConfig = function (videoTag: any) {
    if (!videoTag.length) return {};
    const clip = videoTag.data() || {};
    const conf: Record<string, unknown> = {};
    $.each(['autoplay', 'loop', 'preload', 'poster'], function (_i: number, key: string) {
      const val = videoTag.attr(key);
      if (val !== undefined && ['autoplay', 'poster'].indexOf(key) !== -1) conf[key] = val ? val : true;
      else if (val !== undefined) clip[key] = val ? val : true;
    });
    videoTag[0].autoplay = videoTag[0].preload = false;
    clip.subtitles = videoTag.find('track').map(function (this: HTMLTrackElement) {
      const tr = $(this);
      return {
        src: tr.attr('src'),
        kind: tr.attr('kind'),
        label: tr.attr('label'),
        srclang: tr.attr('srclang'),
        default: tr.prop('default'),
      };
    }).get();
    clip.sources = new URLResolver().sourcesFromVideoTag(videoTag, $);
    return Object.assign(conf, { clip });
  };

  $.fn.freedomplayer = function (opts?: unknown, callback?: () => void) {
    return this.each(function (this: HTMLElement) {
      if (typeof opts === 'string') opts = { swf: opts };
      if (typeof opts === 'function') { callback = opts as () => void; opts = {}; }
      const root = $(this);
      const scriptConf = root.find('script[type="application/json"]');
      const confObject = scriptConf.length ? JSON.parse(scriptConf.text()) : videoTagConfig(root.find('video'));
      const conf = $.extend({}, opts || {}, confObject, root.data());
      const api = initializePlayer(this, conf, callback);
      if (api) {
        const { EVENTS } = require('./ext/events');
        (EVENTS as string[]).forEach(evName => {
          api.on(evName + '.jquery', (ev: { type: string; detail?: { args?: unknown[] } }) => {
            root.trigger.call(root, ev.type, ev.detail && ev.detail.args);
          });
        });
        root.data('freedomplayer', api);
        root.data('flowplayer', api);
      }
    });
  };
}

function initializePlayer(element: HTMLElement, opts: Partial<PlayerConf>, callback?: () => void): PlayerApi {
  if (opts && opts.embed) opts.embed = Object.assign({}, freedomplayer.defaults.embed, opts.embed);

  let supportLocalStorage = false;
  try {
    if (typeof freedomplayer.conf.storage === 'undefined' && typeof window.localStorage === 'object') {
      window.localStorage.setItem('freedomplayerTestStorage', 'test');
      supportLocalStorage = true;
    }
  } catch (ignored) { /* Storage unavailable */ }

  const root = element;
  const conf = Object.assign({}, freedomplayer.defaults, freedomplayer.conf, opts) as PlayerConf;
  let storage: Storage | Record<string, string> = {};
  const originalClass = root.className;
  let engine: EngineApi;
  let seeking_indicator_interval: ReturnType<typeof setTimeout>;
  const urlResolver = new URLResolver();

  common.addClass(root, 'is-loading');

  try {
    storage = freedomplayer.conf.storage || (supportLocalStorage ? window.localStorage : storage);
  } catch (e) { /* Storage unavailable */ }

  const storedMuted = (storage as Record<string, string>).muted;
  const storedVolume = (storage as Record<string, string>).volume;
  conf.volume = storedMuted === 'true' ? 0
    : conf.volume !== freedomplayer.defaults.volume ? conf.volume
    : !isNaN(Number(storedVolume)) ? Number(storedVolume)
    : conf.volume;

  conf.debug = !!(storage as Record<string, string>).freedomplayerDebug || conf.debug;

  if (conf.aspectRatio && typeof conf.aspectRatio === 'string') {
    const parts = conf.aspectRatio.split(/[:\/]/);
    conf.ratio = Number(parts[1]) / Number(parts[0]);
  }

  let isRTL = freedomplayer.is_rtl;
  if (!freedomplayer.did_rtl_check) {
    freedomplayer.did_rtl_check = true;
    isRTL = window.getComputedStyle(root).getPropertyValue('direction') === 'rtl';
    freedomplayer.is_rtl = isRTL;
  }
  if (isRTL) common.addClass(root, 'is-rtl');

  const api = ({
    conf,
    currentSpeed: 1,
    volumeLevel: conf.muted ? 0 : typeof conf.volume === 'undefined' ? Number(storedVolume) : conf.volume,
    video: {} as VideoObject,
    disabled: false,
    finished: false,
    loading: false,
    muted: storedMuted === 'true' || !!conf.muted,
    paused: false,
    playing: false,
    ready: false,
    splash: false,
    rtl: !!isRTL,
    engine: null as unknown as EngineApi,
    subtitles: [],
    cuepoints: [],
    extensions: { js: [] as string[], css: [] as string[] },

    hijack(hijack: { pause: () => void; resume: () => void; seek: (t: number) => void }) {
      try { api.engine.suspendEngine?.(); } catch (e) { /* */ }
      api.hijacked = hijack;
    },

    release() {
      try { api.engine.resumeEngine?.(); } catch (e) { /* */ }
      api.hijacked = false;
    },

    debug(...args: unknown[]) {
      if (!conf.debug) return;
      console.log('DEBUG', ...args);
    },

    load(video?: VideoObject | string, cb?: () => void) {
      if (api.error || api.loading) return api;
      api.video = {} as VideoObject;
      api.finished = false;

      const clip = video || conf.clip;
      const resolved = Object.assign({}, urlResolver.resolve(clip as VideoObject | string, conf.clip?.sources));
      if (api.playing || api.engine) resolved.autoplay = true;

      const engineImpl = selectEngine(resolved as VideoObject);
      if (!engineImpl) {
        setTimeout(() => { api.trigger('error', [api, { code: 5 }]); });
        return api;
      }
      if (!engineImpl.engineName) throw new Error('engineName property of factory should be exposed');

      if (!api.engine || engineImpl.engineName !== api.engine.engineName) {
        api.ready = false;
        if (api.engine) {
          api.engine.unload();
          api.conf.autoplay = true;
        }
        engine = api.engine = engineImpl(api, root);
        api.one('ready', () => {
          setTimeout(() => {
            if (api.muted) api.mute(true, true);
          });
        });
      }

      engine.load(resolved as VideoObject);
      if (cb) api.one('ready', cb);
      return api;
    },

    pause(fn?: () => void) {
      if (!api.ready || api.seeking) return api;
      if (api.hijacked) {
        api.hijacked.pause();
      } else {
        engine.pause();
      }
      if (fn) api.one('pause', fn);
      return api;
    },

    resume() {
      if (!api.ready) return api;
      if (api.hijacked) {
        api.hijacked.resume();
      } else {
        engine.resume();
      }
      return api;
    },

    toggle() {
      if (api.ready) {
        if (api.paused || api.finished) api.resume();
        else api.pause();
      }
      return api;
    },

    seek(time: number | boolean, cb?: () => void) {
      if (!api.ready || api.live && !api.dvr) return api;
      if (typeof time === 'boolean') {
        time = time ? api.video.duration || 0 : 0;
      }
      time = Math.max(0, Math.min(time, api.video.duration || 0));
      api.trigger('beforeseek', [api, time]);
      if (api.hijacked) {
        api.hijacked.seek(time);
      } else {
        engine.seek(time);
      }
      if (cb) api.one('seek', cb);
      return api;
    },

    seekTo(position?: number, fn?: () => void) {
      const duration = api.get_video_duration();
      api.seek(position !== undefined ? (position / 10) * duration : duration, fn);
      return api;
    },

    mute(flag?: boolean, skipStore?: boolean) {
      if (typeof flag === 'undefined') flag = !api.muted;
      api.muted = flag;
      if (!skipStore) (storage as Record<string, string>).muted = flag ? 'true' : 'false';
      if (api.ready) {
        engine.mute(flag);
        if (!flag) engine.volume(api.volumeLevel);
      }
      return api;
    },

    volume(level: number, skipStore?: boolean) {
      if (freedomplayer.support.android && level > 0) level = 1;
      if (level === 0) { api.mute(true, skipStore); return api; }
      if (api.ready) {
        level = Math.min(Math.max(level, 0), 1);
        if (!skipStore) (storage as Record<string, string>).volume = String(level);
        engine.volume(level);
      }
      return api;
    },

    speed(val: number | boolean, cb?: () => void) {
      if (api.ready) {
        if (typeof val === 'boolean') {
          val = conf.speeds[conf.speeds.indexOf(api.currentSpeed) + (val ? 1 : -1)] || api.currentSpeed;
        }
        engine.speed(val);
        if (cb) api.one('speed', cb);
      }
      return api;
    },

    stop() {
      if (api.ready) {
        api.pause();
        if (!api.live || api.dvr) {
          api.seek(0, () => { api.trigger('stop', [api]); });
        } else {
          api.trigger('stop', [api]);
        }
      }
      return api;
    },

    unload() {
      if (conf.splash) {
        api.trigger('unload', [api]);
        if (engine) {
          engine.unload();
          api.engine = engine = null as unknown as EngineApi;
        }
      } else {
        api.stop();
      }
      return api;
    },

    shutdown() {
      api.unload();
      api.trigger('shutdown', [api]);
      api.off('');
      delete instances[Number(root.getAttribute('data-freedomplayer-instance-id'))];
      root.removeAttribute('data-freedomplayer-instance-id');
    },

    disable(flag?: boolean) {
      if (flag === undefined) flag = !api.disabled;
      if (flag !== api.disabled) {
        api.disabled = flag;
        api.trigger('disable', [flag]);
      }
      return api;
    },

    is_playlist() { return !!(api.conf.playlist && api.conf.playlist.length > 1); },
    is_last_video() { return api.is_playlist() && api.get_video_index() === api.conf.playlist.length - 1; },
    get_video_index() { return api.video.index || 0; },
    get_video_duration() { return api.get_custom_duration ? api.get_custom_duration() : api.video.duration || 0; },
    get_video_start() { return api.get_custom_start ? api.get_custom_start() : 0; },
    get_video_end() { return api.get_custom_end ? api.get_custom_end() : api.video.duration || 0; },

    registerExtension(jsUrls?: string | string[], cssUrls?: string | string[]) {
      const js = typeof jsUrls === 'string' ? [jsUrls] : jsUrls || [];
      const css = typeof cssUrls === 'string' ? [cssUrls] : cssUrls || [];
      js.forEach(url => api.extensions.js.push(url));
      css.forEach(url => api.extensions.css.push(url));
    },
  }) as unknown as PlayerApi;

  api.conf = Object.assign(api.conf, conf);
  api.extensions = { js: [], css: [] };
  freedomplayer.extensions.forEach(i => {
    api.registerExtension(i[0], i[1]);
  });

  setupEvents(api);

  const selectEngine = (clip: VideoObject): EngineFactory | undefined => {
    let eng: EngineFactory | undefined;
    let engines = freedomplayer.engines;
    if (conf.engine) {
      const e = engines.filter(e => e.engineName === conf.engine)[0];
      if (e && clip.sources?.some(source => {
        if (source.engine && source.engine !== e.engineName) return false;
        return e.canPlay(source.type, api.conf);
      })) return e;
    }
    if (conf.enginePreference) {
      engines = freedomplayer.engines
        .filter(one => conf.enginePreference!.indexOf(one.engineName) > -1)
        .sort((a, b) => conf.enginePreference!.indexOf(a.engineName) - conf.enginePreference!.indexOf(b.engineName));
    }
    clip.sources?.some(source => {
      const e = engines.filter(engine => {
        if (source.engine && source.engine !== engine.engineName) return false;
        return engine.canPlay(source.type, api.conf);
      }).shift();
      if (e) eng = e;
      return !!e;
    });
    return eng;
  };

  if (!root.getAttribute('data-freedomplayer-instance-id')) {
    root.setAttribute('data-freedomplayer-instance-id', String(playerCount++));
    root.setAttribute('tabindex', '0');

    api.on('boot', () => {
      const support = freedomplayer.support;

      if (conf.splash || common.hasClass(root, 'is-splash') || !support.firstframe) {
        api.forcedSplash = !conf.splash && !common.hasClass(root, 'is-splash');
        api.splash = true;
        if (!conf.splash) conf.splash = true;
        common.addClass(root, 'is-splash');
      }

      if (conf.splash) common.find('video', root).forEach(common.removeNode);

      if (conf.dvr || conf.live || common.hasClass(root, 'is-live')) {
        api.live = conf.live = true;
        api.dvr = conf.dvr = !!conf.dvr || common.hasClass(root, 'is-dvr');
        common.addClass(root, 'is-live');
        common.toggleClass(root, 'is-dvr', !!api.dvr);
      }

      extensions.forEach(e => { e(api, root); });
      instances.push(api);

      if (conf.splash) api.unload(); else api.load();
      if (conf.disabled) api.disable();
      api.one('ready', callback || (() => {}));
      api.one('shutdown', () => { root.className = originalClass; });

    }).on('load', (_e: unknown, _api: PlayerApi, video: VideoObject) => {
      if (conf.splash) {
        common.find('.freedomplayer.is-ready,.freedomplayer.is-loading').forEach(el => {
          const playerId = (el as HTMLElement).getAttribute('data-freedomplayer-instance-id');
          if (playerId === root.getAttribute('data-freedomplayer-instance-id')) return;
          const a = instances[Number(playerId)];
          if (a && a.conf.splash) a.unload();
        });
      }
      common.addClass(root, 'is-loading');
      api.loading = true;

      if (typeof video.live !== 'undefined' || typeof video.dvr !== 'undefined') {
        common.toggleClass(root, 'is-live', !!video.dvr || !!video.live);
        common.toggleClass(root, 'is-dvr', !!video.dvr);
        api.live = !!video.dvr || !!video.live;
        api.dvr = !!video.dvr;
      }

    }).on('ready', (_e: unknown, _api: PlayerApi, video: VideoObject) => {
      video.time = 0;
      api.video = video;
      common.removeClass(root, 'is-loading');
      api.loading = false;

      if (api.muted) api.mute(true, true);
      else api.volume(api.volumeLevel);

      const hlsFix = api.conf.hlsFix && video.type && /mpegurl/i.exec(video.type);
      common.toggleClass(root, 'hls-fix', !!hlsFix);

    }).on('unload', () => {
      common.removeClass(root, 'is-loading');
      api.loading = false;
      common.removeClass(root, 'was-played');
      api.was_played = false;

    }).on('ready unload', (e: { type: string }) => {
      const is_ready = e.type === 'ready';
      common.toggleClass(root, 'is-splash', !is_ready);
      common.toggleClass(root, 'is-ready', is_ready);
      api.ready = is_ready;
      api.splash = !is_ready;

    }).on('progress', (_e: unknown, _api: PlayerApi, time: number) => {
      if (!api.was_played) {
        api.was_played = true;
        common.addClass(root, 'was-played');
      }
      api.video.time = time;

    }).on('buffer', (_e: unknown, _api: PlayerApi, buffered: number | Array<{ end: number }>) => {
      api.video.buffer = typeof buffered === 'number' ? buffered
        : Array.isArray(buffered) && buffered.length ? buffered[buffered.length - 1].end : 0;

    }).on('speed', (_e: unknown, _api: PlayerApi, val: number) => {
      api.currentSpeed = val;

    }).on('volume', (_e: unknown, _api: PlayerApi, level: number) => {
      api.volumeLevel = Math.round(level * 100) / 100;
      if (api.muted && level) api.mute(false);

    }).on('beforeseek seek', (e: { type: string }) => {
      api.seeking = e.type === 'beforeseek';
      if (api.seeking) {
        clearTimeout(seeking_indicator_interval);
        seeking_indicator_interval = setTimeout(() => {
          common.toggleClass(root, 'is-seeking', !!api.seeking);
        }, 500);
      } else {
        common.removeClass(root, 'is-seeking');
      }
      if (e.type === 'seek') setTimeout(() => { api.manual_seeking = false; }, 0);

    }).on('ready pause resume unload finish stop', (e: { type: string }) => {
      api.paused = /pause|finish|unload|stop/.test(e.type);
      api.paused = api.paused || e.type === 'ready' && !conf.autoplay && !api.playing;

      if (e.type === 'pause') {
        setTimeout(() => { api.manual_pause = false; }, 0);
      } else if (e.type === 'resume') {
        setTimeout(() => { api.manual_resume = false; }, 0);
      }

      api.playing = !api.paused;
      common.toggleClass(root, 'is-paused', api.paused);
      common.toggleClass(root, 'is-playing', api.playing);

    }).on('finish', () => {
      api.finished = true;
    }).on('error', () => {});
  }

  api.trigger('boot', [api, root]);
  return api;
}

export default freedomplayer;
