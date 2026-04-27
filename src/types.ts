/**
 * Core type definitions for Freedom Player
 */

export interface VideoSource {
  src: string;
  type: string;
  suffix?: string;
  engine?: string;
  [key: string]: unknown;
}

export interface SubtitleTrack {
  src: string;
  srclang?: string;
  label?: string;
  kind?: string;
  default?: boolean;
  rtl?: boolean;
}

export interface SubtitleEntry {
  title: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface VideoObject {
  src?: string;
  sources?: VideoSource[];
  type?: string;
  title?: string;
  duration?: number;
  time?: number;
  width?: number;
  height?: number;
  url?: string;
  seekable?: number;
  seekOffset?: number;
  buffer?: number;
  loop?: boolean;
  autoplay?: boolean;
  subtitles?: SubtitleTrack[];
  qualities?: QualityOption[];
  quality?: number;
  index?: number;
  is_last?: boolean;
  click?: unknown;
  cuepoints?: Cuepoint[];
  live?: boolean;
  dvr?: boolean;
  hlsQualities?: unknown;
  hlsjs?: Record<string, unknown>;
  timeline_vtt?: boolean;
  fvhkey?: string;
  sources_fvqs?: VideoSource[];
  [key: string]: unknown;
}

export interface QualityOption {
  value: number;
  label: string;
  width?: number;
  height?: number;
}

export interface Cuepoint {
  time: number;
  index: number;
  visible?: boolean;
  subtitle?: SubtitleEntry;
  subtitleEnd?: string;
  [key: string]: unknown;
}

export interface PlayerConf {
  debug: boolean;
  disabled: boolean;
  fullscreen: boolean;
  keyboard: boolean;
  ratio: number;
  adaptiveRatio: boolean;
  rtmp: number;
  proxy: string;
  hlsQualities: boolean | string | Array<number | { level: number; label: string }>;
  seekStep: number | false;
  splash: boolean | string;
  live: boolean;
  livePositionOffset: number;
  speeds: number[];
  tooltip: boolean;
  mouseoutTimeout: number;
  mutedAutoplay: boolean;
  clickToUnMute: boolean;
  volume: number;
  errors: string[];
  errorUrls: string[];
  msg: { click_to_unmute: string; [key: string]: string };
  playlist: VideoObject[];
  disableInline: boolean;
  embed?: Record<string, unknown>;
  clip?: VideoObject;
  poster?: string | boolean;
  loop?: boolean;
  engine?: string;
  enginePreference?: string[];
  autoplay?: boolean;
  muted?: boolean;
  native_fullscreen?: boolean;
  nativesubtitles?: boolean;
  dvr?: boolean;
  generate_cuepoints?: boolean;
  cuepoints?: (Cuepoint | number)[];
  advance?: boolean;
  query?: string;
  active?: string;
  customPlaylist?: boolean;
  chromecast?: Record<string, unknown> | false | '';
  airplay?: boolean;
  skin_preview?: boolean;
  analytics?: string;
  logo?: string;
  hlsjs?: Record<string, unknown>;
  video_cross_origin?: boolean;
  storage?: Storage;
  aspectRatio?: string;
  hlsFix?: boolean;
  hls_cast?: boolean;
  [key: string]: unknown;
}

export interface SupportFlags {
  browser: {
    safari?: boolean;
    chrome?: boolean;
    version?: string;
    [key: string]: unknown;
  };
  iOS: false | {
    iPhone: boolean;
    iPad: boolean;
    version: number;
    chrome: boolean;
  };
  android: false | {
    firefox: boolean;
    opera: boolean;
    samsung: boolean;
    version: number;
  };
  subtitles: boolean;
  fullscreen: boolean;
  touch: boolean;
  dataload: boolean;
  volume: boolean;
  cachedVideoTag: boolean;
  firstframe: boolean;
  inlineVideo: boolean;
  hlsDuration: boolean;
  seekable: boolean;
  video: boolean;
  animation: boolean;
  autoplay: boolean;
  preloadMetadata: boolean;
}

export interface EngineApi {
  engineName: string;
  pick(sources: VideoSource[]): VideoSource | undefined;
  load(video: VideoObject): void;
  pause(): void;
  resume(): void;
  speed(val: number): void;
  seek(time: number): void;
  volume(level: number): void;
  mute(flag: boolean): void;
  unload(): void;
  hls?: HlsInstance | null;
  _listeners?: Record<string, Function[]>;
  _hlsUnloadWrapped?: boolean;
  suspendEngine?(): void;
  resumeEngine?(): void;
}

export interface HlsInstance {
  destroy(): void;
  loadSource(src: string): void;
  attachMedia(el: HTMLVideoElement): void;
  startLoad(): void;
  stopLoad(): void;
  recoverMediaError(): void;
  swapAudioCodec(): void;
  nextLevel: number;
  currentLevel: number;
  liveSyncPosition?: number;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

export interface SliderApi {
  calc(): void;
  max(value: number): void;
  getMax(): number | undefined;
  disable(flag: boolean): void;
  slide(value: number, speed?: number, fireEvent?: boolean): void;
  disableAnimation(value?: boolean, alsoCssAnimations?: boolean): void;
  dragging: boolean;
  value?: number;
}

export interface VolumeSliderApi {
  slide(to: number, trigger?: boolean): void;
  disable(flag: boolean): void;
  dragging: boolean;
}

export interface PlayerApi {
  conf: PlayerConf;
  currentSpeed: number;
  volumeLevel: number;
  video: VideoObject;
  disabled: boolean;
  finished: boolean;
  loading: boolean;
  muted: boolean;
  paused: boolean;
  playing: boolean;
  ready: boolean;
  splash: boolean;
  rtl: boolean;
  error?: boolean;
  was_played?: boolean;
  seeking?: boolean;
  manual_seeking?: boolean;
  manual_pause?: boolean;
  manual_resume?: boolean;
  poster?: boolean;
  isFullscreen?: boolean;
  live?: boolean;
  dvr?: boolean;
  hijacked?: HijackApi | false;
  forcedSplash?: boolean;
  engine: EngineApi;
  subtitles: SubtitleEntry[];
  cuepoints: Cuepoint[];
  sliders?: {
    timeline?: SliderApi;
    volume?: VolumeSliderApi;
  };
  extensions: { js: string[]; css: string[] };
  ui?: { createSubtitleControl?: Function; setActiveSubtitleItem?: Function };
  fv_timeline_chapters_data?: Record<number, Array<{ startTime: number; endTime: number; line: string }>>;

