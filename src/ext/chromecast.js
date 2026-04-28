/**
 * Chromecast extension
 *
 * Modernized: Replaced bean/scriptjs with native APIs.
 */
import freedomplayer from '../freedomplayer';
import * as common from '../common';
import { domOn } from './events';
freedomplayer(function (api, root) {
    if ((false === api.conf.chromecast || '' === api.conf.chromecast) && !api.conf.skin_preview)
        return;
    if (!window.__onGCastApiAvailable) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
        script.async = true;
        document.head.appendChild(script);
        window.__onGCastApiAvailable = function (loaded) {
            if (!loaded)
                return;
            initialize();
        };
    }
    const conf = (api.conf.chromecast || {});
    let isAvailable = false;
    let remotePlayer;
    let remoteController;
    let session;
    let trigger;
    let waitingForSeek = false;
    function initialize() {
        const context = window.cast.framework.CastContext.getInstance();
        context.setOptions({
            receiverApplicationId: conf.applicationId || window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
        context.addEventListener(window.cast.framework.CastContextEventType.CAST_STATE_CHANGED, (event) => {
            if (event.castState === window.cast.framework.CastState.NOT_CONNECTED) {
                session = false;
                if (api.hijacked)
                    destroy();
            }
            if (event.castState !== window.cast.framework.CastState.NO_DEVICES_AVAILABLE) {
                if (isAvailable)
                    return;
                document.dispatchEvent(new CustomEvent('fv_player_chromecast_loaded'));
            }
        });
    }
    api.createChromecastButton = function () {
        common.find('.fp-chromecast', root).forEach(common.removeNode);
        common.find('.fp-chromecast-engine', root).forEach(common.removeNode);
        trigger = common.createElement('button', { 'class': 'fp-chromecast fp-icon', title: 'Play on Cast device' });
        trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="125 40 625 500"><path d="M644 486h37V98H181v83h-55V43h610v498H487v-55h157zm-224-24c6 22 9 44 10 66v13h-54c-1-69-25-128-74-176-48-48-107-73-176-73v-55l29 1a300 300 0 0 1 171 74 304 304 0 0 1 94 150zm-294-79v-34c87-4 192 69 194 192h-55a139 139 0 0 0-139-138v-20zm49 91c22 17 33 39 34 67h-83v-82c18 0 34 5 49 15z"/></svg>';
        const fs = common.find('.fp-fullscreen', root)[0];
        if (fs?.parentNode)
            fs.parentNode.insertBefore(trigger, fs);
        const chromeCastEngine = common.createElement('div', { 'class': 'fp-chromecast-engine' });
        const chromeCastStatus = common.createElement('p', { 'class': 'fp-chromecast-engine-status' });
        const chromeCastIcon = common.createElement('p', { 'class': 'fp-chromecast-engine-icon' });
        chromeCastEngine.appendChild(chromeCastIcon);
        chromeCastEngine.appendChild(chromeCastStatus);
        const engineEl = common.find('.fp-engine', root)[0];
        if (!engineEl)
            common.prepend(common.find('.fp-player', root)[0] || root, chromeCastEngine);
        else
            engineEl.parentNode.insertBefore(chromeCastEngine, engineEl);
    };
    if (api.conf.skin_preview && api.conf.chromecast)
        api.createChromecastButton();
    function destroy() {
        if (remoteController) {
            remoteController.removeEventListener(window.cast.framework.RemotePlayerEventType.ANY_CHANGE, onChromecastEvent);
        }
        api.release?.();
        common.toggleClass(root, 'is-chromecast', false);
        common.toggleClass(trigger, 'fp-active', false);
    }
    document.addEventListener('fv_player_chromecast_loaded', () => {
        isAvailable = true;
        if (getMedia())
            api.createChromecastButton();
        else
            common.removeNode(trigger);
    });
    document.addEventListener('fv_player_chromecast_video_loaded', (e) => {
        if (root.getAttribute('data-freedomplayer-instance-id') !== e.detail) {
            destroy();
            api.trigger('pause', [api]);
        }
    });
    api.bind('ready', () => {
        if (!isAvailable)
            return;
        if (getMedia()) {
            api.createChromecastButton();
            session = window.cast?.framework?.CastContext?.getInstance()?.getCurrentSession();
            if (session) {
                api.one('progress', () => {
                    api.release?.();
                    setTimeout(() => api.pause());
                    api.mute(false, true);
                    loadMedia();
                });
                api.mute(true, true);
            }
        }
        else {
            common.removeNode(trigger);
        }
    });
    domOn(root, api.touch_events(), (ev) => {
        if (!ev.target?.closest('.fp-chromecast'))
            return;
        ev.preventDefault();
        if (session) {
            session.endSession(true);
            session = null;
            destroy();
            api.trigger('pause', [api]);
            if (api.video.time)
                setTimeout(() => api.seek(api.video.time || 0));
            return;
        }
        if (api.playing)
            api.pause();
        window.cast.framework.CastContext.getInstance().requestSession().then(() => { session = window.cast.framework.CastContext.getInstance().getCurrentSession(); loadMedia(); }, (err) => { if ('cancel' !== err)
            console.error('Chromecast session ' + err); });
    });
    function getMedia() {
        let media = false;
        const sources = api.video.sources_fvqs || api.video.sources;
        for (const source of sources || []) {
            if (source.type === 'video/mp4' || source.type === 'video/fv-mp4' || (source.type === 'application/dash+xml' && !source.src.match(/.json/))) {
                media = source;
                break;
            }
        }
        if (!media) {
            for (const source of sources || []) {
                if (source.type === 'application/x-mpegurl') {
                    media = source;
                    break;
                }
            }
        }
        if (api.video.fvhkey && !api.conf.hls_cast)
            return false;
        if (media) {
            let topQuality = false;
            const mp4Qualities = ['fullhd', 'hd', 'md', 'sd'];
            for (const quality of mp4Qualities) {
                const re = new RegExp('-' + quality);
                for (const source of api.video.sources_fvqs || []) {
                    if (source.src.match(re) && source.type === 'video/mp4') {
                        topQuality = source;
                        break;
                    }
                }
                if (topQuality) {
                    media = topQuality;
                    break;
                }
            }
        }
        return media;
    }
    function loadMedia() {
        const media = getMedia();
        if (!media)
            return;
        const receiverName = session.getCastDevice().friendlyName;
        common.html(common.find('.fp-chromecast-engine-status', root)[0], 'Playing on device ' + receiverName);
        const mediaInfo = new window.chrome.cast.media.MediaInfo(media.src, media.type);
        const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
        if (!api.live)
            request.currentTime = api.video.time;
        const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
        castSession.loadMedia(request).then(onMediaDiscovered, (errorCode) => {
            console.log('Chromecast onMediaError: ' + errorCode);
        });
    }
    function onMediaDiscovered() {
        document.dispatchEvent(new CustomEvent('fv_player_chromecast_video_loaded', { detail: root.getAttribute('data-freedomplayer-instance-id') }));
        remotePlayer = new window.cast.framework.RemotePlayer();
        remoteController = new window.cast.framework.RemotePlayerController(remotePlayer);
        remoteController.addEventListener(window.cast.framework.RemotePlayerEventType.ANY_CHANGE, onChromecastEvent);
    }
    function onChromecastEvent(e) {
        if (session && !api.hijacked) {
            common.toggleClass(root, 'is-chromecast', true);
            common.toggleClass(trigger, 'fp-active', true);
            api.hijack?.({
                pause() {
                    if (!remotePlayer.isPaused)
                        remoteController.playOrPause();
                },
                resume() {
                    if (api.finished) {
                        api.release?.();
                        loadMedia();
                        return;
                    }
                    if (remotePlayer.isPaused)
                        remoteController.playOrPause();
                },
                seek(time) {
                    remotePlayer.currentTime = time;
                    remoteController.seek();
                }
            });
        }
        if (e.field === 'currentTime') {
            api.trigger('progress', [api, e.value]);
        }
        else if (e.field === 'playerState') {
            common.toggleClass(root, 'is-loading', e.value === window.chrome.cast.media.PlayerState.BUFFERING);
            if (api.paused && e.value === window.chrome.cast.media.PlayerState.PLAYING)
                api.trigger('resume', [api]);
            else if (api.playing && e.value === window.chrome.cast.media.PlayerState.PAUSED)
                api.trigger('pause', [api]);
            else if (e.value === window.chrome.cast.media.PlayerState.IDLE) {
                api.trigger('pause', [api]);
                api.trigger('finish', [api]);
            }
            if (api.seeking) {
                if (e.value === window.chrome.cast.media.PlayerState.BUFFERING)
                    waitingForSeek = true;
                else if (e.value === window.chrome.cast.media.PlayerState.PLAYING && waitingForSeek) {
                    waitingForSeek = false;
                    api.trigger('seek', [api]);
                }
            }
        }
    }
});
