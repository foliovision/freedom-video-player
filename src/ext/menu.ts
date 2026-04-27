/**
 * Menu extension — showMenu / hideMenu for legacy callers.
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOne } from './events';
import type { PlayerApi } from '../types';

freedomplayer(function (api: PlayerApi, root: HTMLElement) {
  api.showMenu = function (menu: HTMLElement, triggerElement?: HTMLElement | { left: number; top: number; rightFallbackOffset?: number }): void {
    const ui = common.find('.fp-ui', root)[0] as HTMLElement;
    common.toggleClass(menu, 'fp-active', true);
    setTimeout(() => {
      domOne(document, api.touch_events(), () => api.hideMenu!(menu));
    });
    let coordinates = triggerElement as { left: number; top: number; rightFallbackOffset?: number } | undefined;
    if (triggerElement && (triggerElement as HTMLElement).tagName) {
      const el = triggerElement as HTMLElement;
      coordinates = {
        left: common.offset(el).left,
        rightFallbackOffset: common.width(el),
        top: common.offset(el).top + common.height(el)
      };
    }
    if (!coordinates) { common.css(menu, 'top', 'auto'); return; }
    coordinates.rightFallbackOffset = coordinates.rightFallbackOffset || 0;
    let top = coordinates.top - common.offset(ui).top;
    let left = coordinates.left - common.offset(ui).left;
    if (common.width(menu) + left > common.width(ui)) left = left - common.width(menu) + coordinates.rightFallbackOffset;
    if (common.height(menu) + top > common.height(ui)) top = top - common.height(menu);
    common.css(menu, { top: top + 'px', left: left + 'px', right: 'auto' });
  };

  api.hideMenu = function (menu: HTMLElement): void {
    setTimeout(() => {
      common.toggleClass(menu, 'fp-active', false);
      common.css(menu, { top: '-9999em' });
    }, 60);
  };
});
