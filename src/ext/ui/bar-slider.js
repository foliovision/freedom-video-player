/**
 * Bar slider component (volume bar with discrete bars)
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import * as common from '../../common';
import freedomplayer from '../../freedomplayer';
import { domOn, domOff, domOne, domFire } from '../events';
export default function barSlider(root, opts) {
    opts = opts || {};
    const activeClass = opts.activeClass || 'fp-color';
    const inactiveClass = opts.inactiveClass || 'fp-grey';
    const childSelector = opts.childSelector || 'em';
    const rtl = !!opts.rtl;
    let disabled = false;
    const totalBars = common.find(childSelector, root).length;
    const api = {
        dragging: false,
        slide(to, trigger) {
            common.find(childSelector, root).forEach((bar, idx) => {
                const active = to > idx / totalBars;
                common.toggleClass(bar, activeClass, active);
                common.toggleClass(bar, inactiveClass, !active);
            });
            if (trigger)
                domFire(root, 'slide', [to]);
        },
        disable(flag) {
            disabled = flag;
        }
    };
    domOn(root, 'mousedown.sld touchstart.sld', (ev) => {
        ev.preventDefault();
        if (disabled)
            return;
        api.slide(getMouseValue(ev), true);
        const moveTarget = freedomplayer.support.touch ? root : document;
        domOn(moveTarget, 'mousemove.sld touchmove.sld', (ev2) => {
            ev2.preventDefault();
            api.slide(getMouseValue(ev2), true);
        });
        domOne(document, 'mouseup.sld touchend.sld', () => {
            domOff(freedomplayer.support.touch ? root : document, 'mousemove.sld touchmove.sld');
        });
    });
    return api;
    function getMouseValue(ev) {
        let pageX;
        if ('pageX' in ev) {
            pageX = ev.pageX || ev.clientX;
        }
        if ('touches' in ev && ev.touches.length) {
            pageX = ev.touches[0].pageX;
        }
        const off = common.offset(root);
        const size = common.width(root);
        let delta = (pageX || 0) - off.left;
        delta = Math.max(0, Math.min(size, delta));
        let value = delta / size;
        if (rtl)
            value = 1 - value;
        return value;
    }
}
