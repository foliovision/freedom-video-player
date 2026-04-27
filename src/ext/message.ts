/**
 * Message overlay extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff } from './events';
import type { PlayerApi } from '../types';

freedomplayer(function (api: PlayerApi, root: HTMLElement) {
  const header = common.find('.fp-header', root)[0] as HTMLElement;
  const ui = common.find('.fp-ui', root)[0] as HTMLElement;

  api.message = function (txt: string, ttl?: number, options?: { className?: string; close_on?: string }): () => void {
    const msg = createMessage(txt, options);
    const dismiss = () => {
      common.removeClass(msg, 'fp-shown');
      if (options?.className) common.removeClass(root, 'has-' + options.className);
      setTimeout(() => removeMessage(msg), 500);
    };
    if (ttl) setTimeout(dismiss, ttl);
    if (options?.close_on) {
      api.one(options.close_on, () => removeMessage(msg));
    }
    return dismiss;
  };

  api.textarea = function (txt: string): void {
    const area = document.createElement('textarea');
    area.value = txt;
    area.className = 'fp-textarea';
    ui.appendChild(area);
    domOn(document, 'click.fptextarea', (ev: Event) => {
      if (ev.target === area) { area.select(); return; }
      ev.stopPropagation();
      ev.preventDefault();
      common.removeNode(area);
      domOff(document, 'click.fptextarea');
    });
  };

  function createMessage(txt: string, options?: { className?: string }): HTMLElement {
    const msg = common.createElement('div', { className: 'fp-message' }, txt);
    if (options?.className) {
      common.addClass(msg, options.className);
      common.addClass(root, 'has-' + options.className);
    }
    ui.insertBefore(msg, header);
    setTimeout(() => common.toggleClass(msg, 'fp-shown'));
    return msg;
  }

  function removeMessage(msg: HTMLElement): void {
    common.removeNode(msg);
  }
});
