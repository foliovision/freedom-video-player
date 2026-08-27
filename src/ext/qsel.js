/**
 * Quality selection extension
 *
 * Modernized: Replaced bean with native addEventListener.
 * Uses <details>/<summary> for the quality menu.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
freedomplayer(function (api, root) {
    const ui = common.find('.fp-ui', root)[0];
    const controlbar = common.find('.fp-controls', ui)[0];
    domOn(root, api.touch_events(), (ev) => {
        const target = ev.target;
        if (!target)
            return;
        // Toggle quality menu
        if (target.matches('.fp-qsel') || target.closest('.fp-qsel')) {
            const menu = common.find('.fp-qsel-menu', root)[0];
            if (!menu)
                return;
            if (common.hasClass(menu, 'fp-active'))
                api.hideMenu(menu);
            else
                api.showMenu(menu);
            return;
        }
        // Quality item clicked
        const qualityItem = target.closest('.fp-qsel-menu [data-quality]');
        if (qualityItem) {
            const q = qualityItem.getAttribute('data-quality');
            if (q !== null)
                api.quality(q);
        }
    });
    api.quality = function (q) {
        q = isNaN(Number(q)) ? q : Number(q);
        api.trigger('quality', [api, q]);
    };
    api.on('quality', (_ev, _api, q) => {
        selectQuality(q, _api.video.qualities);
    });
    api.on('ready', (_ev, _api, video) => {
        removeMenu();
        if (!video.qualities || video.qualities.filter(q => typeof q.value !== 'undefined' ? q.value > -1 : true).length < 2)
            return;
        createMenu(video.qualities);
        selectQuality(video.quality, video.qualities);
    });
    function removeMenu() {
        common.find('.fp-qsel-menu', root).forEach(common.removeNode);
        common.find('.fp-qsel', root).forEach(common.removeNode);
    }
    function createMenu(qualities) {
        controlbar.appendChild(common.createElement('strong', { className: 'fp-qsel' }, 'HD'));
        const menu = common.createElement('div', { className: 'fp-menu fp-qsel-menu' }, '<strong>Quality</strong>');
        qualities.forEach(q => {
            const btn = document.createElement('button');
            const quality = typeof q.value !== 'undefined' ? q.value : q;
            btn.setAttribute('data-quality', String(quality));
            btn.innerHTML = String(q.label || q);
            menu.appendChild(btn);
        });
        ui.appendChild(menu);
    }
    function selectQuality(quality, _qualities) {
        common.find('.fp-qsel-menu button[data-quality]', root).forEach(el => {
            common.toggleClass(el, 'fp-selected', el.getAttribute('data-quality') == String(quality));
            common.toggleClass(el, 'fp-color', el.getAttribute('data-quality') == String(quality));
        });
    }
});
