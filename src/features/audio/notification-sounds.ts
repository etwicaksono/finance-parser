export type SoundTone = "chime" | "success" | "beep" | "error";

export function playNotification(tone: SoundTone = "success") {
  // AudioContext might be blocked by browser policy until user interacts with the page
  // But parsing only happens after clicking a button or pressing enter, so we should be good.
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();

  const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  };

  if (tone === "chime") {
    // A soft ding-dong
    playTone(523.25, "sine", 0, 0.4, 0.2); // C5
    playTone(440.00, "sine", 0.3, 0.6, 0.2); // A4
  } else if (tone === "success") {
    // A cheerful rising arpeggio
    playTone(440.00, "triangle", 0, 0.15, 0.15); // A4
    playTone(554.37, "triangle", 0.1, 0.15, 0.15); // C#5
    playTone(659.25, "triangle", 0.2, 0.4, 0.15); // E5
  } else if (tone === "beep") {
    // A simple short notification beep
    playTone(880.00, "square", 0, 0.2, 0.05); // A5
  } else if (tone === "error") {
    // A low-pitched, dissonant "bzzzt" sound for errors
    playTone(150, "sawtooth", 0, 0.3, 0.2);
    playTone(160, "sawtooth", 0, 0.3, 0.2);
  }
}
