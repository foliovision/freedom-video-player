/**
 * Common utilities for Freedom Player
 *
 * Modernized: Removed class-list, computed-style, punycode polyfills.
 * All methods now use native DOM APIs available in target browsers.
 */
const $ = window.jQuery;
export const noop = () => { };
export const identity = (i) => i;
export function removeNode(el) {
    if (!el || !el.parentNode)
        return;
    el.parentNode.removeChild(el);
}
export function find(query, ctx) {
    if ($)
        return $(query, ctx).toArray();
    ctx = ctx || document;
    return Array.from(ctx.querySelectorAll(query));
}
export function text(el, txt) {
    el.textContent = txt;
}
export function findDirect(query, ctx) {
    return find(query, ctx).filter(node => node.parentNode === ctx);
}
export function hasClass(el, kls) {
    if (!el || typeof el.className !== 'string')
        return false;
    return el.classList.contains(kls);
}
export function isSameDomain(url) {
    const w = window.location;
    const a = createElement('a', { href: url });
    return w.hostname === a.hostname && w.protocol === a.protocol && w.port === a.port;
}
export function css(el, property, value) {
    if (!el)
        return undefined;
    if (typeof property === 'object') {
        Object.keys(property).forEach(key => {
            css(el, key, property[key]);
        });
        return undefined;
    }
    if (typeof value !== 'undefined') {
        if (value === '') {
            el.style.removeProperty(property);
        }
        else {
            el.style.setProperty(property, value);
        }
        return undefined;
    }
    return window.getComputedStyle(el).getPropertyValue(property);
}
export function createElement(tag, attributes, innerHTML) {
    const el = document.createElement(tag);
    if (attributes) {
        for (const key of Object.keys(attributes)) {
            if (key === 'css') {
                css(el, attributes[key]);
            }
            else {
                attr(el, key, attributes[key]);
            }
        }
    }
    if (innerHTML)
        el.innerHTML = innerHTML;
    return el;
}
export function toggleClass(el, cls, flag) {
    if (!el)
        return;
    if (typeof flag === 'undefined') {
        el.classList.toggle(cls);
    }
    else if (flag) {
        el.classList.add(cls);
    }
    else {
        el.classList.remove(cls);
    }
}
export function addClass(el, cls) {
    toggleClass(el, cls, true);
}
export function removeClass(el, cls) {
    toggleClass(el, cls, false);
}
export function append(par, child) {
    par.appendChild(child);
    return par;
}
export function appendTo(child, par) {
    append(par, child);
    return child;
}
export function prepend(par, child) {
    par.insertBefore(child, par.firstChild);
}
export function insertAfter(par, child, el) {
    if (child === lastChild(par)) {
        par.appendChild(el);
        return;
    }
    const childIndex = Array.prototype.indexOf.call(par.children, child);
    par.insertBefore(el, par.children[childIndex + 1]);
}
export function html(elms, val) {
    const arr = Array.isArray(elms) ? elms : [elms];
    arr.forEach(elm => {
        elm.innerHTML = val;
    });
}
export function attr(el, key, val) {
    if (key === 'class')
        key = 'className';
    if (hasOwnOrPrototypeProperty(el, key)) {
        el[key] = val;
    }
    else {
        if (val === false) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, String(val));
        }
    }
    return el;
}
export function prop(el, key, val) {
    if (typeof val === 'undefined') {
        return el ? el[key] : undefined;
    }
    if (el)
        el[key] = val;
}
export function offset(el) {
    const ret = el.getBoundingClientRect();
    // https://github.com/foliovision/freedom-video-player/issues/757
    if (el.offsetWidth / el.offsetHeight > el.clientWidth / el.clientHeight) {
        return {
            left: ret.left * 100,
            right: ret.right * 100,
            top: ret.top * 100,
            bottom: ret.bottom * 100,
            width: ret.width * 100,
            height: ret.height * 100
        };
    }
    return ret;
}
export function width(el, val) {
    if (val) {
        el.style.width = ('' + val).replace(/px$/, '') + 'px';
        return parseFloat(el.style.width);
    }
    const ret = offset(el).width;
    return typeof ret === 'undefined' ? el.offsetWidth : ret;
}
export function height(el, val) {
    if (val) {
        el.style.height = ('' + val).replace(/px$/, '') + 'px';
        return parseFloat(el.style.height);
    }
    const ret = offset(el).height;
    return typeof ret === 'undefined' ? el.offsetHeight : ret;
}
export function lastChild(el) {
    return el.children[el.children.length - 1];
}
export function hasParent(el, parentSelector) {
    let parent = el.parentElement;
    while (parent) {
        if (typeof parentSelector !== 'string') {
            if (parent === parentSelector)
                return true;
        }
        else {
            if (parent.matches(parentSelector))
                return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
export function createAbsoluteUrl(url) {
    return createElement('a', { href: url }).href;
}
export function xhrGet(url, successCb, errorCb) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState !== 4)
            return;
        if (this.status >= 400)
            return errorCb();
        successCb(this.responseText);
    };
    xhr.open('get', url, true);
    xhr.send();
}
export function pick(obj, props) {
    const ret = {};
    props.forEach(p => {
        if (Object.prototype.hasOwnProperty.call(obj, p))
            ret[p] = obj[p];
    });
    return ret;
}
export function hostname(host) {
    return host || window.location.hostname;
}
function hasOwnOrPrototypeProperty(obj, propName) {
    let o = obj;
    while (o) {
        if (Object.prototype.hasOwnProperty.call(o, propName))
            return true;
        o = Object.getPrototypeOf(o);
    }
    return false;
}
