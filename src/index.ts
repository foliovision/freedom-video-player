/**
 * Freedom Player — entry point
 *
 * All extensions and engines are imported and registered.
 */
import freedomplayer from './freedomplayer';

// Support needed before engines
import './ext/support';

// Engines
import './engine/hlsjs';
import './engine/html5';

// Extensions
import './ext/ui';
import './ext/message';
import './ext/keyboard';
import './ext/playlist';
import './ext/cuepoint';
import './ext/subtitle';
import './ext/analytics';
import './ext/airplay';
import './ext/chromecast';
import './ext/qsel';
import './ext/menu';

// Have to add fullscreen last
import './ext/fullscreen';

import './ext/mobile';

// Compatibility bridge with flowplayer
if (typeof (window as any).flowplayer === 'undefined') {
  (window as any).flowplayer = freedomplayer;

  if (typeof (window as any).jQuery !== 'undefined') {
    (window as any).jQuery.fn.flowplayer = (window as any).jQuery.fn.freedomplayer;
  }
}

export default freedomplayer;
