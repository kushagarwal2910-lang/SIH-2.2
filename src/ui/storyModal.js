import { SCIENCE_STORIES } from '../engine/storyEngine.js';

export class StoryModal {
  static isAudioMuted = false;
  static currentUtterance = null;
  static audioCtx = null;
  static ambientGain = null;

  static initAudio() {
    if (!StoryModal.audioCtx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        StoryModal.audioCtx = new AudioContext();

        // Synthesize gentle deep-sea oceanic hydrophone rumble
        const bufferSize = StoryModal.audioCtx.sampleRate * 2;
        const noiseBuffer = StoryModal.audioCtx.createBuffer(1, bufferSize, StoryModal.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = StoryModal.audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = StoryModal.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, StoryModal.audioCtx.currentTime);

        StoryModal.ambientGain = StoryModal.audioCtx.createGain();
        StoryModal.ambientGain.gain.setValueAtTime(StoryModal.isAudioMuted ? 0 : 0.04, StoryModal.audioCtx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(StoryModal.ambientGain);
        StoryModal.ambientGain.connect(StoryModal.audioCtx.destination);
        whiteNoise.start(0);
      } catch (e) {
        console.warn('Web Audio Context not initialized:', e);
      }
    } else if (StoryModal.audioCtx.state === 'suspended') {
      StoryModal.audioCtx.resume();
    }
  }

