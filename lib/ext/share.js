'use strict';

var freedomplayer = require('../freedomplayer')
  , common = require('../common')
  , extend = require('extend-object')
  , bean = require('bean');

freedomplayer(function(api, root) {
  var c = api.conf;
  if (c.share === false) {
    common.find('.fp-share', root).forEach(common.removeNode);
    return;
  }

  api.shareUrl = function(directEmbed) {
    if (directEmbed && c.embed && c.embed.iframe) return c.embed.iframe;
    if (typeof api.conf.share === 'string') return api.conf.share;
    return window.location.href;
  };

  var menu = common.createElement('div', { className: 'fp-menu fp-share-menu' }, '<strong>Share</strong>')
    , ui = common.find('.fp-ui', root)[0];
    ui.appendChild(menu);

  var button = common.find('.fp-share', root)[0];

  bean.on(root, 'click', '.fp-share', function(ev) {
    ev.preventDefault();
    if (common.hasClass(menu, 'fp-active')) api.hideMenu();
    else api.showMenu(menu,button);
  });
});
