/**
 * VTT/SRT subtitle parser
 */
import type { SubtitleEntry } from '../../types';

const TIMECODE_RE = /^(([0-9]+:){1,2}[0-9]{2}[,.][0-9]{3}) --> (([0-9]+:){1,2}[0-9]{2}[,.][0-9]{3})(.*)/;

function seconds(timecode: string): number {
  const els = timecode.split(':');
  if (els.length === 2) els.unshift('0');
  return Number(els[0]) * 3600 + Number(els[1]) * 60 + parseFloat(els[2].replace(',', '.'));
}

export default function parse(txt: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const lines = txt.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const timecode = TIMECODE_RE.exec(lines[i]);
    if (!timecode) continue;

    const title = lines[i - 1] || '';
    let text = '<p>' + lines[++i] + '</p><br/>';
    while (typeof lines[++i] === 'string' && lines[i].trim() && i < lines.length) {
      text += '<p>' + lines[i] + '</p><br/>';
    }

    entries.push({
      title,
      startTime: seconds(timecode[1]),
      endTime: seconds(timecode[3]),
      text
    });
  }

  return entries;
}
