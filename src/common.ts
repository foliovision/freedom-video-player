/**
 * Common utilities for Freedom Player
 *
 * Modernized: Removed class-list, computed-style, punycode polyfills.
 * All methods now use native DOM APIs available in target browsers.
 */

const $ = (window as any).jQuery;

export const noop = (): void => {};
export const identity = <T>(i: T): T => i;

export function removeNode(el: Element | null): void {
  if (!el || !el.parentNode) return;
  el.parentNode.removeChild(el);
}

export function find(query: string, ctx?: Element | Document): Element[] {
  if ($) return $(query, ctx).toArray();
  ctx = ctx || document;
  return Array.from(ctx.querySelectorAll(query));
}

export function text(el: Element, txt: string): void {
  el.textContent = txt;
}

export function findDirect(query: string, ctx: Element): Element[] {
  return find(query, ctx).filter(node => node.parentNode === ctx);
}

export function hasClass(el: Element | null, kls: string): boolean {
  if (!el || typeof (el as HTMLElement).className !== 'string') return false;
  return el.classList.contains(kls);
}

export function isSameDomain(url: string): boolean {
  const w = window.location;
  const a = createElement('a', { href: url }) as HTMLAnchorElement;
  return w.hostname === a.hostname && w.protocol === a.protocol && w.port === a.port;
}

export function css(el: HTMLElement | null, property: string | Record<string, string>, value?: string): string | undefined {
  if (!el) return undefined;
  if (typeof property === 'object') {
    Object.keys(property).forEach(key => {
      css(el, key, property[key]);
    });
    return undefined;
  }
  if (typeof value !== 'undefined') {
    if (value === '') {
      el.style.removeProperty(property);
    } else {
      el.style.setProperty(property, value);
    }
    return undefined;
  }
  return window.getComputedStyle(el).getPropertyValue(property);
}

export function createElement(tag: string, attributes?: Record<string, unknown>, innerHTML?: string): HTMLElement {
  const el = document.createElement(tag);
  if (attributes) {
    for (const key of Object.keys(attributes)) {
      if (key === 'css') {
        css(el, attributes[key] as Record<string, string>);
      } else {
        attr(el, key, attributes[key]);
      }
    }
  }
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

export function toggleClass(el: Element | null, cls: string, flag?: boolean): void {
  if (!el) return;
  if (typeof flag === 'undefined') {
    el.classList.toggle(cls);
  } else if (flag) {
    el.classList.add(cls);
  } else {
    el.classList.remove(cls);
  }
}

export function addClass(el: Element | null, cls: string): void {
  toggleClass(el, cls, true);
}

export function removeClass(el: Element | null, cls: string): void {
  toggleClass(el, cls, false);
}

export function append(par: Element, child: Element): Element {
  par.appendChild(child);
  return par;
}

export function appendTo(child: Element, par: Element): Element {
  append(par, child);
  return child;
}

export function prepend(par: Element, child: Element): void {
  par.insertBefore(child, par.firstChild);
}

export function insertAfter(par: Element, child: Element, el: Element): void {
  if (child === lastChild(par)) {
    par.appendChild(el);
    return;
  }
  const childIndex = Array.prototype.indexOf.call(par.children, child);
  par.insertBefore(el, par.children[childIndex + 1]);
}

export function html(elms: Element | Element[], val: string): void {
  const arr = Array.isArray(elms) ? elms : [elms];
  arr.forEach(elm => {
    elm.innerHTML = val;
  });
}

export function attr(el: HTMLElement, key: string, val: unknown): HTMLElement {
  if (key === 'class') key = 'className';
  if (hasOwnOrPrototypeProperty(el, key)) {
    (el as unknown as Record<string, unknown>)[key] = val;
  } else {
    if (val === false) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(val));
    }
  }
  return el;
}

export function prop(el: HTMLElement | null, key: string, val?: unknown): unknown {
  if (typeof val === 'undefined') {
    return el ? (el as unknown as Record<string, unknown>)[key] : undefined;
  }
  if (el) (el as unknown as Record<string, unknown>)[key] = val;
}

export function offset(el: HTMLElement): DOMRect | { left: number; right: number; top: number; bottom: number; width: number; height: number } {
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

export function width(el: HTMLElement, val?: string | number): number {
  if (val) {
    el.style.width = ('' + val).replace(/px$/, '') + 'px';
    return parseFloat(el.style.width);
  }
  const ret = offset(el).width;
  return typeof ret === 'undefined' ? el.offsetWidth : ret;
}

export function height(el: HTMLElement, val?: string | number): number {
  if (val) {
    el.style.height = ('' + val).replace(/px$/, '') + 'px';
    return parseFloat(el.style.height);
  }
  const ret = offset(el).height;
  return typeof ret === 'undefined' ? el.offsetHeight : ret;
}

export function lastChild(el: Element): Element | undefined {
  return el.children[el.children.length - 1];
}

export function hasParent(el: Element, parentSelector: string | Element): boolean {
  let parent = el.parentElement;
  while (parent) {
    if (typeof parentSelector !== 'string') {
      if (parent === parentSelector) return true;
    } else {
      if (parent.matches(parentSelector)) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

export function createAbsoluteUrl(url: string): string {
  return (createElement('a', { href: url }) as HTMLAnchorElement).href;
}

export function xhrGet(url: string, successCb: (text: string) => void, errorCb: () => void): void {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState !== 4) return;
    if (this.status >= 400) return errorCb();
    successCb(this.responseText);
  };
  xhr.open('get', url, true);
  xhr.send();
}

export function pick(obj: Record<string, unknown>, props: string[]): Record<string, unknown> {
  const ret: Record<string, unknown> = {};
  props.forEach(p => {
    if (Object.prototype.hasOwnProperty.call(obj, p)) ret[p] = obj[p];
  });
  return ret;
}

export function hostname(host?: string): string {
  return host || window.location.hostname;
}

function hasOwnOrPrototypeProperty(obj: unknown, propName: string): boolean {
  let o = obj;
  while (o) {
    if (Object.prototype.hasOwnProperty.call(o, propName)) return true;
    o = Object.getPrototypeOf(o);
  }
  return false;
}
