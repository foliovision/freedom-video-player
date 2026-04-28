/**
 * Playlist extension
 *
 * Modernized: Replaced bean/extend-object with native APIs.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import URLResolver, { TYPE_RE } from './resolve';
const resolver = new URLResolver();
const externalRe = /^#/;
const $ = window.jQuery;
freedomplayer(function (player, root) {
    const conf = Object.assign({ active: 'is-active', advance: true, query: '.fp-playlist a' }, player.conf);
    const klass = conf.active;
    const ui = common.find('.fp-ui', root)[0];
    let playNextIndex = -1;
    const hasCustomPlaylist = common.hasClass(root, 'fp-custom-playlist') || !!conf.customPlaylist;
    common.toggleClass(root, 'fp-custom-playlist', hasCustomPlaylist);
    common.toggleClass(root, 'fp-default-playlist', !hasCustomPlaylist);
    function els() { return common.find(conf.query, queryRoot()); }
    function queryRoot() {
        if (externalRe.test(conf.query))
            return undefined;
        return root;
    }
    function active() { return common.find(conf.query + '.' + klass, queryRoot()); }
    player.play = function (i) {
        if (i === undefined)
            return player.resume();
        if (typeof i === 'number' && !player.conf.playlist[i])
            return player;
        if (typeof i !== 'number')
            return player.load.apply(null, arguments);
        const arg = Object.assign({ index: i }, player.conf.playlist[i]);
        player.off('beforeresume.fromfirst');
        if (typeof i === 'number' && i === player.video.index)
            return player.seek(0, () => { player.resume(); });
        player.load(arg, () => { player.video.index = i; });
        return player;
    };
    player.play_next = function (videoIndex) {
        if (videoIndex > player.conf.playlist.length)
            videoIndex = player.conf.playlist.length - 1;
        playNextIndex = videoIndex;
    };
    player.next = function (e) {
        if (e)
            e.preventDefault();
        let current = player.video.index;
        if (current !== undefined && current !== -1) {
            current = current === player.conf.playlist.length - 1 ? 0 : current + 1;
            player.play(current);
        }
        return player;
    };
    player.prev = function (e) {
        if (e)
            e.preventDefault();
        let current = player.video.index;
        if (current !== undefined && current !== -1) {
            current = current === 0 ? player.conf.playlist.length - 1 : current - 1;
            player.play(current);
        }
        return player;
    };
    player.setPlaylist = function (items, keepCurrentIndex) {
        player.conf.playlist = items;
        if (!keepCurrentIndex)
            delete player.video.index;
        generatePlaylist();
        return player;
    };
    player.addPlaylistItem = function (item) {
        delete player.video.is_last;
        return player.setPlaylist(player.conf.playlist.concat([item]), true);
    };
    player.removePlaylistItem = function (idx) {
        const pl = player.conf.playlist;
        return player.setPlaylist(pl.slice(0, idx).concat(pl.slice(idx + 1)));
    };
    player.have_visible_playlist = function () {
        const isPlaylist = player.conf.playlist && player.conf.playlist.length > 0;
        if (!isPlaylist)
            return false;
        let count = 0;
        for (const item of player.conf.playlist) {
            if (typeof item.click === 'undefined')
                count++;
        }
        return count >= 2;
    };
    domOn(root, player.touch_events(), (ev) => {
        const target = ev.target;
        if (target?.closest('.fp-next')) {
            player.next();
            ev.preventDefault();
        }
        if (target?.closest('.fp-prev')) {
            player.prev();
            ev.preventDefault();
        }
    });
    player.off('finish.pl').on('finish.pl', (_e, pl) => {
        const advance = typeof pl.conf.advance === 'undefined' ? true : pl.conf.advance;
        if (!advance && playNextIndex === -1)
            return;
        if (pl.video.loop)
            return pl.seek(0, () => { pl.resume(); });
        let next = pl.video.index !== undefined && pl.video.index >= 0 ? pl.video.index + 1 : undefined;
        if (playNextIndex > -1)
            next = playNextIndex;
        if (next !== undefined && (next < pl.conf.playlist.length || conf.loop)) {
            next = next === pl.conf.playlist.length ? 0 : next;
            common.removeClass(root, 'is-finished');
            setTimeout(() => { pl.play(next); });
        }
        else {
            if (pl.conf.playlist.length > 1) {
                pl.one('beforeresume.fromfirst', (ev) => {
                    ev.preventDefault();
                    pl.play(0);
                });
                pl.one('seek', () => { pl.off('beforeresume.fromfirst'); });
            }
        }
    });
    player.on('ready', (_e, api) => {
        if (playNextIndex === api.video.index)
            playNextIndex = -1;
    });
    function generatePlaylist() {
        let plEl = common.find('.fp-playlist', root)[0];
        if (!plEl) {
            plEl = common.createElement('div', { className: 'fp-playlist' });
            const cntrls = common.find('.fp-next,.fp-prev', root);
            if (!cntrls.length) {
                const videoEl = common.find('video', root)[0];
                if (videoEl)
                    root.insertBefore(plEl, videoEl.nextSibling);
                else
                    root.appendChild(plEl);
            }
            else {
                cntrls[0].parentElement.insertBefore(plEl, cntrls[0]);
            }
        }
        plEl.innerHTML = '';
        if (player.conf.playlist[0] && player.conf.playlist[0].length) {
            player.conf.playlist = player.conf.playlist.map((itm) => {
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
                    sources: itm.map((src) => {
                        const s = {};
                        Object.keys(src).forEach(k => {
                            s.type = /mpegurl/i.test(k) ? 'application/x-mpegurl' : 'video/' + k;
                            s.src = src[k];
                        });
                        return s;
                    })
                };
            });
        }
        player.conf.playlist.forEach((item, i) => {
            const href = item.sources[0].src;
            plEl.appendChild(common.createElement('a', {
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
        if (!player.conf.clip || !player.conf.clip.sources?.length) {
            player.conf.clip = player.conf.playlist[player.conf.startIndex || 0];
        }
    }
    if (els().length && !playlistInitialized) {
        player.conf.playlist = [];
        delete player.conf.startIndex;
        els().forEach(el => {
            const src = el.href;
            el.setAttribute('data-index', String(player.conf.playlist.length));
            const itm = resolver.resolve(src, player.conf.clip?.sources);
            if ($)
                Object.assign(itm, $(el).data());
            player.conf.playlist.push(itm);
        });
    }
    common.find('.fp-prev,.fp-next,.fp-playlist', root).forEach(el => {
        ui.appendChild(el);
    });
    domOn(externalRe.test(conf.query) ? document : root, 'click', (e) => {
        const target = e.target?.closest(conf.query);
        if (!target)
            return;
        e.preventDefault();
        const toPlay = Number(target.getAttribute('data-index'));
        if (toPlay !== -1)
            player.play(toPlay);
    });
    function videoIndex(video) {
        if (typeof video.index !== 'undefined')
            return video.index;
        if (typeof player.video.index !== 'undefined')
            return player.video.index;
        return player.conf.startIndex || 0;
    }
    player.on('load', (_e, _api, video) => {
        if (!player.conf.playlist.length)
            return;
        const prev = active()[0];
        const prevIndex = prev?.getAttribute('data-index');
        const index = video.index = videoIndex(video);
        const el = common.find(conf.query + '[data-index="' + index + '"]', queryRoot())[0];
        const isLast = index === player.conf.playlist.length - 1;
        if (prev)
            common.removeClass(prev, klass);
        if (el)
            common.addClass(el, klass);
        if (prevIndex)
            common.removeClass(root, 'video' + prevIndex);
        common.addClass(root, 'video' + index);
        common.toggleClass(root, 'last-video', isLast);
        video.index = _api.video.index = index;
        video.is_last = _api.video.is_last = isLast;
    }).on('unload.pl', () => {
        if (!player.conf.playlist.length)
            return;
        active().forEach(el => common.toggleClass(el, klass));
        player.conf.playlist.forEach((_itm, i) => {
            common.removeClass(root, 'video' + i);
        });
        delete player.video.index;
    });
    if (player.conf.playlist.length)
        player.conf.loop = false;
});
