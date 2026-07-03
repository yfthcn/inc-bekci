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

let currentHost = "";
let currentPath = "";

function refresh() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    let host = "-";
    let path = "";
    try {
      const u = new URL(tab.url);
      host = u.host;
      path = u.pathname;
    } catch (e) {}
    currentHost = host;
    currentPath = path;
    document.getElementById("host").textContent = host + path;

    chrome.storage.local.get(["bekciConfig"], (data) => {
      const cfg = { ...DEFAULTS, ...(data.bekciConfig || {}) };
      const hostOk = cfg.enabled && cfg.hostMatch && host.includes(cfg.hostMatch);
      const pathOk = !cfg.pathMatch || path === cfg.pathMatch;
      const active = hostOk && pathOk;

      document.getElementById("dot").className = "dot" + (active ? " on" : "");

      let statusText;
      if (active) {
        statusText = cfg.autoRefresh
          ? `izleniyor · ${cfg.refreshMinutes} dk'da bir yenileniyor`
          : "izleniyor";
      } else if (hostOk && !pathOk) {
        statusText = "bu host izleniyor ama farklı sayfa (liste sayfasına dön)";
      } else if (cfg.enabled) {
        statusText = "başka sayfa izleniyor: " + cfg.hostMatch + (cfg.pathMatch || "");
      } else {
        statusText = "kapalı";
      }
      document.getElementById("statusText").textContent = statusText;
    });
  });
}

document.getElementById("watchBtn").addEventListener("click", () => {
  chrome.storage.local.get(["bekciConfig"], (data) => {
    const cfg = { ...DEFAULTS, ...(data.bekciConfig || {}) };
    cfg.enabled = true;
    cfg.hostMatch = currentHost;
    cfg.pathMatch = currentPath;
    chrome.storage.local.set({ bekciConfig: cfg }, refresh);
  });
});

document.getElementById("stopBtn").addEventListener("click", () => {
  chrome.storage.local.get(["bekciConfig"], (data) => {
    const cfg = { ...DEFAULTS, ...(data.bekciConfig || {}) };
    cfg.enabled = false;
    chrome.storage.local.set({ bekciConfig: cfg }, refresh);
  });
});

document.getElementById("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

refresh();
