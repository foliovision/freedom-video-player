/**
 * Timeline slider component
 *
 * Modernized: Replaced bean with native addEventListener.
 * Simplified touch event handling using standard touch APIs.
 */
import * as common from '../../common';
import { domOn, domOff, domOne, domFire } from '../events';
function throttle(fn, delay) {
    let locked = false;
    return function (...args) {
        if (!locked) {
            fn.apply(this, args);
            locked = true;
            setTimeout(() => { locked = false; }, delay);
        }
    };
}
export default function slider(root, fp_api, fp_root) {
    const progress = common.lastChild(root);
    let disabled = false;
    let offsetRect;
    let w;
    let h;
    let vertical = false;
    let size;
    let maxValue;
    let max;
    let skipAnimation = false;
    const calc = () => {
        offsetRect = common.offset(root);
        w = common.width(root);
        h = common.height(root);
        size = vertical ? h : w;
        max = maxValue !== undefined ? toDelta(maxValue) : size;
    };
    const fire = (value, no_seek) => {
        if (!disabled && value !== api.value && (!maxValue || value < maxValue)) {
            if (!no_seek) {
                domFire(root, 'slide', [value]);
                api.value = value;
            }
        }
    };
    const mousemove = (e) => {
        let pageX;
        if ('touches' in e && e.touches.length) {
            pageX = e.touches[0].pageX;
        }
        else if ('changedTouches' in e && e.changedTouches.length) {
            pageX = e.changedTouches[0].pageX;
        }
        else if ('pageX' in e) {
            pageX = e.pageX || e.clientX;
        }
        let delta = vertical
            ? ('pageY' in e ? e.pageY : 0) - offsetRect.top
            : (pageX || 0) - offsetRect.left;
        delta = Math.max(0, Math.min(max || size, delta));
        let value = delta / size;
        if (vertical)
            value = 1 - value;
        if (fp_api.rtl)
            value = 1 - value;
        return move(value, 0);
    };
    const move = (value, speed) => {
        if (speed === undefined)
            speed = 0;
        if (value > 1)
            value = 1;
        const to = (Math.round(value * 1000) / 10) + '%';
        if (!maxValue || value <= maxValue) {
            if (skipAnimation) {
                common.removeClass(progress, 'animated');
            }
            else {
                common.addClass(progress, 'animated');
                common.css(progress, 'transition-duration', (speed || 0) + 'ms');
            }
            common.css(progress, 'width', to);
        }
        return value;
    };
    const toDelta = (value) => {
        return Math.max(0, Math.min(size, vertical ? (1 - value) * h : value * w));
    };
    const api = {
        calc,
        dragging: false,
        max(value) {
            maxValue = value;
        },
        getMax() {
            return maxValue;
        },
        disable(flag) {
            disabled = flag;
        },
        slide(value, speed, fireEvent) {
            calc();
            if (fireEvent)
                fire(value);
            move(value, speed);
        },
        disableAnimation(value, alsoCssAnimations) {
            skipAnimation = value !== false;
            common.toggleClass(root, 'no-animation', !!alsoCssAnimations);
        }
    };
    domOn(root, 'mousedown.sld touchstart.sld', (e) => {
        const ev = e;
        if (common.hasClass(fp_root, 'is-mouseout') &&
            !common.hasClass(fp_root, 'is-splash') &&
            !common.hasClass(fp_root, 'is-seeking') &&
            !common.hasClass(fp_root, 'fixed-controls') &&
            !common.hasClass(fp_root, 'is-mobile-seeking')) {
            return;
        }
        ev.preventDefault();
        if (!disabled) {
            const delayedFire = throttle(fire, 100);
            calc();
            api.dragging = true;
            fire(mousemove(ev));
            domOn(document, 'mousemove.sld touchmove.sld', (e2) => {
                common.addClass(root, 'is-fp-dragging');
                e2.preventDefault();
                delayedFire(mousemove(e2), !!fp_api.video.timeline_vtt);
            });
            domOne(document, 'mouseup.sld touchend.sld', (e2) => {
                if (fp_api.video.timeline_vtt) {
                    fire(mousemove(e2));
                    setTimeout(() => { api.dragging = false; }, 250);
                }
                else {
                    api.dragging = false;
                }
                common.removeClass(root, 'is-fp-dragging');
                domOff(document, 'mousemove.sld touchmove.sld');
            });
        }
    });
    return api;
}
