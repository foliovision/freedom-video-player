/**
 * HTML5 engine
 *
 * Modernized: Uses ES module imports, TypeScript types.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import html5factory from './html5-factory';
import type { PlayerApi, EngineApi, VideoObject, VideoSource } from '../types';

const VIDEO = document.createElement('video');

function getType(type: string): string {
  return /mpegurl/i.test(type) ? 'application/x-mpegurl' : type;
}

function canPlay(type: string): boolean {
  if (!/^(video|application)/i.test(type)) type = getType(type);
  return !!VIDEO.canPlayType(type).replace('no', '');
}

interface HTML5Engine {
  (player: PlayerApi, root: HTMLElement): EngineApi;
  canPlay: (type: string) => boolean;
  engineName: string;
}

const engine: HTML5Engine = function (player: PlayerApi, root: HTMLElement): EngineApi {
  return html5factory('html5', player, root, canPlay, (video: VideoObject, api: HTMLVideoElement) => {
    if (api.currentSrc !== video.src) {
      common.find('source', api).forEach(common.removeNode);
      api.src = video.src || '';
      (api as any).type = video.type || '';
    } else if (video.autoplay) {
      api.load();
    }
    return undefined;
  });
} as HTML5Engine;

engine.canPlay = function (type: string): boolean {
  return !!freedomplayer.support.video && canPlay(type);
};

engine.engineName = 'html5';

freedomplayer.engines.push(engine as any);

export default engine;
