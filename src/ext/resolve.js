export const TYPE_RE = /\.(\w{3,4})(\?.*)?$/i;
function getType(typ) {
    if (/mpegurl/i.test(typ))
        return 'application/x-mpegurl';
    return 'video/' + typ;
}
export default class URLResolver {
    sourcesFromVideoTag(videoTag, $) {
        const sources = [];
        $('source', videoTag).each(function () {
            sources.push(parseSource($(this)));
        });
        if (!sources.length && videoTag.length)
            sources.push(parseSource(videoTag));
        return sources;
    }
    resolve(video, sources) {
        if (!video)
            return { sources: sources || [] };
        if (typeof video === 'string') {
            const src = video;
            return {
                src,
                sources: (sources || []).map(source => {
                    const suffix = source.src.split(TYPE_RE)[1];
                    return { type: source.type, src: src.replace(TYPE_RE, '.' + suffix + '$2') };
                })
            };
        }
        if (Array.isArray(video)) {
            return {
                sources: video.map(item => {
                    if (item.type && item.src)
                        return item;
                    return Object.keys(item).reduce((m, typ) => {
                        return Object.assign(m, { type: getType(typ), src: item[typ] });
                    }, {});
                })
            };
        }
        return video;
    }
}
function parseSource(el) {
    const src = el.attr('src') || '';
    let type = el.attr('type') || '';
    const suffix = src.split(TYPE_RE)[1] || '';
    type = type.toLowerCase();
    return Object.assign({}, el.data(), { src, suffix: suffix || type, type: type || suffix });
}
