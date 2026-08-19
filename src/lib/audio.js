// One AudioContext for the whole app.
//
// Two reasons this is a module-level singleton instead of being created on
// demand: browsers cap how many contexts a page may hold (~6 in Chrome), and
// iOS will only produce sound from a context that was created or resumed
// during a real user gesture. So we create it when the user taps Start, and
// reuse it forever after.

let ctx = null;

function getContext() {
  if (ctx) return ctx;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    ctx = new AudioCtor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call from a user gesture (e.g. a Start button) so iOS will allow sound. */
export function unlockAudio() {
  const context = getContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

/** Beep... beep... BEEEEP */
export function playTimerAlarm() {
  const context = getContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const tone = (offset, frequency, duration) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);

    osc.type = "sine";
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0.5, context.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      context.currentTime + offset + duration
    );

    osc.start(context.currentTime + offset);
    osc.stop(context.currentTime + offset + duration);
  };

  try {
    tone(0, 600, 0.15);
    tone(0.3, 600, 0.15);
    tone(0.6, 800, 0.4);
  } catch {
    // Autoplay blocked; nothing useful to do.
  }
}
