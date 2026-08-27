/**
 * Subtitle extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import parser from './subtitles/parser';
freedomplayer.defaults.subtitleParser = parser;
freedomplayer(function (p, root) {
    let currentPoint = null;
    let wrap;
    let subtitleControl;
    let subtitleMenu;
    let changeHandler;
    let check = false;
    function timeCheck(_e, api, time) {
        if (!check)
            return;
        (api.cuepoints || []).forEach((cue, index) => {
            const entry = cue.subtitle;
            if (entry && currentPoint !== index) {
                if (time >= cue.time && (!entry.endTime || time <= entry.endTime)) {
                    api.trigger('cuepoint', [api, cue]);
                }
            }
        });
    }
    if (!freedomplayer.support.inlineVideo ||
        (!freedomplayer.support.fullscreen && p.conf.native_fullscreen)) {
        p.conf.nativesubtitles = true;
    }
    if (!p.ui)
        p.ui = {};
    p.ui.createSubtitleControl = function (subtitles, onChange) {
        changeHandler = onChange;
        subtitleControl = subtitleControl || common.createElement('strong', { className: 'fp-cc' }, 'CC');
        subtitleMenu = subtitleMenu || common.createElement('div', { className: 'fp-menu fp-subtitle-menu' }, '<strong>Closed Captions</strong>');
        common.find('button', subtitleMenu).forEach(common.removeNode);
        common.find('a', subtitleMenu).forEach(common.removeNode);
        const noSubBtn = document.createElement('button');
        noSubBtn.setAttribute('data-subtitle-index', '-1');
        noSubBtn.textContent = 'No subtitles';
        subtitleMenu.appendChild(noSubBtn);
        (subtitles || []).forEach((st, i) => {
            const srcLang = st.srclang || 'en';
            const label = st.label || 'Default (' + srcLang + ')';
            const btn = document.createElement('button');
            btn.setAttribute('data-subtitle-index', String(i));
            btn.textContent = label;
            subtitleMenu.appendChild(btn);
        });
        common.find('.fp-ui', root)[0].appendChild(subtitleMenu);
        common.find('.fp-controls', root)[0].appendChild(subtitleControl);
        common.toggleClass(subtitleControl, 'fp-hidden', !subtitles || !subtitles.length);
        return subtitleControl;
    };
    p.ui.setActiveSubtitleItem = function (idx) {
        setActiveSubtitleClass(idx);
    };
    domOn(root, p.touch_events(), (ev) => {
        const target = ev.target;
        if (!target)
            return;
        if (target.matches('.fp-cc') || target.closest('.fp-cc')) {
            if (subtitleMenu && common.hasClass(subtitleMenu, 'fp-active'))
                p.hideMenu(subtitleMenu);
            else if (subtitleMenu)
                p.showMenu(subtitleMenu);
            return;
        }
        const subItem = target.closest('.fp-subtitle-menu [data-subtitle-index]');
        if (subItem) {
            ev.preventDefault();
            const idx = subItem.getAttribute('data-subtitle-index');
            if (changeHandler) {
                changeHandler(idx);
                return;
            }
            if (idx === '-1') {
                p.disableSubtitles();
                return;
            }
            p.loadSubtitles(Number(idx));
        }
    });
    const createUIElements = () => {
        wrap = common.find('.fp-captions', root)[0];
        if (!wrap) {
            wrap = common.createElement('div', { 'class': 'fp-captions' });
            const fpPlayer = common.find('.fp-player', root)[0];
            if (fpPlayer)
                fpPlayer.appendChild(wrap);
        }
        Array.from(wrap.children).forEach(child => common.removeNode(child));
        p.ui.createSubtitleControl(p.video.subtitles);
    };
    p.on('ready', (_ev, player, video) => {
        player.subtitles = [];
        createUIElements();
        common.removeClass(root, 'has-menu');
        p.disableSubtitles();
        if (!video.subtitles || !video.subtitles.length)
            return;
        const defaultSubtitle = video.subtitles.filter(one => one['default'])[0];
        if (defaultSubtitle)
            player.loadSubtitles(video.subtitles.indexOf(defaultSubtitle));
    });
    p.showSubtitle = function (text) {
        if (wrap) {
            common.html(wrap, text);
            common.addClass(wrap, 'fp-shown');
        }
    };
    p.hideSubtitle = function () {
        if (wrap)
            common.removeClass(wrap, 'fp-shown');
    };
    p.bind('cuepoint', (_e, _api, cue) => {
        check = false;
        if (cue.subtitle) {
            currentPoint = cue.index;
            p.showSubtitle(cue.subtitle.text);
        }
        else if (cue.subtitleEnd) {
            p.hideSubtitle();
            currentPoint = cue.index;
        }
    });
    p.bind('seek', (_e, _api, time) => {
        if (currentPoint !== null && p.cuepoints[currentPoint] && p.cuepoints[currentPoint].time > time) {
            if (wrap)
                common.removeClass(wrap, 'fp-shown');
            currentPoint = null;
        }
        (p.cuepoints || []).forEach((cue, index) => {
            const entry = cue.subtitle;
            if (entry && currentPoint !== index) {
                if (time >= cue.time && (!entry.endTime || time <= entry.endTime))
                    p.trigger('cuepoint', [p, cue]);
            }
            else if (cue.subtitleEnd && time >= cue.time && index === (currentPoint || 0) + 1) {
                p.trigger('cuepoint', [p, cue]);
            }
        });
    });
    p.on('unload', () => {
        common.find('.fp-captions', root).forEach(common.removeNode);
    });
    function setActiveSubtitleClass(idx) {
        if (!subtitleMenu)
            return;
        const prev = common.find('button.fp-selected', subtitleMenu)[0];
        if (prev)
            common.toggleClass(prev, 'fp-selected');
        const next = common.find('button[data-subtitle-index="' + idx + '"]', subtitleMenu)[0];
        if (next)
            common.toggleClass(next, 'fp-selected');
        common.toggleClass(root, 'has-subtitles', !!(p.video.subtitles && p.video.subtitles.length));
    }
    const setNativeMode = (i, mode) => {
        const video = common.find('video.fp-engine', root)[0];
        if (!video)
            return;
        const tracks = video.textTracks;
        if (!tracks.length)
            return;
        if (i === null) {
            Array.from(tracks).forEach(track => { track.mode = mode; });
        }
        else {
            tracks[i].mode = mode;
        }
    };
    p.disableSubtitles = function () {
        p.subtitles = [];
        (p.cuepoints || []).forEach((c) => {
            if (c.subtitle || c.subtitleEnd)
                p.removeCuepoint?.(c);
        });
        if (wrap)
            Array.from(wrap.children).forEach(child => common.removeNode(child));
        setActiveSubtitleClass(-1);
        if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine?.engineName === 'html5') {
            setNativeMode(null, 'disabled');
        }
        return p;
    };
    p.loadSubtitles = function (i) {
        p.disableSubtitles();
        const st = p.video.subtitles?.[i];
        if (!st?.src)
            return p;
        setActiveSubtitleClass(i);
        if (st.rtl)
            common.addClass(root, 'is-captions-rtl');
        else
            common.removeClass(root, 'is-captions-rtl');
        if (freedomplayer.support.subtitles && p.conf.nativesubtitles && p.engine?.engineName === 'html5') {
            setNativeMode(i, 'showing');
        }
        common.xhrGet(st.src, (txt) => {
            const parserFn = (p.conf.subtitleParser || parser);
            const entries = parserFn(txt);
            entries.forEach((entry, idx) => {
                if (!entry.title)
                    entry.title = 'subtitle' + idx;
                const cue = { time: entry.startTime, subtitle: entry, visible: false, index: 0 };
                p.subtitles.push(entry);
                p.addCuepoint?.(cue);
                p.addCuepoint?.({ time: entry.endTime, subtitleEnd: entry.title, visible: false, index: 0 });
                if (entry.startTime === 0 && !p.video.time && !p.splash) {
                    p.trigger('cuepoint', [p, Object.assign({}, cue, { index: 0 })]);
                }
                if (p.splash)
                    p.one('ready', () => { p.trigger('cuepoint', [p, cue]); });
            });
        }, () => {
            p.trigger('error-subtitles', [p, { code: 8, url: st.src }]);
            return false;
        });
        return p;
    };
    domOn(root, p.touch_events(), (ev) => {
        const subItem = ev.target?.closest('.fp-subtitle-menu button[data-subtitle-index]');
        if (subItem && Number(subItem.dataset.subtitleIndex) > -1) {
            check = true;
            p.on('progress', timeCheck);
        }
    });
});
