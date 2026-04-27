/**
 * HTML5 engine factory
 *
 * Modernized:
 * - Replaced bean with native addEventListener
 * - Replaced extend-object with Object.assign
 * - Removed IE-specific workarounds
 * - Removed webkit-playsinline (kept playsinline only)
 * - iOS12-COMPAT: old webkit-playsinline kept for iOS 12
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff, domOne } from '../ext/events';
import type { PlayerApi, EngineApi, VideoObject, VideoSource, SupportFlags } from '../types';

const support = freedomplayer.support;
const desktopSafari = support.browser?.safari && !support.iOS;

const EVENTS: Record<string, string | 0> = {
  ended: 'finish',
  pause: 'pause',
  play: 'resume',
  timeupdate: 'progress',
  volumechange: 'volume',
  ratechange: 'speed',
  seeked: 'seek',
  loadedmetadata: !desktopSafari ? 'ready' : 0,
  canplaythrough: desktopSafari ? 'ready' : 0,
  durationchange: 'ready',
  error: 'error',
  dataunavailable: 'error',
  webkitendfullscreen: !support.inlineVideo ? 'unload' : 0,
  progress: 'buffer'
};

function round(val: number, per = 100): number {
  return Math.round(val * per) / per;
}

function isInViewport(elem: HTMLElement): boolean {
  const rect = elem.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + rect.height &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + rect.width
  );
}

type ExtraResult = {
  handlers?: { error?: (e: Event, api: HTMLVideoElement) => boolean | void };
} | undefined;

export default function html5factory(
  engineName: string,
  player: PlayerApi,
  root: HTMLElement,
  canPlay: (type: string) => boolean,
  ext: (video: VideoObject, api: HTMLVideoElement, self: EngineApi, tryMutedAutoplay: (p: Promise<void> | void) => void) => ExtraResult
): EngineApi {
  let api = (common.findDirect('video', root)[0] || common.find('.fp-player > video', root)[0]) as HTMLVideoElement | null;
  const conf = player.conf;
  let timer: ReturnType<typeof setInterval> | undefined;
  let volumeLevel: number | undefined;
  let clickToUnmuteDismiss: (() => void) | null = null;
  let self: EngineApi;

  function tryMutedAutoplay(p: Promise<void> | void): void {
    if (p && (p as Promise<void>).catch) {
      const recoverAutoplay = (err: Error & { name: string; code: number }): Promise<void> | void => {
        if (err.name === 'AbortError' && err.code === 20) {
          if (!created) return api!.play().catch(recoverAutoplay);
          return;
        }
        if (!conf.mutedAutoplay) throw new Error('Unable to autoplay');
        player.debug('Play errored, trying muted', err);
        player.mute(true, true);

        if (!common.hasClass(root, 'is-audio')) {
          if (clickToUnmuteDismiss) clickToUnmuteDismiss();
          clickToUnmuteDismiss = player.message(
            '<span class="fp-icon fp-volumebtn-notice"></span> ' + (conf.msg?.click_to_unmute || 'Click to unmute'),
            10000,
            { className: 'fp-message-muted' }
          );
        }

        domOn(root, 'click', (e: Event) => {
          if (!(e.target as HTMLElement)?.closest('.fp-message-muted')) return;
          player.mute(false);
          player.volume(1);
          document.querySelectorAll('video.fp-placeholder-video').forEach(v => { (v as HTMLVideoElement).muted = false; });
        });

        return api!.play();
      };
      (p as Promise<void>).catch(recoverAutoplay).catch(() => {
        conf.autoplay = false;
        player.mute(false, true);
        player.trigger('stop', [player]);
        common.addClass(root, 'autoplay-failed');
      });
    }
  }

  let created = false;

  return self = {
    engineName,

    pick(sources: VideoSource[]): VideoSource | undefined {
      const source = support.video ? sources.filter(s => canPlay(s.type))[0] : undefined;
      if (!source) return;
      if (typeof source.src === 'string') source.src = common.createAbsoluteUrl(source.src);
      return source;
    },

    load(video: VideoObject): void {
      if (
        (window as any).FV_Player_Pro && (window as any).fv_player_video_parse &&
        !root.getAttribute('fvhkey') && (window as any).FV_Player_Pro.is_dynamic(video.src)
      ) {
        (window as any).fv_player_video_parse(video, this, player, root);
        if ((window as any).fv_player_pro_dammit?.[root.id]) return;
        if (support.inlineVideo) (window as any).fv_player_pro_dammit[root.id] = true;
      }

      const container = common.find('.fp-player', root)[0] as HTMLElement;
      created = false;

      if (!api) {
        api = document.createElement('video');
        common.prepend(container, api);
        api.autoplay = !!conf.splash;
        created = true;
      }
      api.classList.add('fp-engine');
      common.find('track', api).forEach(common.removeNode);
      api.preload = 'none';

      if (!conf.nativesubtitles) api.removeAttribute('crossorigin');

      if (!conf.disableInline) {
        // iOS12-COMPAT: webkit-playsinline for iOS 12 — remove when iOS >= 15 is the floor
        api.setAttribute('webkit-playsinline', 'true');
        api.setAttribute('playsinline', 'true');
      }

      if (!support.inlineVideo) {
        common.css(api, { position: 'absolute', top: '-9999em' });
      }

      if (conf.video_cross_origin) {
        api.setAttribute('crossorigin', 'anonymous');
      } else {
        api.removeAttribute('crossorigin');
      }

      if (support.subtitles && conf.nativesubtitles && video.subtitles?.length) {
        api.classList.add('native-subtitles');
        const setMode = (mode: TextTrackMode): void => {
          const tracks = api!.textTracks;
          if (!tracks.length) return;
          tracks[0].mode = mode;
        };

        // iOS12-COMPAT: cross-origin for subtitles on older iOS — remove when iOS >= 15 is the floor
        if (!support.iOS || (support.iOS as any).version < 18) {
          if (video.subtitles.some(st => !common.isSameDomain(st.src))) {
            api.setAttribute('crossorigin', 'anonymous');
          }
        }

        if (typeof api.textTracks.addEventListener === 'function') {
          api.textTracks.addEventListener('addtrack', () => { setMode('disabled'); setMode('showing'); });
        }
        video.subtitles.forEach(st => {
          api!.appendChild(common.createElement('track', {
            kind: 'subtitles',
            srclang: st.srclang || 'en',
            label: st.label || 'en',
            src: st.src,
            'default': st['default'] ? '' : undefined
          }));
        });
      }

      api.loop = false;
      player.off('.loophack');
      if (video.loop || conf.loop) {
        player.on('finish.loophack', () => {
          player.resume();
          setTimeout(() => {
            const playButton = common.find('.fp-play', root)[0];
            if (playButton) common.removeClass(playButton, 'fp-visible');
          }, 0);
        });
      }

      if (typeof volumeLevel !== 'undefined') api.volume = volumeLevel;

      const extra = ext(video, api, self, tryMutedAutoplay);
      if (conf.autoplay || conf.splash || video.autoplay) {
        player.debug('Autoplay / Splash setup, try to start video');
        api.load();
        const doPlay = (): void => {
          try { tryMutedAutoplay(api!.play()); } catch (e) { player.debug('play() error thrown', e); }
        };
        if (api.readyState > 0) doPlay();
        else api.addEventListener('canplay', doPlay, { once: true });
      }

      const listeners = listen(api, Array.from(common.find('source', api)).concat([api]) as HTMLElement[], video, extra);
      if (listeners) self._listeners = listeners;

      if (conf.autoplay || conf.splash || video.autoplay) return;
      const eventName = 'scroll.preloadviewport-' + root.getAttribute('data-freedomplayer-instance-id');

      const preloadCheck = (): void => {
        if (!(player as any).force_preload && !isInViewport(root)) return;
        if (support.preloadMetadata) api!.preload = 'metadata';
        else api!.load();
        domOff(document, eventName);
      };
      domOff(document, eventName);
      domOn(document, eventName, () => requestAnimationFrame(preloadCheck));
      preloadCheck();
    },

    mute(flag: boolean): void {
      if (!api) return;
      api.muted = !!flag;
      player.trigger('mute', [player, flag]);
      player.trigger('volume', [player, flag ? 0 : api.volume]);
    },

    pause(): void { api?.pause(); },

    resume(): void { if (api) tryMutedAutoplay(api.play()); },

    speed(val: number): void { if (api) api.playbackRate = val; },

    seek(time: number): void {
      if (!api) return;
      const pausedState = api.paused || player.finished;
      try {
        api.currentTime = time;
        if (pausedState) api.addEventListener('seeked', () => api!.pause(), { once: true });
      } catch (ignored) { /* */ }
    },

    volume(level: number): void {
      volumeLevel = level;
      if (api) {
        api.volume = level;
        if (level) self.mute(false);
      }
    },

    unload(): void {
      domOff(document, 'scroll.preloadviewport');
      common.find('video.fp-engine', root).forEach(videoTag => {
        if ('MediaSource' in window) {
          (videoTag as HTMLVideoElement).src = URL.createObjectURL(new MediaSource());
        } else {
          (videoTag as HTMLVideoElement).src = '';
        }
        common.removeNode(videoTag);
      });
      if (timer) { clearInterval(timer); timer = undefined; }
      const instanceId = root.getAttribute('data-freedomplayer-instance-id');
      if (api && (api as any).listeners?.[instanceId!]) delete (api as any).listeners[instanceId!];
      api = null;
      if (self._listeners) {
        Object.keys(self._listeners).forEach(typ => {
          (self._listeners as Record<string, Function[]>)[typ].forEach(l => {
            root.removeEventListener(typ, l as EventListener, true);
          });
        });
      }
    }
  };

  function listen(api: HTMLVideoElement, sources: HTMLElement[], video: VideoObject, extra: ExtraResult): Record<string, Function[]> | undefined {
    const instanceId = root.getAttribute('data-freedomplayer-instance-id')!;
    if ((api as any).listeners?.hasOwnProperty(instanceId)) {
      (api as any).listeners[instanceId] = video;
      return;
    }
    ((api as any).listeners || ((api as any).listeners = {}))[instanceId] = video;

    sources.forEach(src => {
      src.addEventListener('error', (e: Event) => {
        try {
          if (canPlay((e.target as HTMLElement)?.getAttribute('type') || '')) {
            player.trigger('error', [player, { code: 4, video: Object.assign({}, video, { src: api.src, url: api.src }) }]);
          }
        } catch (er) { /* */ }
      });
    });

    player.on('shutdown', () => {
      sources.forEach(src => { src.replaceWith(src.cloneNode(true)); });
      player.off('.loophack');
    });

    const eventListeners: Record<string, Function[]> = {};

    // HLS metadata track listener
    const listenMetadata = (track: TextTrack): void => {
      if (track.kind !== 'metadata') return;
      track.mode = 'hidden';
      track.addEventListener('cuechange', () => {
        if (!track.activeCues?.length) return;
        player.trigger('metadata', [player, (track.activeCues[0] as any).value]);
      });
    };

    if (api.textTracks?.length) Array.from(api.textTracks).forEach(listenMetadata);
    if (api.textTracks && typeof api.textTracks.addEventListener === 'function') {
      api.textTracks.addEventListener('addtrack', (tev: TrackEvent) => { if (tev.track) listenMetadata(tev.track); });
    }

    if (player.conf.dvr || (player as any).dvr || (video as any).dvr) {
      api.addEventListener('progress', () => {
        if (!api.seekable.length) return;
        player.video.duration = api.seekable.end(null as any);
        (player.video as any).seekOffset = api.seekable.start(null as any);
        player.trigger('dvrwindow', [player, { start: api.seekable.start(null as any), end: api.seekable.end(null as any) }]);
        if (api.currentTime >= api.seekable.start(null as any)) return;
        api.currentTime = api.seekable.start(null as any);
      });
    }

    Object.keys(EVENTS).forEach(type => {
      let flow = EVENTS[type];
      if (type === 'webkitendfullscreen' && player.conf.disableInline) flow = 'unload';
      if (!flow) return;

      const l = (e: Event): void => {
        video = (api as any).listeners[instanceId];
        if (!e.target || !(e.target as HTMLElement).classList?.contains('fp-engine')) return;
        if (!/progress/.test(flow as string)) player.debug(type, '->', flow, e);

        const triggerEvent = (f?: string): void => { player.trigger(f || flow as string, [player, arg]); };

        if (!player.ready && !/ready|error/.test(flow as string) || !flow || !common.find('video', root).length) {
          if (flow === 'resume') player.one('ready', () => setTimeout(triggerEvent));
          return;
        }

        let arg: unknown;

        if (flow === 'unload') { player.unload(); return; }

        switch (flow) {
          case 'ready':
            if (player.ready && (player.live || (player as any).dvr)) player.video.duration = api.duration;
            if (player.ready) { player.debug('Player already ready'); return; }
            if ((!api.duration || api.duration === Infinity) && !player.live) {
              if ((support.browser?.safari || support.iOS) && (api as any).type?.match(/application\/x-mpegurl/i)) {
                api.addEventListener('progress', () => {
                  api.addEventListener('progress', () => {
                    if ((api as any).ios_live_stream_ready_forced || player.ready) return;
                    (api as any).ios_live_stream_ready_forced = true;
                    player.debug('HLS video continues buffering on iOS, send ready event');
                    arg = Object.assign({}, video, {
                      duration: api.duration < Number.MAX_VALUE ? api.duration : 0,
                      width: api.videoWidth, height: api.videoHeight, url: api.currentSrc
                    });
                    (arg as any).seekable = (arg as any).duration;
                    common.addClass(root, 'is-live');
                    player.live = true;
                    triggerEvent();
                  }, { once: true });
                }, { once: true });
              }
              player.debug('No duration and VOD setup, not sending ready event');
              return;
            }
            arg = Object.assign({}, video, {
              duration: api.duration < Number.MAX_VALUE ? api.duration : 0,
              width: api.videoWidth, height: api.videoHeight, url: api.currentSrc
            });
            (arg as any).seekable = (arg as any).duration;
            player.debug('Ready: ', arg);

            if (!player.live && !(arg as any).duration && support.hlsDuration && type === 'loadeddata') {
              const durationChanged = (): void => {
                (arg as any).duration = api.duration;
                try { (arg as any).seekable = api.seekable?.end(null as any); } catch (ignored) { /* */ }
                triggerEvent();
                api.removeEventListener('durationchange', durationChanged);
                common.toggleClass(root, 'is-live', false);
              };
              api.addEventListener('durationchange', durationChanged);
              const timeUpdated = (): void => {
                if (!player.ready && !api.duration) {
                  (arg as any).duration = 0;
                  common.addClass(root, 'is-live');
                  triggerEvent();
                }
                api.removeEventListener('timeupdate', timeUpdated);
              };
              api.addEventListener('timeupdate', timeUpdated);
              return;
            }
            break;

          case 'progress': case 'seek':
            if (clickToUnmuteDismiss && (
              !(api as any).mozHasAudio &&
              !Boolean((api as any).webkitAudioDecodedByteCount) &&
              !Boolean((api as any).audioTracks?.length)
            )) {
              clickToUnmuteDismiss();
            }
            if (api.currentTime > 0 || player.live) arg = Math.max(api.currentTime, 0);
            else if (flow === 'seek' && api.currentTime === 0) arg = 0;
            else if (flow === 'progress') return;
            break;

          case 'buffer':
            arg = [];
            for (let i = 0; i < api.buffered.length; i++) {
              (arg as any[]).push({ start: api.buffered.start(i), end: api.buffered.end(i) });
            }
            if (api.buffered.length && api.buffered.end(null as any) === api.duration) triggerEvent('buffered');
            break;

          case 'speed': arg = round(api.playbackRate); break;

          case 'volume':
            arg = round(api.muted ? 0 : api.volume);
            if ((arg as number) > 0 && clickToUnmuteDismiss) clickToUnmuteDismiss();
            break;

          case 'error':
            if ((window as any).FV_Player_Pro && (window as any).FV_Player_Pro.is_dynamic(api.src)) {
              root.classList.remove('is-error');
              try { (api as any).error = (api as any).loading = false; } catch (e) { /* */ }
              root.classList.remove('is-error');
              return;
            }
            if (api.src.match(/fv-player-mpd/) || (video as any).manifest || video.src?.match(/player\.vimeo\.com\/.*?\.mpd/)) {
              root.classList.remove('is-error');
              flow = 'dash-soft-error';
            } else if (!canPlay('application/x-mpegurl') && api.src.match(/m3u8/)) {
              root.classList.remove('is-error');
              flow = 'm3u8-soft-error';
            }
            try {
              if (extra?.handlers?.error) {
                const handled = extra.handlers.error(e, api);
                if (handled) return;
              }
              arg = ((e as any).srcElement || (e as any).originalTarget)?.error;
              if (arg) (arg as any).video = Object.assign({}, video, { src: api.src, url: api.src });
            } catch (er) { return; }
        }
        triggerEvent();
      };

      root.addEventListener(type, l, true);
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(l);
    });
    return eventListeners;
  }
}
