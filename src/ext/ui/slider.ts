/**
 * Timeline slider component
 *
 * Modernized: Replaced bean with native addEventListener.
 * Simplified touch event handling using standard touch APIs.
 */
import * as common from '../../common';
import { domOn, domOff, domOne, domFire } from '../events';
import type { PlayerApi, SliderApi } from '../../types';

function throttle(fn: (...args: any[]) => void, delay: number): (...args: any[]) => void {
  let locked = false;
  return function (this: unknown, ...args: any[]) {
    if (!locked) {
      fn.apply(this, args);
      locked = true;
      setTimeout(() => { locked = false; }, delay);
    }
  };
}

export default function slider(root: HTMLElement, fp_api: PlayerApi, fp_root: HTMLElement): SliderApi {
  const progress = common.lastChild(root) as HTMLElement;
  let disabled = false;
  let offsetRect: ReturnType<typeof common.offset>;
  let w: number;
  let h: number;
  let vertical = false;
  let size: number;
  let maxValue: number | undefined;
  let max: number;
  let skipAnimation = false;

  const calc = (): void => {
    offsetRect = common.offset(root);
    w = common.width(root);
    h = common.height(root);
    size = vertical ? h : w;
    max = maxValue !== undefined ? toDelta(maxValue) : size;
  };

  const fire = (value: number, no_seek?: boolean): void => {
    if (!disabled && value !== api.value && (!maxValue || value < maxValue)) {
      if (!no_seek) {
        domFire(root, 'slide', [value]);
        api.value = value;
      }
    }
  };

  const mousemove = (e: MouseEvent | TouchEvent): number => {
    let pageX: number | undefined;

    if ('touches' in e && e.touches.length) {
      pageX = e.touches[0].pageX;
    } else if ('changedTouches' in e && e.changedTouches.length) {
      pageX = e.changedTouches[0].pageX;
    } else if ('pageX' in e) {
      pageX = e.pageX || (e as MouseEvent).clientX;
    }

    let delta = vertical
      ? ('pageY' in e ? e.pageY : 0) - offsetRect.top
      : (pageX || 0) - offsetRect.left;
    delta = Math.max(0, Math.min(max || size, delta));

    let value = delta / size;
    if (vertical) value = 1 - value;
    if (fp_api.rtl) value = 1 - value;
    return move(value, 0);
  };

  const move = (value: number, speed?: number): number => {
    if (speed === undefined) speed = 0;
    if (value > 1) value = 1;

    const to = (Math.round(value * 1000) / 10) + '%';

    if (!maxValue || value <= maxValue) {
      if (skipAnimation) {
        common.removeClass(progress, 'animated');
      } else {
        common.addClass(progress, 'animated');
        common.css(progress, 'transition-duration', (speed || 0) + 'ms');
      }
      common.css(progress, 'width', to);
    }
    return value;
  };

  const toDelta = (value: number): number => {
    return Math.max(0, Math.min(size, vertical ? (1 - value) * h : value * w));
  };

  const api: SliderApi = {
    calc,
    dragging: false,

    max(value: number) {
      maxValue = value;
    },

    getMax(): number | undefined {
      return maxValue;
    },

    disable(flag: boolean) {
      disabled = flag;
    },

    slide(value: number, speed?: number, fireEvent?: boolean) {
      calc();
      if (fireEvent) fire(value);
      move(value, speed);
    },

    disableAnimation(value?: boolean, alsoCssAnimations?: boolean) {
      skipAnimation = value !== false;
      common.toggleClass(root, 'no-animation', !!alsoCssAnimations);
    }
  };

  domOn(root, 'mousedown.sld touchstart.sld', (e: Event) => {
    const ev = e as MouseEvent | TouchEvent;

    if (
      common.hasClass(fp_root, 'is-mouseout') &&
      !common.hasClass(fp_root, 'is-splash') &&
      !common.hasClass(fp_root, 'is-seeking') &&
      !common.hasClass(fp_root, 'fixed-controls') &&
      !common.hasClass(fp_root, 'is-mobile-seeking')
    ) {
      return;
    }

    ev.preventDefault();

    if (!disabled) {
      const delayedFire = throttle(fire, 100) as (...args: any[]) => void;
      calc();
      api.dragging = true;
      fire(mousemove(ev));

      domOn(document, 'mousemove.sld touchmove.sld', (e2: Event) => {
        common.addClass(root, 'is-fp-dragging');
        e2.preventDefault();
        delayedFire(mousemove(e2 as MouseEvent | TouchEvent), !!fp_api.video.timeline_vtt);
      });

      domOne(document, 'mouseup.sld touchend.sld', (e2: Event) => {
        if (fp_api.video.timeline_vtt) {
          fire(mousemove(e2 as MouseEvent | TouchEvent));
          setTimeout(() => { api.dragging = false; }, 250);
        } else {
          api.dragging = false;
        }
        common.removeClass(root, 'is-fp-dragging');
        domOff(document, 'mousemove.sld touchmove.sld');
      });
    }
  });

  return api;
}
