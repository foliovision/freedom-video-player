var freedomplayer = require('../freedomplayer')
  , common = require('../common')
  , bean = require('bean');
freedomplayer(function(api, root) {
  var header = common.find('.fp-header', root)[0]
    , ui = common.find('.fp-ui', root)[0];

  /**
   * Create a message
   * @param {string} txt - The text of the message
   * @param {number} ttl - The time to live for the message
   * @param {Object} options - The options for the message, accepts className
   * @returns {Function} - The function to dismiss the message
   */
  api.message = function(txt, ttl, options) {
    var msg = createMessage(txt, options);
    var dismiss = function() {
      common.removeClass(msg, 'fp-shown');
      if ( options && options.className ) {
        common.removeClass(root, 'has-' + options.className);
      }
      setTimeout(function() { removeMessage(msg); }, 500);
    };
    if (ttl) setTimeout(dismiss, ttl);
    return dismiss;
  }

  api.textarea = function(txt) {
    var area = document.createElement('textarea');
    area.value = txt;
    area.className = 'fp-textarea';
    ui.appendChild(area);
    bean.on(document, 'click.fptextarea', function(ev) {
      if (ev.target === area) return area.select();
      ev.stopPropagation();
      ev.preventDefault();
      common.removeNode(area);
      bean.off(document, 'click.fptextarea');
    });
  }

  /**
   * Create a message
   *
   * @param {string} txt - The text of the message
   * @param {Object} options - The options for the message, accepts className
   * @returns {Element} - The message element
   */
  function createMessage(txt, options) {
    var msg = common.createElement('div', {
      className: 'fp-message'
    }, txt);
    if (options && options.className) {
      common.addClass(msg, options.className);
      common.addClass(root, 'has-' + options.className);
    }
    ui.insertBefore(msg, header);
    setTimeout(function() { common.toggleClass(msg, 'fp-shown'); });
    return msg;
  }

  function removeMessage(msg) {
    common.removeNode(msg);
  }
});
