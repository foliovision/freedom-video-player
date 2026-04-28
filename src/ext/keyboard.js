/**
 * Keyboard extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
let focused;
let focusedRoot;
freedomplayer(function (api, root) {
    if (!api.conf.keyboard)
        return;
    domOn(document, 'keydown.fp', (e) => {
        const ev = e;
        if (typeof focused === 'undefined')
            return;
        const el = focused && !focused.disabled ? focused : undefined;
        const metaKeyPressed = ev.ctrlKey || ev.metaKey || ev.altKey;
        const key = ev.which;
        const conf = el && el.conf;
        if (focusedRoot && (common.hasClass(focusedRoot, 'no-controlbar') || common.hasClass(focusedRoot, 'is-cva')))
            return;
        if (!el || !conf?.keyboard || el.disabled)
            return;
        // Allow tab key
        if (key === 9)
            return;
        // Help dialog
        if ([63, 187, 191].indexOf(key) !== -1) {
            if (focusedRoot)
                common.toggleClass(focusedRoot, 'is-help');
            return;
        }
        // Close help
        if (key === 27 && focusedRoot && common.hasClass(focusedRoot, 'is-help')) {
            common.toggleClass(focusedRoot, 'is-help');
            return;
        }
        if (!metaKeyPressed && el.ready) {
            ev.preventDefault();
            // Shift+key shortcuts
            if (ev.shiftKey) {
                if (key === 39)
                    el.speed(true);
                else if (key === 37)
                    el.speed(false);
                else if (key === 78)
                    el.next?.();
                else if (key === 80)
                    el.prev?.();
                return;
            }
            // Number keys 1-9 → seek to percentage
            if (key < 58 && key > 47) {
                el.seekTo(key - 48);
                return;
            }
            switch (key) {
                case 38:
                case 75:
                    el.volume(el.volumeLevel + 0.15);
                    break;
                case 40:
                case 74:
                    el.volume(el.volumeLevel - 0.15);
                    break;
                case 39:
                case 76:
                    el.seeking = true;
                    el.manual_seeking = true;
                    el.seek((api.video.time || 0) + 5);
                    break;
                case 37:
                case 72:
                    el.seeking = true;
                    el.manual_seeking = true;
                    el.seek((api.video.time || 0) - 5);
                    break;
                case 32:
                    if (api.playing)
                        el.manual_pause = true;
                    else if (api.paused)
                        el.manual_resume = true;
                    el.toggle();
                    break;
                case 70:
                    if (conf.fullscreen)
                        el.fullscreen?.();
                    break;
                case 77:
                    el.mute();
                    break;
                case 81:
                    el.unload();
                    break;
                case 67: {
                    if (!api.video.subtitles || api.video.subtitles.length === 0)
                        break;
                    const currentEl = focusedRoot?.querySelector('.fp-dropdown li.active[data-subtitle-index]');
                    let currentSubtitles = currentEl ? Number(currentEl.dataset.subtitleIndex) : -1;
                    currentSubtitles++;
                    if (currentSubtitles > api.video.subtitles.length - 1)
                        currentSubtitles = -1;
                    api.trigger('subtitles-switched', [currentSubtitles]);
                    break;
                }
                case 190:
                case 188:
                    if (api.playing) {
                        el.manual_pause = true;
                        el.pause();
                    }
                    el.seek((api.video.time || 0) + (key === 190 ? 1 / 30 : -1 / 30));
                    break;
            }
        }
    });
    domOn(root, 'mouseenter.fp mouseleave.fp focus.fp', (e) => {
        focused = !api.disabled && (e.type === 'mouseover' || e.type === 'focus') ? api : undefined;
        if (focused)
            focusedRoot = root;
    });
});
