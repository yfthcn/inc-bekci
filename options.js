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

const $ = (id) => document.getElementById(id);

function load() {
  chrome.storage.local.get(["bekciConfig"], (data) => {
    const cfg = { ...DEFAULTS, ...(data.bekciConfig || {}) };
    $("enabled").checked = cfg.enabled;
    $("hostMatch").value = cfg.hostMatch;
    $("pathMatch").value = cfg.pathMatch;
    $("pattern").value = cfg.pattern;
    $("countPattern").value = cfg.countPattern;
    $("intervalMs").value = cfg.intervalMs;
    $("soundOn").checked = cfg.soundOn;
    $("autoRefresh").checked = cfg.autoRefresh;
    $("refreshMinutes").value = cfg.refreshMinutes;
  });
}

function save() {
  const cfg = {
    enabled: $("enabled").checked,
    hostMatch: $("hostMatch").value.trim(),
    pathMatch: $("pathMatch").value.trim(),
    pattern: $("pattern").value.trim() || DEFAULTS.pattern,
    countPattern: $("countPattern").value.trim() || DEFAULTS.countPattern,
    intervalMs: Math.max(3000, parseInt($("intervalMs").value, 10) || DEFAULTS.intervalMs),
    soundOn: $("soundOn").checked,
    autoRefresh: $("autoRefresh").checked,
    refreshMinutes: Math.max(1, parseInt($("refreshMinutes").value, 10) || DEFAULTS.refreshMinutes),
  };
  chrome.storage.local.set({ bekciConfig: cfg }, () => {
    $("status").textContent = "Kaydedildi ✓";
    setTimeout(() => ($("status").textContent = ""), 1800);
  });
}

function clearSeen() {
  chrome.storage.local.get(null, (all) => {
    const keys = Object.keys(all).filter(
      (k) => k.startsWith("bekciSeen_") || k.startsWith("bekciCount_")
    );
    if (keys.length === 0) {
      $("status").textContent = "Zaten temiz.";
    } else {
      chrome.storage.local.remove(keys, () => {
        $("status").textContent = `${keys.length} kayıt sıfırlandı ✓`;
      });
    }
    setTimeout(() => ($("status").textContent = ""), 2000);
  });
}

$("save").addEventListener("click", save);
$("clearSeen").addEventListener("click", clearSeen);
load();
