import { STORE_NAMES, dbGetAll, dbClear, dbAdd } from "../db/db.js";

const THEME_KEY = "levelup:theme";

function container() {
  return document.getElementById("settings-root");
}

export function applyStoredTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  document.documentElement.dataset.theme = next;
  render();
}

/** Reads every object store into one exportable object. */
async function exportAllData() {
  const data = {};
  for (const storeName of STORE_NAMES) {
    data[storeName] = await dbGetAll(storeName);
  }
  return { exportedAt: new Date().toISOString(), version: 1, data };
}

async function downloadBackup() {
  const backup = await exportAllData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `level-up-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function restoreFromFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    alert("That file isn't valid JSON.");
    return;
  }
  if (!parsed.data) {
    alert("This doesn't look like a LEVEL UP backup file.");
    return;
  }

  for (const storeName of STORE_NAMES) {
    const records = parsed.data[storeName];
    if (!Array.isArray(records)) continue;
    await dbClear(storeName);
    for (const record of records) {
      await dbAdd(storeName, record);
    }
  }

  alert("Data restored. Reloading the app...");
  window.location.reload();
}

async function resetApp() {
  const confirmed = confirm(
    "This deletes ALL your data (workouts, streaks, XP, everything) and cannot be undone. Continue?"
  );
  if (!confirmed) return;

  for (const storeName of STORE_NAMES) {
    await dbClear(storeName);
  }
  localStorage.clear();
  window.location.reload();
}

function render() {
  const root = container();
  if (!root) return;

  const theme = localStorage.getItem(THEME_KEY) || "dark";

  root.innerHTML = `
    <div class="card" style="margin-bottom:var(--space-4);">
      <h2 class="section-title">Appearance</h2>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>Dark mode</span>
        <button class="btn ${theme === "dark" ? "btn--primary" : "btn--ghost"}" data-action="toggle-theme">
          ${theme === "dark" ? "On" : "Off"}
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom:var(--space-4);">
      <h2 class="section-title">Backup &amp; data</h2>
      <p class="text-secondary" style="font-size:var(--fs-sm);margin-bottom:var(--space-3);">
        Everything lives only on this device. Export regularly so you never lose progress.
      </p>
      <button class="btn btn--primary" style="width:100%;margin-bottom:var(--space-3);" data-action="export">
        Export / Backup data
      </button>
      <label class="btn btn--ghost" style="width:100%;display:flex;box-sizing:border-box;" for="restore-input">
        Import / Restore data
      </label>
      <input type="file" id="restore-input" accept="application/json" style="display:none;" />
    </div>

    <div class="card">
      <h2 class="section-title">Danger zone</h2>
      <button class="btn" style="width:100%;background:var(--accent-danger);color:white;" data-action="reset">
        Reset app (delete everything)
      </button>
    </div>
  `;
}

export async function initSettings() {
  applyStoredTheme();

  const root = container();
  if (!root) return;

  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "toggle-theme") toggleTheme();
    if (btn.dataset.action === "export") downloadBackup();
    if (btn.dataset.action === "reset") resetApp();
  });

  root.addEventListener("change", (event) => {
    if (event.target.id === "restore-input" && event.target.files[0]) {
      restoreFromFile(event.target.files[0]);
    }
  });

  render();
}
