export class TimelinePlayer {
  constructor(container, timeSteps = [], onTimeChange) {
    this.container = container;
    this.timeSteps = timeSteps;
    this.onTimeChange = onTimeChange;
    this.currentIdx = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1200; // ms
    this.timer = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl px-5 py-2.5 rounded-full border border-slate-700/80 shadow-2xl select-none">
        <!-- Step Back -->
        <button id="btn-prev" class="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer" title="Previous Step">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>

        <!-- Play / Pause -->
        <button id="btn-play" class="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full text-xs transition shadow-md cursor-pointer transform active:scale-95">
          <svg id="play-icon" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span id="play-text">Play</span>
        </button>

        <!-- Step Next -->
        <button id="btn-next" class="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer" title="Next Step">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>

        <!-- Timeline Scrubber Range -->
        <div class="flex items-center gap-2 pl-3 border-l border-slate-700">
          <input id="slider-timeline" type="range" min="0" max="${Math.max(0, this.timeSteps.length - 1)}" value="0" class="w-28 sm:w-40 accent-cyan-400 cursor-pointer">
        </div>

        <!-- Timestamp readout -->
        <div class="flex flex-col font-mono text-left pl-3 border-l border-slate-700 min-w-[130px]">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-slate-400">Step:</span>
            <span id="label-step" class="text-cyan-400 font-bold text-xs">1 / ${this.timeSteps.length}</span>
          </div>
          <span id="label-timestamp" class="text-[9px] text-slate-300 font-semibold truncate">
            ${this.formatTime(this.timeSteps[0])}
          </span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  formatTime(isoStr) {
    if (!isoStr) return '2026-09-01 00:00 UTC';
    try {
      const d = new Date(isoStr);
      return d.toUTCString().replace('GMT', 'UTC');
    } catch {
      return isoStr;
    }
  }

  bindEvents() {
    const playBtn = this.container.querySelector('#btn-play');
    const playIcon = this.container.querySelector('#play-icon');
    const playText = this.container.querySelector('#play-text');

    playBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        playBtn.className = 'flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-full text-xs transition shadow-md cursor-pointer transform active:scale-95';
        playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        playText.textContent = 'Pause';
        this.timer = setInterval(() => {
          this.setStep((this.currentIdx + 1) % this.timeSteps.length);
        }, this.playbackSpeed);
      } else {
        playBtn.className = 'flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full text-xs transition shadow-md cursor-pointer transform active:scale-95';
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        playText.textContent = 'Play';
        clearInterval(this.timer);
      }
    });

    this.container.querySelector('#btn-prev').addEventListener('click', () => {
      this.setStep(Math.max(0, this.currentIdx - 1));
    });

    this.container.querySelector('#btn-next').addEventListener('click', () => {
      this.setStep((this.currentIdx + 1) % this.timeSteps.length);
    });

    this.container.querySelector('#slider-timeline').addEventListener('input', (e) => {
      this.setStep(parseInt(e.target.value));
    });
  }

  setStep(idx) {
    this.currentIdx = idx;
    const stepLabel = this.container.querySelector('#label-step');
    const timeLabel = this.container.querySelector('#label-timestamp');
    const slider = this.container.querySelector('#slider-timeline');

    if (stepLabel) stepLabel.textContent = `${this.currentIdx + 1} / ${this.timeSteps.length}`;
    if (timeLabel) timeLabel.textContent = this.formatTime(this.timeSteps[this.currentIdx]);
    if (slider) slider.value = this.currentIdx;

    if (this.onTimeChange) this.onTimeChange(this.currentIdx);
  }
}
