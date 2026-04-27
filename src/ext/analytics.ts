/**
 * Analytics extension — GA4/gtag rewrite
 *
 * Modernized:
 * - Replaced legacy ga.js (_gat._trackEvent) with gtag.js (GA4)
 * - Replaced bean with native addEventListener
 * - Replaced scriptjs with dynamic script tag
 * - Uses modern event model (send_event)
 */
import freedomplayer from '../freedomplayer';
import { TYPE_RE } from './resolve';
import type { PlayerApi, VideoObject } from '../types';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function loadGtag(measurementId: string): void {
  if (typeof window.gtag === 'function') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  script.async = true;
  document.head.appendChild(script);
}

freedomplayer(function (player: PlayerApi, root: HTMLElement) {
  const id = player.conf.analytics as string | undefined;
  if (!id) return;

  let time = 0;
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  loadGtag(id);

  const getVideoLabel = (video: VideoObject): string => {
    return video.title
      || root.getAttribute('title')
      || (video.src || '').split('/').slice(-1)[0].replace(TYPE_RE, '')
      || 'unknown';
  };

  const track = (_e?: unknown, _api?: PlayerApi, video?: VideoObject): void => {
    video = video || player.video;
    if (time && typeof window.gtag === 'function') {
      window.gtag('event', 'video_seconds_played', {
        event_category: 'Video',
        event_label: getVideoLabel(video),
        value: Math.round(time / 1000),
        engine: player.engine?.engineName || 'html5',
        video_type: video.type || ''
      });
      time = 0;
      if (timer) { clearTimeout(timer); timer = null; }
    }
  };

  player.bind('load unload', track).bind('progress', () => {
    if (!player.seeking) {
      time += last ? (+new Date() - last) : 0;
      last = +new Date();
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'video_heartbeat', {
            event_category: 'Video',
            event_label: 'heartbeat',
            value: 0,
            non_interaction: true
          });
        }
      }, 10 * 60 * 1000);
    }
  }).bind('pause', () => {
    last = 0;
  });

  player.bind('shutdown', () => {
    window.removeEventListener('unload', trackOnUnload);
  });

  const trackOnUnload = (): void => track();
  window.addEventListener('unload', trackOnUnload);
});
