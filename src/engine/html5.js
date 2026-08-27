/**
 * HTML5 engine
 *
 * Modernized: Uses ES module imports, TypeScript types.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import html5factory from './html5-factory';
const VIDEO = document.createElement('video');
function getType(type) {
    return /mpegurl/i.test(type) ? 'application/x-mpegurl' : type;
}
function canPlay(type) {
    if (!/^(video|application)/i.test(type))
        type = getType(type);
    return !!VIDEO.canPlayType(type).replace('no', '');
}
const engine = function (player, root) {
    return html5factory('html5', player, root, canPlay, (video, api) => {
        if (api.currentSrc !== video.src) {
            common.find('source', api).forEach(common.removeNode);
            api.src = video.src || '';
            api.type = video.type || '';
        }
        else if (video.autoplay) {
            api.load();
        }
        return undefined;
    });
};
engine.canPlay = function (type) {
    return !!freedomplayer.support.video && canPlay(type);
};
engine.engineName = 'html5';
freedomplayer.engines.push(engine);
export default engine;