  static speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (StoryModal.isAudioMuted) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => v.lang.includes('en-IN') || v.name.includes('India') || v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      StoryModal.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }

  static stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (StoryModal.ambientGain && StoryModal.audioCtx) {
      StoryModal.ambientGain.gain.setValueAtTime(0, StoryModal.audioCtx.currentTime);
    }
  }

  static show(onSelectStory) {
    const modalRoot = document.getElementById('modal-container');

    modalRoot.innerHTML = `
      <div id="story-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
        <div class="relative w-full max-w-2xl rounded-2xl glass-panel p-4 sm:p-6 text-white shadow-2xl border border-slate-700 max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800 shrink-0">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-lg sm:text-xl">
                🎓
              </div>
              <div>
                <h3 class="font-bold text-xs sm:text-sm tracking-wide text-white">Public Outreach & Science Communication</h3>
                <p class="text-[10px] sm:text-[11px] text-slate-400">Interactive 3D guided tours with voice narration for schools, colleges & exhibitions</p>
              </div>
            </div>
            <button id="btn-close-story" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-base sm:text-lg">
              ✕
            </button>
          </div>

          <!-- Story Cards List -->
          <div class="grid grid-cols-1 gap-3 my-4 max-h-[60vh] overflow-y-auto pr-1">
            ${SCIENCE_STORIES.map(
              (story) => `
              <div data-story-id="${story.id}" class="story-card p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer flex flex-col justify-between group shadow-lg">
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">${story.badge}</span>
                    <span class="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <span>🎧 Audio Guided</span> • ${story.steps.length} Chapters
                    </span>
                  </div>
                  <h4 class="font-bold text-slate-100 group-hover:text-cyan-300 transition text-sm">${story.title}</h4>
                  <p class="text-slate-400 text-xs mt-1 leading-relaxed">${story.summary}</p>
                </div>
                <div class="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <span class="text-slate-500 font-mono">📍 ${story.region}</span>
                  <span class="font-semibold text-cyan-400 flex items-center gap-1">Start Audio Tour ➔</span>
                </div>
              </div>`
            ).join('')}
          </div>

        </div>
      </div>
    `;

    const closeStory = () => {
      modalRoot.innerHTML = '';
    };

    document.getElementById('btn-close-story').addEventListener('click', closeStory);
    document.getElementById('story-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'story-backdrop') closeStory();
    });

    modalRoot.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-story-id');
        const selected = SCIENCE_STORIES.find((s) => s.id === id);
        closeStory();
        StoryModal.initAudio();
        if (onSelectStory && selected) onSelectStory(selected);
      });
    });
  }

  static renderStoryHUD(story, stepIdx, onNext, onPrev, onExit) {
    const hudContainer = document.getElementById('story-hud-container');
    if (!hudContainer) return;

    const step = story.steps[stepIdx];
    const isFirst = stepIdx === 0;
    const isLast = stepIdx === story.steps.length - 1;

    hudContainer.innerHTML = `
      <div class="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-2.5 sm:px-4 animate-fadeIn">
        <div class="glass-panel rounded-2xl p-3.5 sm:p-5 text-white shadow-2xl border border-cyan-500/40 relative">
          
          <!-- Top Bar with Chapter & Audio Controls -->
          <div class="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">${story.badge}</span>
              <span class="font-mono text-slate-400 text-[10px] sm:text-[11px]">Chapter ${stepIdx + 1}/${story.steps.length}</span>
            </div>
            
            <!-- Audio Voice & Equalizer -->
            <div class="flex items-center gap-2">
              <canvas id="audio-eq-canvas" width="40" height="14" class="block rounded bg-slate-950/80 px-1"></canvas>
              <button id="btn-toggle-voice" title="Toggle Voice Narration" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono border border-slate-700 cursor-pointer">
                ${StoryModal.isAudioMuted ? '🔇 Unmute' : '🔊 Voice On'}
              </button>
              <button id="btn-exit-story" class="text-slate-400 hover:text-white p-1 transition cursor-pointer">✕ Exit</button>
            </div>
          </div>

          <!-- Chapter Title & Narration -->
          <div class="my-3">
            <h3 class="font-bold text-base text-cyan-300 mb-1">${step.title}</h3>
            <p id="narration-text" class="text-xs text-slate-200 leading-relaxed font-normal">${step.narration}</p>
          </div>

          <!-- Bottom Navigation Buttons -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-medium">
            <button id="btn-prev-step" ${isFirst ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:text-cyan-300 cursor-pointer transition flex items-center gap-1"'} >
              ⬅ Previous
            </button>
            <div class="flex gap-1">
              ${story.steps.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === stepIdx ? 'bg-cyan-400' : 'bg-slate-700'}"></span>`).join('')}
            </div>
            <button id="btn-next-step" class="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1">
              ${isLast ? 'Complete Tour ✓' : 'Next Chapter ➔'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Speak narration
    StoryModal.speak(step.narration);

    // Equalizer animation
    const eqCanvas = document.getElementById('audio-eq-canvas');
    if (eqCanvas) {
      const ctx = eqCanvas.getContext('2d');
      let frame = 0;
      const drawEq = () => {
        if (!document.getElementById('audio-eq-canvas')) return;
        ctx.clearRect(0, 0, 40, 14);
        ctx.fillStyle = StoryModal.isAudioMuted ? '#64748b' : '#38bdf8';
        frame++;
        for (let i = 0; i < 4; i++) {
          const h = StoryModal.isAudioMuted ? 2 : 3 + Math.abs(Math.sin(frame * 0.15 + i)) * 9;
          ctx.fillRect(i * 9 + 3, 14 - h, 5, h);
        }
        requestAnimationFrame(drawEq);
      };
      drawEq();
    }

    // Bind event handlers
    document.getElementById('btn-exit-story').addEventListener('click', () => {
      StoryModal.stopAudio();
      hudContainer.innerHTML = '';
      if (onExit) onExit();
    });

    document.getElementById('btn-toggle-voice').addEventListener('click', () => {
      StoryModal.isAudioMuted = !StoryModal.isAudioMuted;
      const btn = document.getElementById('btn-toggle-voice');
      btn.textContent = StoryModal.isAudioMuted ? '🔇 Unmute' : '🔊 Voice On';
      if (StoryModal.isAudioMuted) {
        window.speechSynthesis.cancel();
        if (StoryModal.ambientGain && StoryModal.audioCtx) {
          StoryModal.ambientGain.gain.setValueAtTime(0, StoryModal.audioCtx.currentTime);
        }
      } else {
        if (StoryModal.ambientGain && StoryModal.audioCtx) {
          StoryModal.ambientGain.gain.setValueAtTime(0.04, StoryModal.audioCtx.currentTime);
        }
        StoryModal.speak(step.narration);
      }
    });

    document.getElementById('btn-next-step').addEventListener('click', () => {
      if (isLast) {
        StoryModal.stopAudio();
        hudContainer.innerHTML = '';
        if (onExit) onExit();
      } else {
        if (onNext) onNext();
      }
    });

    const prevBtn = document.getElementById('btn-prev-step');
    if (!isFirst && prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (onPrev) onPrev();
      });
    }
  }
}
