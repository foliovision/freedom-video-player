/**
 * Quality selection extension
 *
 * Modernized: Replaced bean with native addEventListener.
 * Uses <details>/<summary> for the quality menu.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import type { PlayerApi, QualityOption } from '../types';

freedomplayer(function (api: PlayerApi, root: HTMLElement) {
  const ui = common.find('.fp-ui', root)[0] as HTMLElement;
  const controlbar = common.find('.fp-controls', ui)[0] as HTMLElement;

  domOn(root, api.touch_events(), (ev: Event) => {
    const target = ev.target as HTMLElement;
    if (!target) return;

    // Toggle quality menu
    if (target.matches('.fp-qsel') || target.closest('.fp-qsel')) {
      const menu = common.find('.fp-qsel-menu', root)[0] as HTMLElement;
      if (!menu) return;
      if (common.hasClass(menu, 'fp-active')) api.hideMenu!(menu);
      else api.showMenu!(menu);
      return;
    }

    // Quality item clicked
    const qualityItem = target.closest('.fp-qsel-menu [data-quality]') as HTMLElement | null;
    if (qualityItem) {
      const q = qualityItem.getAttribute('data-quality');
      if (q !== null) api.quality(q);
    }
  });

  api.quality = function (q: string | number): void {
    q = isNaN(Number(q)) ? q : Number(q);
    api.trigger('quality', [api, q]);
  };

  api.on('quality', (_ev: unknown, _api: PlayerApi, q: string | number) => {
    selectQuality(q, _api.video.qualities);
  });

  api.on('ready', (_ev: unknown, _api: PlayerApi, video: { qualities?: QualityOption[]; quality?: string | number }) => {
    removeMenu();
    if (!video.qualities || video.qualities.filter(q =>
      typeof q.value !== 'undefined' ? q.value > -1 : true
    ).length < 2) return;
    createMenu(video.qualities);
    selectQuality(video.quality, video.qualities);
  });

  function removeMenu(): void {
    common.find('.fp-qsel-menu', root).forEach(common.removeNode);
    common.find('.fp-qsel', root).forEach(common.removeNode);
  }

  function createMenu(qualities: QualityOption[]): void {
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

  function selectQuality(quality: string | number | undefined, _qualities?: QualityOption[]): void {
    common.find('.fp-qsel-menu button[data-quality]', root).forEach(el => {
      common.toggleClass(el, 'fp-selected', el.getAttribute('data-quality') == String(quality));
      common.toggleClass(el, 'fp-color', el.getAttribute('data-quality') == String(quality));
    });
  }
});
