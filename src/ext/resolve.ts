/**
 * URL resolver — resolves video objects from initial configuration and load() calls.
 */
import type { VideoSource, VideoObject } from '../types';

export const TYPE_RE = /\.(\w{3,4})(\?.*)?$/i;

function getType(typ: string): string {
  if (/mpegurl/i.test(typ)) return 'application/x-mpegurl';
  return 'video/' + typ;
}

export default class URLResolver {
  sourcesFromVideoTag(videoTag: any, $: any): VideoSource[] {
    const sources: VideoSource[] = [];
    $('source', videoTag).each(function (this: any) {
      sources.push(parseSource($(this)));
    });
    if (!sources.length && videoTag.length) sources.push(parseSource(videoTag));
    return sources;
  }

  resolve(video: VideoObject | string | VideoSource[], sources?: VideoSource[]): VideoObject {
    if (!video) return { sources: sources || [] };

    if (typeof video === 'string') {
      const src = video;
      return {
        src,
        sources: (sources || []).map(source => {
          const suffix = source.src.split(TYPE_RE)[1];
          return { type: source.type, src: src.replace(TYPE_RE, '.' + suffix + '$2') };
        })
      };
    }

    if (Array.isArray(video)) {
      return {
        sources: video.map(item => {
          if ((item as VideoSource).type && (item as VideoSource).src) return item as VideoSource;
          return Object.keys(item).reduce((m, typ) => {
            return Object.assign(m, { type: getType(typ), src: (item as Record<string, string>)[typ] });
          }, {} as VideoSource);
        })
      };
    }

    return video;
  }
}

function parseSource(el: JQuery): VideoSource {
  const src = el.attr('src') || '';
  let type = el.attr('type') || '';
  const suffix = src.split(TYPE_RE)[1] || '';
  type = type.toLowerCase();
  return Object.assign({}, el.data(), { src, suffix: suffix || type, type: type || suffix });
}

interface JQuery {
  attr(name: string): string | undefined;
  data(): Record<string, unknown>;
  length: number;
  each(fn: (this: HTMLElement) => void): void;
}

interface JQueryStatic {
  (selector: string, context?: unknown): JQuery;
}
