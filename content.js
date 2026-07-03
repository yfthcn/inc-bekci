// Inc Bekçi - content.js
// İzlenen liste sayfasını periyodik tarar. İki tespit mekanizması:
//  1) Sayaç: "28 total incidents" gibi toplam sayı metni artarsa alarm.
//     (Gruplu/kapalı liste görünümünde INC numaraları DOM'da olmadığı
//      için asıl güvenilir mekanizma budur.)
//  2) INC regex: sayfada görünen yeni incident numarası yakalanırsa alarm.
// Sadece "Bu sayfayı izle" ile kaydedilen host+path'te çalışır — ticket
// detay sayfalarında tarama ve auto-refresh YAPMAZ (yanlış alarm ve
// veri kaybı önlemi).

const DEFAULTS = {
  enabled: false,
  hostMatch: "",
  pathMatch: "",
  pattern: "INC\\d{6,}",
  countPattern: "(\\d+)\\s+total\\s+incidents",
  intervalMs: 15000,
  soundOn: true,
  autoRefresh: false,
  refreshMinutes: 5,
};

let cfg = { ...DEFAULTS };
let seen = new Set();
let baselineDone = false;
let lastCount = null;

const seenKey = () => "bekciSeen_" + location.host + location.pathname;
const countKey = () => "bekciCount_" + location.host + location.pathname;

function onWatchedPage() {
  if (!cfg.enabled) return false;
  if (!cfg.hostMatch || !location.host.includes(cfg.hostMatch)) return false;
  if (cfg.pathMatch && location.pathname !== cfg.pathMatch) return false;
  return true;
}

function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["bekciConfig", seenKey(), countKey()], (data) => {
      cfg = { ...DEFAULTS, ...(data.bekciConfig || {}) };
      const stored = data[seenKey()];
      seen = new Set(stored || []);
      baselineDone = Array.isArray(stored);
      lastCount = typeof data[countKey()] === "number" ? data[countKey()] : null;
      resolve();
    });
  });
}

function saveSeen() {
  chrome.storage.local.set({ [seenKey()]: Array.from(seen) });
}

function saveCount() {
  chrome.storage.local.set({ [countKey()]: lastCount });
}

// Görünür metni, açık (open) shadow root'lar dahil recursive topla
function collectAllText(root, out) {
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue) out.push(node.nodeValue);
    }
    const all = root.querySelectorAll ? root.querySelectorAll("*") : [];
    all.forEach((el) => {
      if (el.shadowRoot) collectAllText(el.shadowRoot, out);
    });
  } catch (e) {
    // bazı köklerde TreeWalker hata verebilir, sessizce geç
  }
}

function notifyNew(items) {
  chrome.runtime.sendMessage({
    type: "bekci-new-incident",
    incidents: items,
    url: location.href,
    title: document.title,
  });
}

function scan() {
  if (!onWatchedPage()) return;

  const out = [];
  collectAllText(document.body, out);
  const text = out.join(" ");

  // ---- 1) INC numarası tespiti ----
  let newOnes = [];
  let re = null;
  try {
    re = new RegExp(cfg.pattern, "g");
  } catch (e) {}
  if (re) {
    const found = new Set(text.match(re) || []);
    if (!baselineDone) {
      // Boş taramada baseline alma (satırlar asenkron yüklenir).
      // NOT: gruplu/kapalı görünümde numaralar hiç görünmeyebilir,
      // o durumda bu mekanizma pasif kalır, sayaç mekanizması çalışır.
      if (found.size > 0) {
        seen = found;
        baselineDone = true;
        saveSeen();
      }
    } else {
      newOnes = [...found].filter((x) => !seen.has(x));
      if (newOnes.length > 0) {
        newOnes.forEach((n) => seen.add(n));
        saveSeen();
      }
    }
  }

  // ---- 2) Toplam sayı tespiti ("28 total incidents") ----
  let countIncreasedBy = 0;
  let currentCount = null;
  let countRe = null;
  try {
    countRe = new RegExp(cfg.countPattern, "i");
  } catch (e) {}
  if (countRe) {
    const m = text.match(countRe);
    if (m && m[1]) {
      currentCount = parseInt(m[1], 10);
      if (lastCount === null) {
        // baseline: ilk görülen sayıyı sessizce kaydet
        lastCount = currentCount;
        saveCount();
      } else if (currentCount > lastCount) {
        countIncreasedBy = currentCount - lastCount;
        lastCount = currentCount;
        saveCount();
      } else if (currentCount < lastCount) {
        // ticket kapanmış/taşınmış — sessizce güncelle
        lastCount = currentCount;
        saveCount();
      }
    }
  }

  // ---- Bildirim (çift alarm olmasın diye tek noktadan) ----
  if (newOnes.length > 0) {
    notifyNew(newOnes);
  } else if (countIncreasedBy > 0) {
    notifyNew([`+${countIncreasedBy} yeni incident (toplam ${currentCount})`]);
  }
}

let timer = null;
let refreshTimer = null;

function startLoop() {
  if (timer) clearInterval(timer);
  scan();
  timer = setInterval(scan, Math.max(3000, cfg.intervalMs));
}

function startRefreshLoop() {
  if (refreshTimer) clearInterval(refreshTimer);
  // Sadece izlenen liste sayfasında yenile — ticket detayında ASLA
  // (yazmakta olduğun update'i kaybettirmesin).
  if (!cfg.autoRefresh || !onWatchedPage()) return;
  const ms = Math.max(1, Number(cfg.refreshMinutes) || 5) * 60 * 1000;
  refreshTimer = setInterval(() => {
    if (!onWatchedPage()) return; // SPA navigasyonuyla sayfa değiştiyse dokunma
    saveSeen();
    saveCount();
    location.reload();
  }, ms);
}

loadConfig().then(() => {
  startLoop();
  startRefreshLoop();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.bekciConfig) {
    cfg = { ...DEFAULTS, ...changes.bekciConfig.newValue };
    startLoop();
    startRefreshLoop();
  }
});
