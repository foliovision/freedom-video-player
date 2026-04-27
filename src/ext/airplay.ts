/**
 * AirPlay extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
import type { PlayerApi } from '../types';

freedomplayer(function (api: PlayerApi, root: HTMLElement) {
  if (!api.conf.airplay && !api.conf.skin_preview) return;

  api.on('ready', () => {
    const el = common.find('video.fp-engine', root)[0] as HTMLVideoElement | undefined;
    if (!el) return;
    el.setAttribute('x-webkit-airplay', 'allow');

    if (!(window as any).WebKitPlaybackTargetAvailabilityEvent) return;
    el.addEventListener('webkitplaybacktargetavailabilitychanged', (ev: any) => {
      if (ev.availability !== 'available' && !freedomplayer.airplay_was_available) return;
      freedomplayer.airplay_was_available = true;
      api.createAirplayButton!();
    });

    el.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
      const trigger = common.find('.fp-airplay', root)[0];
      if (!trigger) return;
      common.toggleClass(trigger, 'fp-active', (el as any).webkitCurrentPlaybackTargetIsWireless);
    });

    api.one('progress', () => {
      const airplay = common.find('.fp-airplay', root)[0] as HTMLElement | undefined;
      if (!airplay) return;
      airplay.style.display = api.engine?.engineName === 'html5' ? 'inline-block' : 'none';
    });
  });

  domOn(root, api.touch_events(), (ev: Event) => {
    const target = (ev.target as HTMLElement)?.closest('.fp-airplay');
    if (!target) return;
    ev.preventDefault();

    if (api.conf.skin_preview) {
      alert('This is just an admin preview for the Airplay button. Normally it will only show up when a video is playing with Safari and the video supports it.');
      return;
    }

    const video = common.find('video.fp-engine', root)[0] as HTMLVideoElement;
    (video as any).webkitShowPlaybackTargetPicker();
  });

  api.createAirplayButton = function (): void {
    common.find('.fp-airplay', root).forEach(common.removeNode);
    const trigger = common.createElement('button', { 'class': 'fp-airplay fp-icon', title: 'Play on AirPlay device' });
    trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M116.364 477.091h279.272L256 337.455z"/><path d="M465.455 34.909H46.545C20.945 34.909 0 55.855 0 81.455v279.273c0 25.6 20.945 46.545 46.545 46.545h93.091v-46.545H46.545V81.455h418.909v279.273h-93.091v46.545h93.091c25.6 0 46.545-20.945 46.545-46.545V81.455c.001-25.6-20.944-46.546-46.544-46.546z"/></svg>';
    const fs = common.find('.fp-fullscreen', root)[0];
    if (fs?.parentNode) fs.parentNode.insertBefore(trigger, fs);
  };

  if (api.conf.skin_preview && api.conf.airplay) api.createAirplayButton!();
});
