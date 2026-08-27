/**
 * HLS.js engine
 *
 * Modernized: Replaced bean with native addEventListener, extend with Object.assign.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import html5factory from './html5-factory';
const support = freedomplayer.support;
function canPlay(type) {
    if (typeof window.Hls === 'undefined')
        return false;
    return /mpegurl/.test(type) && window.Hls.isSupported();
}
const engine = function (player, root) {
    const Hls = window.Hls;
    let lastSelectedLevel;
    let lastSource;
    function hlsjsExt(video, api, engineApi, tryMutedAutoplay) {
        const conf = Object.assign({
            startFragPrefetch: api.preload,
            recoverMediaError: true
        }, player.conf.hlsjs, video.hlsjs);
        if (engineApi.hls)
            engineApi.hls.destroy();
        const hls = engineApi.hls = new Hls(conf);
        if (!engineApi._hlsUnloadWrapped) {
            const originalUnload = engineApi.unload;
            engineApi.unload = function () {
                if (engineApi.hls) {
                    engineApi.hls.destroy();
                    engineApi.hls = null;
                }
                originalUnload.call(engineApi);
            };
            engineApi._hlsUnloadWrapped = true;
        }
        engine.extensions.forEach(ext => {
            ext({ hls, player, root, videoTag: api });
        });
        if (window.FV_Player_Pro && window.fv_player_video_parse &&
            !root.getAttribute('fvhkey') && window.FV_Player_Pro.is_dynamic(video.src)) {
            // do not load anything yet
        }
        else {
            hls.loadSource(video.src);
        }
        engineApi.resume = function () {
            if (player.live && !player.dvr)
                api.currentTime = hls.liveSyncPosition || 0;
            tryMutedAutoplay(api.play());
        };
        engineApi.seek = function (seekTo) {
            try {
                if (player.live || player.dvr) {
                    api.currentTime = Math.min(seekTo, hls.liveSyncPosition || api.duration - (conf.livePositionOffset || 120));
                }
                else {
                    api.currentTime = seekTo;
                }
            }
            catch (e) {
                player.debug('Failed to seek to', seekTo, e);
            }
        };
        if (conf.bufferWhilePaused === false) {
            player.on('pause', () => {
                hls.stopLoad();
                player.one('resume', () => hls.startLoad());
            });
        }
        player.on('quality', (_ev, _api, q) => {
            hls.nextLevel = lastSelectedLevel = q;
        });
        let recoverMediaErrorDate;
        let swapAudioCodecDate;
        const recover = (isNetworkError) => {
            player.debug('hlsjs - recovery');
            common.removeClass(root, 'is-paused');
            common.addClass(root, 'is-seeking');
            api.addEventListener('seeked', () => {
                if (api.paused) {
                    common.removeClass(root, 'is-poster');
                    player.poster = false;
                    api.play();
                }
                common.removeClass(root, 'is-seeking');
            }, { once: true });
            if (isNetworkError) {
                hls.startLoad();
                return;
            }
            const now = performance.now();
            if (!recoverMediaErrorDate || now - recoverMediaErrorDate > 3000) {
                recoverMediaErrorDate = performance.now();
                hls.recoverMediaError();
            }
            else if (!swapAudioCodecDate || now - swapAudioCodecDate > 3000) {
                swapAudioCodecDate = performance.now();
                hls.swapAudioCodec();
                hls.recoverMediaError();
            }
        };
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            const hlsQualities = video.hlsQualities || player.conf.hlsQualities;
            let confQualities;
            const qualityLabels = {};
            const levels = data.levels;
            if (hlsQualities === false) {
                hls.attachMedia(api);
                return;
            }
            if (hlsQualities === 'drive') {
                switch (levels.length) {
                    case 4:
                        confQualities = [1, 2, 3];
                        break;
                    case 5:
                        confQualities = [1, 2, 3, 4];
                        break;
                    case 6:
                        confQualities = [1, 3, 4, 5];
                        break;
                    case 7:
                        confQualities = [1, 3, 5, 6];
                        break;
                    case 8:
                        confQualities = [1, 3, 6, 7];
                        break;
                    default:
                        if (levels.length < 3 || (levels[0].height && levels[2].height && levels[0].height === levels[2].height)) {
                            confQualities = [];
                        }
                        else {
                            confQualities = [1, 2];
                        }
                        break;
                }
            }
            video.qualities = [{ value: -1, label: 'Auto' }];
            if (Array.isArray(hlsQualities)) {
                const confAutoQuality = hlsQualities.find((q) => q === -1 || (q.level && q.level === -1));
                if (!confAutoQuality)
                    video.qualities = [];
                else
                    video.qualities[0].label = typeof confAutoQuality !== 'number' ? confAutoQuality.label : video.qualities[0].label;
                confQualities = hlsQualities.map((q) => {
                    if (typeof q.level !== 'undefined')
                        qualityLabels[q.level] = q.label;
                    return typeof q.level !== 'undefined' ? q.level : q;
                });
            }
            let initialLevel = -2;
            video.qualities = video.qualities.concat(levels.map((level, i) => {
                if (confQualities && confQualities.indexOf(i) === -1)
                    return false;
                let label = qualityLabels[i] || (Math.min(level.width, level.height) + 'p');
                if (!qualityLabels[i] && hlsQualities !== 'drive')
                    label += ' (' + Math.round(level.bitrate / 1000) + 'k)';
                if (i === lastSelectedLevel)
                    initialLevel = i;
                return { value: i, label, width: level.width, height: level.height };
            })).filter(Boolean);
            player.one('ready', () => {
                if (video.qualities.length > 1) {
                    video.width = video.qualities[video.qualities.length - 1].width;
                    video.height = video.qualities[video.qualities.length - 1].height;
                }
            });
            const currentLevel = video.quality = initialLevel === -2 ? video.qualities[0]?.value || -1 : initialLevel;
            if (currentLevel !== hls.currentLevel)
                hls.currentLevel = currentLevel;
            hls.on(Hls.Events.LEVEL_LOADED, () => {
                if (player.preload)
                    player.trigger('ready', [player, video]);
            });
            hls.attachMedia(api);
            if (lastSource && video.src !== lastSource)
                api.play();
            lastSource = video.src;
        });
        hls.on(Hls.Events.ERROR, (_ev, data) => {
            if (!data.fatal)
                return;
            if (conf.recoverNetworkError && data.type === Hls.ErrorTypes.NETWORK_ERROR)
                recover(true);
            else if (conf.recoverMediaError && data.type === Hls.ErrorTypes.MEDIA_ERROR)
                recover(false);
            else {
                let code = 5;
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR)
                    code = 2;
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR)
                    code = 3;
                hls.destroy();
                player.trigger('error', [player, { code }]);
            }
        });
        return {
            handlers: {
                error(e, videoTag) {
                    const errorCode = videoTag.error?.code;
                    if (conf.recoverMediaError && errorCode === 3 || !errorCode) {
                        e.preventDefault();
                        recover(false);
                        return true;
                    }
                    if (conf.recoverNetworkError && errorCode === 2) {
                        e.preventDefault();
                        recover(true);
                        return true;
                    }
                }
            }
        };
    }
    return html5factory('hlsjs-lite', player, root, canPlay, hlsjsExt);
};
engine.canPlay = function (type, conf) {
    if (conf?.hlsjs === false || (conf?.clip && conf.clip.hlsjs === false))
        return false;
    if (support.browser?.safari && !((conf?.clip && conf.clip.hlsjs) || conf?.hlsjs || {}).safari)
        return false;
    return !!support.video && canPlay(type);
};
engine.engineName = 'hlsjs-lite';
engine.extensions = [];
engine.plugin = function (extension) { engine.extensions.push(extension); };
freedomplayer.engines.push(engine);
export default engine;
