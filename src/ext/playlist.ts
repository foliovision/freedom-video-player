/**
 * Playlist extension
 *
 * Modernized: Replaced bean/extend-object with native APIs.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import URLResolver, { TYPE_RE } from './resolve';
import type { PlayerApi, VideoObject, VideoSource } from '../types';

const resolver = new URLResolver();
const externalRe = /^#/;
const $ = (window as any).jQuery;

freedomplayer(function (player: PlayerApi, root: HTMLElement) {
  const conf = Object.assign({ active: 'is-active', advance: true, query: '.fp-playlist a' }, player.conf);
  const klass = conf.active as string;
  const ui = common.find('.fp-ui', root)[0] as HTMLElement;
  let playNextIndex = -1;

  const hasCustomPlaylist = common.hasClass(root, 'fp-custom-playlist') || !!conf.customPlaylist;
  common.toggleClass(root, 'fp-custom-playlist', hasCustomPlaylist);
  common.toggleClass(root, 'fp-default-playlist', !hasCustomPlaylist);

  function els(): HTMLElement[] { return common.find(conf.query, queryRoot()) as HTMLElement[]; }
  function queryRoot(): HTMLElement | undefined {
    if (externalRe.test(conf.query as string)) return undefined;
    return root;
  }
  function active(): HTMLElement[] { return common.find(conf.query + '.' + klass, queryRoot()) as HTMLElement[]; }

  player.play = function (i?: number | string | VideoObject) {
    if (i === undefined) return player.resume();
    if (typeof i === 'number' && !player.conf.playlist[i]) return player;
    if (typeof i !== 'number') return player.load.apply(null, arguments as any);
    const arg = Object.assign({ index: i }, player.conf.playlist[i]);
    player.off('beforeresume.fromfirst');
    if (typeof i === 'number' && i === player.video.index) return player.seek(0, () => { player.resume(); });
    player.load(arg, () => { player.video.index = i; });
    return player;
  } as any;

  player.play_next = function (videoIndex: number) {
    if (videoIndex > player.conf.playlist.length) videoIndex = player.conf.playlist.length - 1;
    playNextIndex = videoIndex;
  };

  player.next = function (e?: Event) {
    if (e) e.preventDefault();
    let current = player.video.index;
    if (current !== undefined && current !== -1) {
      current = current === player.conf.playlist.length - 1 ? 0 : current + 1;
      (player.play as (i: number) => PlayerApi)(current);
    }
    return player;
  };

  player.prev = function (e?: Event) {
    if (e) e.preventDefault();
    let current = player.video.index;
    if (current !== undefined && current !== -1) {
      current = current === 0 ? player.conf.playlist.length - 1 : current - 1;
      (player.play as (i: number) => PlayerApi)(current);
    }
    return player;
  };

  player.setPlaylist = function (items: VideoObject[], keepCurrentIndex?: boolean): PlayerApi {
    player.conf.playlist = items;
    if (!keepCurrentIndex) delete player.video.index;
    generatePlaylist();
    return player;
  };

  player.addPlaylistItem = function (item: VideoObject): PlayerApi {
    delete player.video.is_last;
    return player.setPlaylist!(player.conf.playlist.concat([item]), true);
  };

  player.removePlaylistItem = function (idx: number): PlayerApi {
    const pl = player.conf.playlist;
    return player.setPlaylist!(pl.slice(0, idx).concat(pl.slice(idx + 1)));
  };

  player.have_visible_playlist = function (): boolean {
    const isPlaylist = player.conf.playlist && player.conf.playlist.length > 0;
    if (!isPlaylist) return false;
    let count = 0;
    for (const item of player.conf.playlist) {
      if (typeof (item as any).click === 'undefined') count++;
    }
    return count >= 2;
  };

  domOn(root, player.touch_events(), (ev: Event) => {
    const target = ev.target as HTMLElement;
    if (target?.closest('.fp-next')) { player.next!(); ev.preventDefault(); }
    if (target?.closest('.fp-prev')) { player.prev!(); ev.preventDefault(); }
  });

  player.off('finish.pl').on('finish.pl', (_e: unknown, pl: PlayerApi) => {
    const advance = typeof pl.conf.advance === 'undefined' ? true : pl.conf.advance;
    if (!advance && playNextIndex === -1) return;
    if (pl.video.loop) return pl.seek(0, () => { pl.resume(); });

    let next = pl.video.index !== undefined && pl.video.index >= 0 ? pl.video.index + 1 : undefined;
    if (playNextIndex > -1) next = playNextIndex;
    if (next !== undefined && (next < pl.conf.playlist.length || conf.loop)) {
      next = next === pl.conf.playlist.length ? 0 : next;
      common.removeClass(root, 'is-finished');
      setTimeout(() => { (pl.play as (i: number) => void)(next as number); });
    } else {
      if (pl.conf.playlist.length > 1) {
        pl.one('beforeresume.fromfirst', (ev: { preventDefault: () => void }) => {
          ev.preventDefault();
          (pl.play as (i: number) => void)(0);
        });
        pl.one('seek', () => { pl.off('beforeresume.fromfirst'); });
      }
    }
  });

  player.on('ready', (_e: unknown, api: PlayerApi) => {
    if (playNextIndex === api.video.index) playNextIndex = -1;
  });

  function generatePlaylist(): void {
    let plEl = common.find('.fp-playlist', root)[0] as HTMLElement | undefined;
    if (!plEl) {
      plEl = common.createElement('div', { className: 'fp-playlist' });
      const cntrls = common.find('.fp-next,.fp-prev', root);
      if (!cntrls.length) {
        const videoEl = common.find('video', root)[0];
        if (videoEl) root.insertBefore(plEl, videoEl.nextSibling);
        else root.appendChild(plEl);
      } else {
        cntrls[0].parentElement!.insertBefore(plEl, cntrls[0]);
      }
    }
    plEl.innerHTML = '';

    if (player.conf.playlist[0] && (player.conf.playlist[0] as any).length) {
      player.conf.playlist = player.conf.playlist.map((itm: any) => {
        if (typeof itm === 'string') {
          const type = itm.split(TYPE_RE)[1];
          return {
            sources: [{
              type: type.toLowerCase() === 'm3u8' ? 'application/x-mpegurl' : 'video/' + type,
              src: itm
            }]
          };
        }
        return {
          sources: itm.map((src: Record<string, string>) => {
            const s: Partial<VideoSource> = {};
            Object.keys(src).forEach(k => {
              s.type = /mpegurl/i.test(k) ? 'application/x-mpegurl' : 'video/' + k;
              s.src = src[k];
            });
            return s;
          })
        };
      });
    }

    player.conf.playlist.forEach((item: any, i: number) => {
      const href = item.sources[0].src;
      plEl!.appendChild(common.createElement('a', {
        href,
        className: player.video.index === i ? klass : undefined,
        'data-index': String(i)
      }));
    });
  }

  let playlistInitialized = false;
  if (player.conf.playlist.length) {
    playlistInitialized = true;
    generatePlaylist();
    if (!player.conf.clip || !(player.conf.clip as any).sources?.length) {
      player.conf.clip = player.conf.playlist[(player.conf.startIndex as number) || 0];
    }
  }

  if (els().length && !playlistInitialized) {
    player.conf.playlist = [];
    delete player.conf.startIndex;
    els().forEach(el => {
      const src = (el as HTMLAnchorElement).href;
      el.setAttribute('data-index', String(player.conf.playlist.length));
      const itm = resolver.resolve(src, (player.conf.clip as any)?.sources);
      if ($) Object.assign(itm, $(el).data());
      player.conf.playlist.push(itm as VideoObject);
    });
  }

  common.find('.fp-prev,.fp-next,.fp-playlist', root).forEach(el => {
    ui.appendChild(el);
  });

  domOn(externalRe.test(conf.query as string) ? document : root, 'click', (e: Event) => {
    const target = (e.target as HTMLElement)?.closest(conf.query as string) as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    const toPlay = Number(target.getAttribute('data-index'));
    if (toPlay !== -1) (player.play as (i: number) => void)(toPlay);
  });

  function videoIndex(video: VideoObject): number {
    if (typeof video.index !== 'undefined') return video.index;
    if (typeof player.video.index !== 'undefined') return player.video.index!;
    return (player.conf.startIndex as number) || 0;
  }

  player.on('load', (_e: unknown, _api: PlayerApi, video: VideoObject) => {
    if (!player.conf.playlist.length) return;
    const prev = active()[0];
    const prevIndex = prev?.getAttribute('data-index');
    const index = video.index = videoIndex(video);
    const el = common.find(conf.query + '[data-index="' + index + '"]', queryRoot())[0] as HTMLElement | undefined;
    const isLast = index === player.conf.playlist.length - 1;
    if (prev) common.removeClass(prev, klass);
    if (el) common.addClass(el, klass);
    if (prevIndex) common.removeClass(root, 'video' + prevIndex);
    common.addClass(root, 'video' + index);
    common.toggleClass(root, 'last-video', isLast);
    video.index = _api.video.index = index;
    video.is_last = _api.video.is_last = isLast;
  }).on('unload.pl', () => {
    if (!player.conf.playlist.length) return;
    active().forEach(el => common.toggleClass(el, klass));
    player.conf.playlist.forEach((_itm: VideoObject, i: number) => {
      common.removeClass(root, 'video' + i);
    });
    delete player.video.index;
  });

  if (player.conf.playlist.length) player.conf.loop = false;
});
