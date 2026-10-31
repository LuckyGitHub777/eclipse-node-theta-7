(() => {
  "use strict";

  const VERSION = "1.2.1";
  const QUESTIONS = Object.freeze([
    "What did you directly observe?",
    "What supports your interpretation?",
    "What else could explain what repeats?",
    "What would change your mind?",
    "Does this reduce harm and unnecessary fear?",
    "Can you pause, decline, or choose differently?",
    "What small, reversible step comes next?"
  ]);

  const MODES = Object.freeze({
    observe: Object.freeze({
      label: "Observe",
      summary: "Sit with the image at your own pace.",
      initial: "Look at the center. Notice what you see, feel, and assume."
    }),
    prompts: Object.freeze({
      label: "7 Prompts",
      summary: "Move through seven questions at your own pace.",
      initial: "Start when you are ready for the first question."
    }),
    breathe: Object.freeze({
      label: "Breathe",
      summary: "Follow seven guided breaths. About 90 seconds.",
      initial: "Settle your posture and breathe naturally before you begin."
    })
  });

  const PHASES = Object.freeze([
    Object.freeze({ label: "Inhale", seconds: 4, tone: 136 }),
    Object.freeze({ label: "Hold gently", seconds: 2, tone: 158 }),
    Object.freeze({ label: "Exhale", seconds: 6, tone: 122 })
  ]);

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const elements = {
    app: document.body,
    sigilWrap: $("#sigilWrap"),
    sessionStatus: $("#sessionStatus"),
    modeLabel: $("#modeLabel"),
    modeSummary: $("#modeSummary"),
    progressText: $("#progressText"),
    progressTrack: $("#progressTrack"),
    progressBar: $("#progressBar"),
    progressFill: $("#progressFill"),
    transmission: $("#transmission"),
    startBtn: $("#startBtn"),
    resetBtn: $("#resetBtn"),
    nextBtn: $("#nextBtn"),
    audioBtn: $("#audioBtn"),
    motionBtn: $("#motionBtn"),
    volumeControl: $("#volumeControl"),
    volumeSlider: $("#volumeSlider"),
    volumeOutput: $("#volumeOutput"),
    breathGuide: $("#breathGuide"),
    breathState: $("#breathState"),
    breathCount: $("#breathCount"),
    journal: $("#journal"),
    saveBtn: $("#saveBtn"),
    exportBtn: $("#exportBtn"),
    clearBtn: $("#clearBtn"),
    saveStatus: $("#saveStatus"),
    modeButtons: $$('[data-mode]')
  };

  const state = {
    mode: "observe",
    status: "ready",
    promptIndex: 0,
    cycleIndex: 0,
    phaseIndex: 0,
    phaseRemaining: PHASES[0].seconds,
    breathTimer: null,
    clearConfirmTimer: null,
    audioOn: false,
    motionOff: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    volume: Number(elements.volumeSlider.value) / 100,
    audioContext: null,
    masterGain: null,
    oscillators: new Set()
  };

  const storageKey = "theta7.reflection.v1.2";
  const previousStorageKey = "theta7.integrationJournal.v1.1";
  const fallbackStore = new Map();

  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); }
      catch { return fallbackStore.get(key) ?? null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); }
      catch { fallbackStore.set(key, value); }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); }
      catch { fallbackStore.delete(key); }
    }
  };

  function buildSigil() {
    const center = 350;
    const radius = 287;
    const points = Array.from({ length: 7 }, (_, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / 7);
      return {
        x: center + Math.cos(angle) * radius,
        y: center + Math.sin(angle) * radius
      };
    });

    const traversal = [0, 3, 6, 2, 5, 1, 4, 0];
    const path = traversal
      .map((index, position) => `${position === 0 ? "M" : "L"} ${points[index].x.toFixed(2)} ${points[index].y.toFixed(2)}`)
      .join(" ");

    $("#heptagram").setAttribute("d", path);
    $("#heptagramGlow").setAttribute("d", path);

    const namespace = "http://www.w3.org/2000/svg";
    const nodeLines = $("#nodeLines");
    const nodes = $("#nodes");

    points.forEach((point, index) => {
      const line = document.createElementNS(namespace, "line");
      line.setAttribute("x1", center);
      line.setAttribute("y1", center);
      line.setAttribute("x2", point.x);
      line.setAttribute("y2", point.y);
      line.setAttribute("stroke", index % 2 ? "#9c5cff" : "#f1c36b");
      line.setAttribute("stroke-width", "1");
      nodeLines.appendChild(line);

      const group = document.createElementNS(namespace, "g");
      group.classList.add("theta-node");

      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", "14");
      circle.setAttribute("fill", "#090512");
      circle.setAttribute("stroke", "#f1c36b");
      circle.setAttribute("stroke-width", "2");

      const dot = document.createElementNS(namespace, "circle");
      dot.setAttribute("cx", point.x);
      dot.setAttribute("cy", point.y);
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "#9c5cff");

      group.append(circle, dot);
      nodes.appendChild(group);
    });
  }

  function ensureAudio() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      state.audioContext = new AudioContext();
      state.masterGain = state.audioContext.createGain();
      state.masterGain.gain.value = state.volume;
      state.masterGain.connect(state.audioContext.destination);
    }
    if (state.audioContext.state === "suspended") state.audioContext.resume();
    return true;
  }

  function tone(frequency = 174, duration = 0.28) {
    if (!state.audioOn || !ensureAudio()) return;

    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, state.audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(state.masterGain);
    state.oscillators.add(oscillator);
    oscillator.addEventListener("ended", () => state.oscillators.delete(oscillator), { once: true });
    oscillator.start();
    oscillator.stop(state.audioContext.currentTime + duration + 0.03);
  }

  function stopAllAudio() {
    state.oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
    });
    state.oscillators.clear();
    if (state.audioContext?.state === "running") state.audioContext.suspend();
  }

  function clearTimers() {
    window.clearInterval(state.breathTimer);
    state.breathTimer = null;
  }

  function setStatus(status) {
    const labels = {
      ready: "Ready",
      active: "In progress",
      paused: "Paused",
      complete: "Complete"
    };

    state.status = status;
    elements.sessionStatus.textContent = labels[status];
    elements.sessionStatus.className = `status-chip ${status === "active" ? "active" : status === "complete" ? "complete" : ""}`.trim();
    elements.startBtn.textContent = status === "active" ? "Pause" : status === "paused" ? "Resume" : status === "complete" ? "Restart" : "Start";
  }

  function setProgress(value, text, visible = true) {
    const safeValue = Math.min(7, Math.max(0, value));
    elements.progressTrack.hidden = !visible;
    elements.progressBar.setAttribute("aria-valuenow", String(safeValue));
    elements.progressFill.style.width = `${(safeValue / 7) * 100}%`;
    elements.progressText.textContent = text;
  }

  function renderMode() {
    const mode = MODES[state.mode];
    elements.modeLabel.textContent = mode.label;
    elements.modeSummary.textContent = mode.summary;
    elements.breathGuide.hidden = state.mode !== "breathe";

    elements.modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
    });
  }

  function renderReadyState(message = null) {
    renderMode();
    setStatus("ready");
    elements.sigilWrap.classList.remove("session-active");
    elements.nextBtn.hidden = true;
    elements.breathState.textContent = "Ready";
    elements.breathCount.textContent = "4 · 2 · 6";

    if (state.mode === "observe") setProgress(0, "Open-ended", false);
    else setProgress(0, "Not started", true);

    elements.transmission.textContent = message || MODES[state.mode].initial;
  }

  function resetSession(message = null) {
    clearTimers();
    stopAllAudio();
    state.promptIndex = 0;
    state.cycleIndex = 0;
    state.phaseIndex = 0;
    state.phaseRemaining = PHASES[0].seconds;
    renderReadyState(message);
  }

  function selectMode(mode) {
    if (!MODES[mode] || mode === state.mode) return;
    state.mode = mode;
    resetSession();
  }

  function renderPrompt() {
    elements.transmission.textContent = QUESTIONS[state.promptIndex];
    setProgress(state.promptIndex + 1, `Question ${state.promptIndex + 1} of 7`, true);
    elements.nextBtn.hidden = state.status !== "active";
    elements.nextBtn.textContent = state.promptIndex === QUESTIONS.length - 1 ? "Finish" : "Next question";
  }

  function renderBreath(announce = false) {
    const phase = PHASES[state.phaseIndex];
    elements.breathState.textContent = phase.label;
    elements.breathCount.textContent = `${state.phaseRemaining}s`;
    setProgress(state.cycleIndex, `Cycle ${state.cycleIndex + 1} of 7`, true);
    if (announce) elements.transmission.textContent = `${phase.label}. Cycle ${state.cycleIndex + 1} of 7.`;
  }

  function startBreathing() {
    renderBreath(true);
    tone(PHASES[state.phaseIndex].tone, 0.22);

    state.breathTimer = window.setInterval(() => {
      state.phaseRemaining -= 1;

      if (state.phaseRemaining <= 0) {
        if (state.phaseIndex === PHASES.length - 1) {
          state.cycleIndex += 1;
          if (state.cycleIndex >= 7) {
            completeSession("Complete. Return to your normal breathing.");
            return;
          }
          state.phaseIndex = 0;
        } else {
          state.phaseIndex += 1;
        }

        state.phaseRemaining = PHASES[state.phaseIndex].seconds;
        tone(PHASES[state.phaseIndex].tone, 0.22);
        renderBreath(true);
        return;
      }

      elements.breathCount.textContent = `${state.phaseRemaining}s`;
    }, 1000);
  }

  function startSession() {
    if (state.status === "complete") resetSession();

    setStatus("active");
    elements.sigilWrap.classList.add("session-active");

    if (state.mode === "observe") {
      setProgress(0, "Open-ended", false);
      elements.transmission.textContent = "Look at the center. Notice what you see, feel, and assume.";
      return;
    }

    if (state.mode === "prompts") {
      renderPrompt();
      tone(174, 0.34);
      return;
    }

    startBreathing();
  }

  function pauseSession() {
    clearTimers();
    stopAllAudio();
    setStatus("paused");
    elements.sigilWrap.classList.remove("session-active");
    elements.nextBtn.hidden = true;
    elements.transmission.textContent = "Paused. Continue when ready.";
  }

  function resumeSession() {
    setStatus("active");
    elements.sigilWrap.classList.add("session-active");

    if (state.mode === "observe") {
      elements.transmission.textContent = "Look at the center. Notice what you see, feel, and assume.";
      return;
    }

    if (state.mode === "prompts") {
      renderPrompt();
      return;
    }

    startBreathing();
  }

  function completeSession(message) {
    clearTimers();
    stopAllAudio();
    setStatus("complete");
    elements.sigilWrap.classList.remove("session-active");
    elements.nextBtn.hidden = true;
    setProgress(7, state.mode === "breathe" ? "7 cycles complete" : "7 questions complete", true);
    elements.transmission.textContent = message;

    if (state.mode === "breathe") {
      elements.breathState.textContent = "Complete";
      elements.breathCount.textContent = "7 cycles";
    }
  }

  function advancePrompt() {
    if (state.status !== "active" || state.mode !== "prompts") return;

    if (state.promptIndex >= QUESTIONS.length - 1) {
      completeSession("Complete. Keep what is clear and useful.");
      return;
    }

    state.promptIndex += 1;
    renderPrompt();
    tone(174 + state.promptIndex * 18, 0.28);
  }

  function stopAndReset() {
    resetSession("Reset complete. Look around, feel your feet, and choose one ordinary next step.");
  }

  function saveReflection() {
    storage.set(storageKey, elements.journal.value);
    elements.saveStatus.textContent = "Saved in this browser.";
    window.setTimeout(() => {
      elements.saveStatus.textContent = "Saved unencrypted in this browser. Do not enter sensitive information.";
    }, 2200);
  }

  function exportReflection() {
    const reflection = elements.journal.value.trim() || "No reflection was recorded.";
    const text = `# Theta-7 Reflection\n\nDate: ${new Date().toISOString()}\n\n${reflection}\n`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `theta7-reflection-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    elements.saveStatus.textContent = "Download created.";
  }

  function resetDeleteControl() {
    delete elements.clearBtn.dataset.confirm;
    elements.clearBtn.textContent = "Delete";
  }

  function clearReflection() {
    if (elements.clearBtn.dataset.confirm !== "true") {
      elements.clearBtn.dataset.confirm = "true";
      elements.clearBtn.textContent = "Confirm delete";
      elements.saveStatus.textContent = "Press again to delete.";
      window.clearTimeout(state.clearConfirmTimer);
      state.clearConfirmTimer = window.setTimeout(() => {
        resetDeleteControl();
        elements.saveStatus.textContent = "Saved unencrypted in this browser. Do not enter sensitive information.";
      }, 7000);
      return;
    }

    window.clearTimeout(state.clearConfirmTimer);
    resetDeleteControl();
    elements.journal.value = "";
    storage.remove(storageKey);
    elements.saveStatus.textContent = "Reflection deleted.";
  }

  function toggleAudio() {
    state.audioOn = !state.audioOn;
    elements.audioBtn.textContent = `Sound: ${state.audioOn ? "On" : "Off"}`;
    elements.audioBtn.setAttribute("aria-pressed", String(state.audioOn));
    elements.volumeControl.hidden = !state.audioOn;
    if (state.audioOn) tone(174, 0.34);
    else stopAllAudio();
  }

  function toggleMotion() {
    state.motionOff = !state.motionOff;
    elements.app.classList.toggle("motion-off", state.motionOff);
    elements.motionBtn.textContent = `Reduce motion: ${state.motionOff ? "On" : "Off"}`;
    elements.motionBtn.setAttribute("aria-pressed", String(state.motionOff));
  }

  function bindEvents() {
    elements.modeButtons.forEach((button) => {
      button.addEventListener("click", () => selectMode(button.dataset.mode));
    });

    elements.startBtn.addEventListener("click", () => {
      if (state.status === "active") pauseSession();
      else if (state.status === "paused") resumeSession();
      else startSession();
    });

    elements.resetBtn.addEventListener("click", stopAndReset);
    elements.nextBtn.addEventListener("click", advancePrompt);
    elements.audioBtn.addEventListener("click", toggleAudio);
    elements.motionBtn.addEventListener("click", toggleMotion);

    elements.volumeSlider.addEventListener("input", () => {
      state.volume = Number(elements.volumeSlider.value) / 100;
      elements.volumeOutput.textContent = `${elements.volumeSlider.value}%`;
      if (state.masterGain) state.masterGain.gain.value = state.volume;
    });

    elements.saveBtn.addEventListener("click", saveReflection);
    elements.exportBtn.addEventListener("click", exportReflection);
    elements.clearBtn.addEventListener("click", clearReflection);

    window.addEventListener("beforeunload", () => {
      clearTimers();
      stopAllAudio();
      if (state.audioContext) state.audioContext.close();
    });
  }

  function initializeStorage() {
    const current = storage.get(storageKey);
    const previous = storage.get(previousStorageKey);
    if (current === null && previous !== null) {
      storage.set(storageKey, previous);
      storage.remove(previousStorageKey);
    }
    elements.journal.value = storage.get(storageKey) || "";
  }

  function initialize() {
    buildSigil();
    bindEvents();
    initializeStorage();
    renderReadyState();

    if (state.motionOff) {
      elements.app.classList.add("motion-off");
      elements.motionBtn.textContent = "Reduce motion: On";
      elements.motionBtn.setAttribute("aria-pressed", "true");
    }

    window.__THETA7__ = Object.freeze({ version: VERSION, questionCount: QUESTIONS.length });
  }

  initialize();
})();
