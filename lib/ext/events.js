'use strict';
/**
 * Mimimal jQuery-like event emitter implementation
 */

// Native lifecycle event names must not be used with addEventListener
// (Permissions-Policy: unload=() triggers console violations).
var EVENT_ALIASES = {
  unload: 'fp:unload'
};

var domEventName = function(type) {
  return EVENT_ALIASES[type] || type;
};

// Aliased events use a different DOM type (e.g. fp:unload) but handlers
// and plugins still expect the public name (e.g. unload) on e.type.
var asPublicEvent = function(ev, publicType) {
  if (ev.type === publicType) return ev;
  var e = { type: publicType };
  ['target', 'currentTarget', 'timeStamp', 'defaultPrevented'].forEach(function(k) {
    e[k] = ev[k];
  });
  e.preventDefault = function() { return ev.preventDefault(); };
  e.stopPropagation = function() { return ev.stopPropagation(); };
  return e;
};

module.exports = function(obj, elem) {
  if (!elem) elem = document.createElement('div'); //In this case we always want to trigger (Custom)Events on dom element
  var handlers = {}, eventArguments = {};

  var listenEvent = function(type, hndlr, disposable) {
    var actualEvent = type.split('.')[0]; //Strip namespace
    var domEvent = domEventName(actualEvent);
    var internalHandler = function(ev) {
      if (disposable) {
        elem.removeEventListener(domEvent, internalHandler);
        handlers[type].splice(handlers[type].indexOf(internalHandler), 1);
      }
      var userEv = asPublicEvent(ev, actualEvent);
      var args = [userEv].concat(eventArguments[ev.timeStamp + ev.type] || []);
      if (hndlr) hndlr.apply(undefined, args);
    };
    elem.addEventListener(domEvent, internalHandler);

    //Store handlers for unbinding
    if (!handlers[type]) handlers[type] = [];
    handlers[type].push(internalHandler);
  };

  obj.on = obj.bind = function(typ, hndlr) {
    var types = typ.split(' ');
    types.forEach(function(type) {
      listenEvent(type, hndlr);
    });
    return obj; //for chaining
  };

  obj.one = function(typ, hndlr) {
    var types = typ.split(' ');
    types.forEach(function(type) {
      listenEvent(type, hndlr, true);
    });
    return obj;
  };

  // Function to check if all items in toBeContained array are in the containing array
  var containsAll = function(containing, toBeContained) {
    return toBeContained.filter(function(i) {
      return containing.indexOf(i) === -1;
    }).length === 0;
  };


  obj.off = obj.unbind = function(typ) {
    var types = typ.split(' ');
    types.forEach(function(type) {
      var typeNameSpaces = type.split('.').slice(1),
          actualType = type.split('.')[0];
      Object.keys(handlers).filter(function(t) {
        var handlerNamespaces = t.split('.').slice(1);
        return (!actualType || t.indexOf(actualType) === 0) && containsAll(handlerNamespaces, typeNameSpaces);
      }).forEach(function(t) {
        var registererHandlers = handlers[t],
            actualEvent = t.split('.')[0];
        handlers[t] = registererHandlers.filter(function(hndlr) {
          elem.removeEventListener(domEventName(actualEvent), hndlr);
          return false;
        });
      });
    });
    return obj;
  };

  obj.trigger = function(typ, args, returnEvent) {
    if (!typ) return;
    args = (args || []).length ? args || [] : [args];
    var event = document.createEvent('Event'), typStr;
    typStr = typ.type || typ;
    var domType = domEventName(typStr);
    event.initEvent(domType, false, true);
    if (Object.defineProperty) event.preventDefault = function() {
      Object.defineProperty(this, 'defaultPrevented', { get: function() { return true; } });
    };
    eventArguments[event.timeStamp + domType] = args;
    elem.dispatchEvent(event);
    return returnEvent ? asPublicEvent(event, typStr) : obj;
  };
};


module.exports.EVENTS = [
  'beforeseek',
  'disable',
  'error',
  'finish',
  'fullscreen',
  'fullscreen-exit',
  'load',
  'mute',
  'pause',
  'progress',
  'ready',
  'resume',
  'seek',
  'speed',
  'stop',
  'unload',
  'volume',
  'boot',
  'shutdown'
];
