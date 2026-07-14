/**
 * AudioManager — Web Audio API wrapper for spatial fading across three acts.
 *
 * Usage:
 *   const am = new AudioManager();
 *   await am.init();
 *   am.playTimeline(index);   // Act 1 speech clips
 *   am.playCellMonologue();   // Act 2 prison isolation
 *   am.playInauguration();    // Act 3 crowd surge
 */

export interface AudioClip {
  src: string;
  loop?: boolean;
}

const TIMELINE_CLIPS: AudioClip[] = [
  { src: '/assets/audio/rivonia-trial.mp3' },
  { src: '/assets/audio/release-speech.mp3' },
  { src: '/assets/audio/freedom-charter.mp3' },
];

const CELL_CLIP: AudioClip = {
  src: '/assets/audio/cell-monologue.mp3',
  loop: false,
};

const INAUGURATION_CLIP: AudioClip = {
  src: '/assets/audio/inauguration-crowd.mp3',
  loop: false,
};

interface LoadedNode {
  buffer: AudioBuffer;
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private active = new Map<string, LoadedNode>();

  /** Must be called from a user-gesture handler (click/key) to unlock AudioContext. */
  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // Pre-fetch all clips silently so playback is instant
    const allSrcs = [
      ...TIMELINE_CLIPS.map((c) => c.src),
      CELL_CLIP.src,
      INAUGURATION_CLIP.src,
    ];
    await Promise.allSettled(allSrcs.map((s) => this._load(s)));
  }

  // ─── Timeline (Act 1) ────────────────────────────────────────────────────

  playTimeline(index: number, fadeDuration = 1.5): void {
    const clip = TIMELINE_CLIPS[index];
    if (!clip) return;
    this._fadeIn(clip.src, 0.7, fadeDuration, clip.loop);
  }

  stopTimeline(fadeDuration = 1.5): void {
    TIMELINE_CLIPS.forEach((c) => this._fadeOut(c.src, fadeDuration));
  }

  // ─── Cell Monologue (Act 2) ──────────────────────────────────────────────

  playCellMonologue(fadeDuration = 2): void {
    this._fadeIn(CELL_CLIP.src, 0.9, fadeDuration, CELL_CLIP.loop);
  }

  stopCell(fadeDuration = 0.3): void {
    this._fadeOut(CELL_CLIP.src, fadeDuration);
  }

  // ─── Inauguration Surge (Act 3) ──────────────────────────────────────────

  playInauguration(fadeDuration = 0.1): void {
    this._fadeIn(INAUGURATION_CLIP.src, 1.0, fadeDuration, false);
  }

  // ─── Master mute / resume ────────────────────────────────────────────────

  mute(): void {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.3);
  }

  unmute(): void {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(1, this.ctx!.currentTime, 0.3);
  }

  /** Resume suspended AudioContext (browser autoplay policy). */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async _load(src: string): Promise<AudioBuffer | null> {
    if (this.cache.has(src)) return this.cache.get(src)!;
    if (!this.ctx) return null;
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(raw);
      this.cache.set(src, buf);
      return buf;
    } catch {
      // Asset not yet present — graceful no-op
      return null;
    }
  }

  private async _fadeIn(
    src: string,
    targetVol: number,
    duration: number,
    loop = false,
  ): Promise<void> {
    if (!this.ctx || !this.masterGain) return;
    await this.resume();

    // Stop any existing playback for this clip
    this._fadeOut(src, 0.05);

    const buf = await this._load(src);
    if (!buf) return; // asset placeholder — silent no-op

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + duration);
    gainNode.connect(this.masterGain);

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop = !!loop;
    source.connect(gainNode);
    source.start();

    source.onended = () => {
      if (this.active.get(src)?.source === source) {
        this.active.delete(src);
      }
    };

    this.active.set(src, { buffer: buf, source, gainNode });
  }

  private _fadeOut(src: string, duration = 1.5): void {
    const node = this.active.get(src);
    if (!node || !this.ctx) return;
    const { gainNode, source } = node;
    const t = this.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(gainNode.gain.value, t);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);
    setTimeout(() => {
      try { source?.stop(); } catch { /* already stopped */ }
      gainNode.disconnect();
    }, duration * 1000 + 50);
    this.active.delete(src);
  }
}
