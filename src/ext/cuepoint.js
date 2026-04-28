/**
 * Cuepoint extension
 *
 * Modernized: Replaced bean with native addEventListener.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
freedomplayer(function (player, root) {
    const CUE_RE = / ?cue\d+ ?/;
    let cuepointsDisabled = false;
    function setClass(index) {
        root.className = root.className.replace(CUE_RE, ' ');
        if (index !== undefined && index >= 0)
            common.addClass(root, 'cue' + index);
    }
    const segments = {};
    let lastFiredSegment = -0.125;
    const fire = (cue) => {
        setClass(cue.index);
        player.trigger('cuepoint', [player, cue]);
    };
    player.on('progress', (_e, _api, time) => {
        if (cuepointsDisabled)
            return;
        const segment = segmentForCue(time);
        while (lastFiredSegment < segment) {
            lastFiredSegment += 0.125;
            if (!segments[lastFiredSegment])
                continue;
            segments[lastFiredSegment].forEach(fire);
        }
    }).on('unload', () => setClass())
        .on('beforeseek', (ev) => {
        setTimeout(() => {
            if (!ev.defaultPrevented)
                cuepointsDisabled = true;
        });
    }).on('seek', (_ev, _api, time) => {
        setClass();
        lastFiredSegment = segmentForCue(time || 0) - 0.125;
        cuepointsDisabled = false;
        if (!time && segments[0])
            segments[0].forEach(fire);
    }).on('ready', (_e, _api, video) => {
        lastFiredSegment = -0.125;
        const cues = video.cuepoints || player.conf.cuepoints || [];
        player.setCuepoints(cues);
    }).on('finish', () => {
        const segment = segmentForCue(player.video.duration || 0);
        while (lastFiredSegment < segment) {
            lastFiredSegment += 0.125;
            if (!segments[lastFiredSegment])
                continue;
            segments[lastFiredSegment].forEach(fire);
        }
        lastFiredSegment = -0.125;
    });
    if (player.conf.generate_cuepoints) {
        player.bind('load', () => {
            common.find('.fp-cuepoint', root).forEach(common.removeNode);
        });
    }
    player.setCuepoints = function (cues) {
        player.cuepoints = [];
        Object.keys(segments).forEach(k => delete segments[Number(k)]);
        cues.forEach(c => player.addCuepoint(c));
        return player;
    };
    player.addCuepoint = function (cue) {
        if (!player.cuepoints)
            player.cuepoints = [];
        if (typeof cue === 'number')
            cue = { time: cue };
        cue.index = 0;
        const segment = segmentForCue(cue);
        if (!segments[segment])
            segments[segment] = [];
        segments[segment].push(cue);
        if (player.cuepoints.length) {
            cue.index = Math.max(...player.cuepoints.map((c) => c.index || 0)) + 1;
        }
        player.cuepoints.push(cue);
        if (player.conf.generate_cuepoints && cue.visible !== false) {
            const duration = player.video.duration || 0;
            const timeline = common.find('.fp-timeline', root)[0];
            if (timeline) {
                common.css(timeline, 'overflow', 'visible');
                let time = cue.time || 0;
                if (time < 0)
                    time = duration + time;
                const el = common.createElement('button', { className: 'fp-cuepoint fp-cuepoint' + cue.index });
                common.css(el, 'left', (time / duration * 100) + '%');
                timeline.appendChild(el);
                domOn(el, 'mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    player.seek(time);
                });
            }
        }
        return player;
    };
    player.removeCuepoint = function (cue) {
        if (typeof cue === 'number')
            cue = player.cuepoints.filter(c => c.index === cue)[0];
        if (!cue)
            return player;
        const idx = player.cuepoints.indexOf(cue);
        const segment = segmentForCue(cue);
        if (idx === -1)
            return player;
        player.cuepoints = player.cuepoints.slice(0, idx).concat(player.cuepoints.slice(idx + 1));
        const timeline = common.find('.fp-timeline', root)[0];
        if (timeline)
            common.find('.fp-cuepoint' + cue.index, timeline).forEach(common.removeNode);
        const sIdx = segments[segment]?.indexOf(cue);
        if (sIdx !== undefined && sIdx !== -1) {
            segments[segment] = segments[segment].slice(0, sIdx).concat(segments[segment].slice(sIdx + 1));
        }
        return player;
    };
    function segmentForCue(cue) {
        let time = typeof cue !== 'number' && cue && !isNaN(cue.time) ? cue.time : cue;
        if (time < 0)
            time = (player.video.duration || 0) + time;
        return Math.round(time / 0.125) * 0.125;
    }
});