  // Event methods
  on(type: string, handler: (...args: any[]) => void): PlayerApi;
  one(type: string, handler: (...args: any[]) => void): PlayerApi;
  off(type: string): PlayerApi;
  bind(type: string, handler: (...args: any[]) => void): PlayerApi;
  unbind(type: string): PlayerApi;
  trigger(type: string, args?: unknown[], returnEvent?: boolean): PlayerApi;

  // Playback methods
  load(video?: VideoObject | string, callback?: () => void): PlayerApi;
  pause(fn?: () => void): PlayerApi;
  resume(): PlayerApi;
  toggle(): PlayerApi;
  seek(time: number | boolean, callback?: () => void): PlayerApi;
  seekTo(position?: number, fn?: () => void): PlayerApi;
  stop(): PlayerApi;
  unload(): PlayerApi;
  shutdown(): void;
  play(i?: number | VideoObject): PlayerApi;
  next(e?: Event): PlayerApi;
  prev(e?: Event): PlayerApi;

  // Volume / speed
  volume(level: number, skipStore?: boolean): PlayerApi;
  speed(val: number | boolean, callback?: () => void): PlayerApi;
  mute(flag?: boolean, skipStore?: boolean): PlayerApi;

  // Fullscreen
  fullscreen(flag?: boolean): PlayerApi;

  // Misc
  disable(flag?: boolean): PlayerApi;
  is_playlist(): boolean;
  is_last_video(): boolean;
  get_video_index(): number;
  get_video_duration(): number;
  get_video_start(): number;
  get_video_end(): number;
  registerExtension(jsUrls?: string | string[], cssUrls?: string | string[]): void;
  debug(...args: unknown[]): void;
  hijack(hijack: HijackApi): void;
  release(): void;
  hover(flag: boolean): void;
  touch_events(): string;
  message(txt: string, ttl?: number, options?: MessageOptions): () => void;
  textarea(txt: string): void;
  quality(q: number | string): void;

  // Subtitle methods
  showSubtitle?(text: string): void;
  hideSubtitle?(): void;
  loadSubtitles?(i: number): PlayerApi;
  disableSubtitles?(): PlayerApi;

  // Playlist methods
  setPlaylist?(items: VideoObject[], keepCurrentIndex?: boolean): PlayerApi;
  addPlaylistItem?(item: VideoObject): PlayerApi;
  removePlaylistItem?(idx: number): PlayerApi;
  play_next?(video_index: number): void;
  have_visible_playlist?(): boolean;

  // Menu methods
  showMenu?(menu: HTMLElement, triggerElement?: HTMLElement | { left: number; top: number; rightFallbackOffset?: number }): void;
  hideMenu?(menu?: HTMLElement): void;

  // Cuepoint methods
  setCuepoints?(cues: (Cuepoint | number)[]): PlayerApi;
  addCuepoint?(cue: Cuepoint | number): PlayerApi;
  removeCuepoint?(cue: Cuepoint | number): PlayerApi;

  // Chromecast / Airplay
  createChromecastButton?(): void;
  createAirplayButton?(): void;

  // Custom hooks
  get_custom_time?(time: number): number;
  get_custom_duration?(): number;
  get_custom_start?(): number;
  get_custom_end?(): number;
  custom_seek?(time: number): void;
  force_preload?: boolean;

  [key: string]: unknown;
}

export interface HijackApi {
  pause(fn?: () => void): void;
  resume(): void;
  seek(time: number, callback?: () => void): void;
}

export interface MessageOptions {
  className?: string;
  close_on?: string;
}

export type ExtensionFn = (api: PlayerApi, root: HTMLElement) => void;
