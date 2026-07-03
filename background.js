// Inc Bekçi - background.js
// Yeni incident mesajı gelince: (1) offscreen document üzerinden alarm sesi
// çalar (autoplay kısıtına takılmaz), (2) OS bildirimi (popup) gösterir.

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument();
  if (!has) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Yeni incident geldiğinde alarm sesi çalmak için",
    });
  }
}

async function playSound() {
  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: "bekci-play-sound" });
  } catch (e) {
    console.warn("Inc Bekçi: offscreen ses hatası", e);
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "bekci-new-incident") {
    // Ses ayarını background tarafında oku (content'e güvenmeden)
    chrome.storage.local.get(["bekciConfig"], (data) => {
      const cfg = data.bekciConfig || {};
      if (cfg.soundOn !== false) playSound();
    });

    const list = msg.incidents.join(", ");
    const notifId = "bekci-" + Date.now();
    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🚨 Yeni Incident: " + msg.incidents[0] + (msg.incidents.length > 1 ? ` (+${msg.incidents.length - 1})` : ""),
      message: list,
      priority: 2,
      requireInteraction: true,
    });

    if (sender.tab && sender.tab.id != null) {
      chrome.storage.local.set({ ["bekciLastTab_" + notifId]: sender.tab.id });
    }
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  chrome.storage.local.get(["bekciLastTab_" + notifId], (data) => {
    const tabId = data["bekciLastTab_" + notifId];
    if (tabId != null) {
      chrome.tabs.update(tabId, { active: true }).catch(() => {});
      chrome.storage.local.remove(["bekciLastTab_" + notifId]);
    }
  });
  chrome.notifications.clear(notifId);
});
