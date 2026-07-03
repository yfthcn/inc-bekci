// Inc Bekçi - offscreen.js
// Offscreen document içinde WebAudio, kullanıcı etkileşimi şartına
// takılmadan çalışır (background tarafından yönetilir).

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "bekci-play-sound") {
    playAlarm();
  }
});

function playAlarm() {
  const ctx = new AudioContext();
  const tone = (freq, startOffset, dur, gainPeak = 0.4) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    const t0 = ctx.currentTime + startOffset;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };
  // Dikkat çekici üçlü alarm deseni: yüksek-alçak-yüksek
  tone(880, 0.0, 0.22);
  tone(660, 0.28, 0.22);
  tone(880, 0.56, 0.35);
  // Context'i kapatmadan önce sesin bitmesini bekle
  setTimeout(() => ctx.close().catch(() => {}), 1500);
}
