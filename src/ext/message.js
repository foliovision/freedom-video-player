/**
 * Message overlay extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn, domOff } from './events';
freedomplayer(function (api, root) {
    const header = common.find('.fp-header', root)[0];
    const ui = common.find('.fp-ui', root)[0];
    api.message = function (txt, ttl, options) {
        const msg = createMessage(txt, options);
        const dismiss = () => {
            common.removeClass(msg, 'fp-shown');
            if (options?.className)
                common.removeClass(root, 'has-' + options.className);
            setTimeout(() => removeMessage(msg), 500);
        };
        if (ttl)
            setTimeout(dismiss, ttl);
        if (options?.close_on) {
            api.one(options.close_on, () => removeMessage(msg));
        }
        return dismiss;
    };
    api.textarea = function (txt) {
        const area = document.createElement('textarea');
        area.value = txt;
        area.className = 'fp-textarea';
        ui.appendChild(area);
        domOn(document, 'click.fptextarea', (ev) => {
            if (ev.target === area) {
                area.select();
                return;
            }
            ev.stopPropagation();
            ev.preventDefault();
            common.removeNode(area);
            domOff(document, 'click.fptextarea');
        });
    };
    function createMessage(txt, options) {
        const msg = common.createElement('div', { className: 'fp-message' }, txt);
        if (options?.className) {
            common.addClass(msg, options.className);
            common.addClass(root, 'has-' + options.className);
        }
        ui.insertBefore(msg, header);
        setTimeout(() => common.toggleClass(msg, 'fp-shown'));
        return msg;
    }
    function removeMessage(msg) {
        common.removeNode(msg);
    }
});
