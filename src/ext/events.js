export const EVENTS = [
    'beforeseek', 'disable', 'error', 'finish', 'fullscreen', 'fullscreen-exit',
    'load', 'mute', 'pause', 'progress', 'quality', 'ready', 'resume',
    'seek', 'shutdown', 'speed', 'stop', 'unload', 'volume', 'boot',
    'buffer', 'subtitletrack', 'message'
];
export default function setupEvents(api) {
    const handlers = new Map();
    function parseType(raw) {
        const idx = raw.indexOf('.');
        if (idx === -1)
            return { event: raw, ns: '' };
        return { event: raw.substring(0, idx), ns: raw.substring(idx + 1) };
    }
    api.on = function (type, handler) {
        type.split(/\s+/).forEach(t => {
            const { event, ns } = parseType(t);
            if (!handlers.has(event))
                handlers.set(event, []);
            handlers.get(event).push({ ns, fn: handler, once: false });
        });
        return api;
    };
    api.one = function (type, handler) {
        type.split(/\s+/).forEach(t => {
            const { event, ns } = parseType(t);
            if (!handlers.has(event))
                handlers.set(event, []);
            handlers.get(event).push({ ns, fn: handler, once: true });
        });
        return api;
    };
    api.off = function (type) {
        type.split(/\s+/).forEach(t => {
            const { event, ns } = parseType(t);
            if (event) {
                const list = handlers.get(event);
                if (!list)
                    return;
                if (ns) {
                    handlers.set(event, list.filter(h => h.ns !== ns));
                }
                else {
                    handlers.delete(event);
                }
            }
            else if (ns) {
                // Remove all handlers matching a namespace across all events
                for (const [ev, list] of handlers) {
                    handlers.set(ev, list.filter(h => h.ns !== ns));
                }
            }
        });
        return api;
    };
    api.bind = api.on;
    api.unbind = api.off;
    api.trigger = function (type, args, _returnEvent) {
        const { event } = parseType(type);
        const list = handlers.get(event);
        if (!list)
            return api;
        const ev = { type: event, detail: { args: args || [] }, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        const toRemove = [];
        list.forEach((h, i) => {
            try {
                h.fn(ev, ...(args || []));
            }
            catch (e) {
                // eslint-disable-next-line no-console
                console.error('Event handler error for ' + event, e);
            }
            if (h.once)
                toRemove.push(i);
        });
        for (let i = toRemove.length - 1; i >= 0; i--) {
            list.splice(toRemove[i], 1);
        }
        return _returnEvent ? ev : api;
    };
}
const domStore = new WeakMap();
function getStore(el) {
    if (!domStore.has(el))
        domStore.set(el, []);
    return domStore.get(el);
}
export function domOn(el, typeStr, handler) {
    typeStr.split(/\s+/).forEach(t => {
        const idx = t.indexOf('.');
        const event = idx === -1 ? t : t.substring(0, idx);
        const ns = idx === -1 ? '' : t.substring(idx + 1);
        const store = getStore(el);
        store.push({ ns, event, fn: handler, original: handler, once: false });
        el.addEventListener(event, handler);
    });
}
export function domOne(el, typeStr, handler) {
    typeStr.split(/\s+/).forEach(t => {
        const idx = t.indexOf('.');
        const event = idx === -1 ? t : t.substring(0, idx);
        const ns = idx === -1 ? '' : t.substring(idx + 1);
        const store = getStore(el);
        const wrapped = (e) => {
            handler(e);
            el.removeEventListener(event, wrapped);
            const i = store.findIndex(h => h.fn === wrapped);
            if (i !== -1)
                store.splice(i, 1);
        };
        store.push({ ns, event, fn: wrapped, original: handler, once: true });
        el.addEventListener(event, wrapped);
    });
}
export function domOff(el, typeStr) {
    const store = getStore(el);
    if (!typeStr) {
        store.forEach(h => el.removeEventListener(h.event, h.fn));
        domStore.set(el, []);
        return;
    }
    typeStr.split(/\s+/).forEach(t => {
        const idx = t.indexOf('.');
        const event = idx === -1 ? t : t.substring(0, idx);
        const ns = idx === -1 ? '' : t.substring(idx + 1);
        const toRemove = [];
        store.forEach((h, i) => {
            const matchEvent = !event || h.event === event;
            const matchNs = !ns || h.ns === ns;
            if (matchEvent && matchNs) {
                el.removeEventListener(h.event, h.fn);
                toRemove.push(i);
            }
        });
        for (let i = toRemove.length - 1; i >= 0; i--) {
            store.splice(toRemove[i], 1);
        }
    });
}
export function domFire(el, event, args) {
    const customEvent = new CustomEvent(event, { detail: args, bubbles: true });
    el.dispatchEvent(customEvent);
}
/**
 * Event delegation: listen on `el` for events matching `selector`.
 */
export function domDelegate(el, typeStr, selector, handler) {
    domOn(el, typeStr, (e) => {
        const target = e.target.closest(selector);
        if (target && el.contains?.(target)) {
            handler(e, target);
        }
    });
}
