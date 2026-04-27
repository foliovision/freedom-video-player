/**
 * Bar slider component (volume bar with discrete bars)
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import * as common from '../../common';
import freedomplayer from '../../freedomplayer';
import { domOn, domOff, domOne, domFire } from '../events';
import type { VolumeSliderApi } from '../../types';

interface BarSliderOpts {
  activeClass?: string;
  inactiveClass?: string;
  childSelector?: string;
  rtl?: boolean;
}

export default function barSlider(root: HTMLElement, opts?: BarSliderOpts): VolumeSliderApi {
  opts = opts || {};
  const activeClass = opts.activeClass || 'fp-color';
  const inactiveClass = opts.inactiveClass || 'fp-grey';
  const childSelector = opts.childSelector || 'em';
  const rtl = !!opts.rtl;
  let disabled = false;

  const totalBars = common.find(childSelector, root).length;

  const api: VolumeSliderApi = {
    dragging: false,
    slide(to: number, trigger?: boolean) {
      common.find(childSelector, root).forEach((bar, idx) => {
        const active = to > idx / totalBars;
        common.toggleClass(bar, activeClass, active);
        common.toggleClass(bar, inactiveClass, !active);
      });
      if (trigger) domFire(root, 'slide', [to]);
    },
    disable(flag: boolean) {
      disabled = flag;
    }
  };

  domOn(root, 'mousedown.sld touchstart.sld', (ev: Event) => {
    ev.preventDefault();
    if (disabled) return;
    api.slide(getMouseValue(ev as MouseEvent | TouchEvent), true);

    const moveTarget = freedomplayer.support.touch ? root : document;
    domOn(moveTarget, 'mousemove.sld touchmove.sld', (ev2: Event) => {
      ev2.preventDefault();
      api.slide(getMouseValue(ev2 as MouseEvent | TouchEvent), true);
    });

    domOne(document, 'mouseup.sld touchend.sld', () => {
      domOff(freedomplayer.support.touch ? root : document, 'mousemove.sld touchmove.sld');
    });
  });

  return api;

  function getMouseValue(ev: MouseEvent | TouchEvent): number {
    let pageX: number | undefined;
    if ('pageX' in ev) {
      pageX = ev.pageX || (ev as MouseEvent).clientX;
    }
    if ('touches' in ev && ev.touches.length) {
      pageX = ev.touches[0].pageX;
    }
    const off = common.offset(root);
    const size = common.width(root);
    let delta = (pageX || 0) - off.left;
    delta = Math.max(0, Math.min(size, delta));
    let value = delta / size;
    if (rtl) value = 1 - value;
    return value;
  }
}
