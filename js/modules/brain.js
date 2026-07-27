import { dbGetAll, dbAdd } from "../db/db.js";
import { renderLineChart } from "../components/charts.js";
import { todayKey } from "../utils/dateUtils.js";

const SUBTABS = ["Reading", "Meditation", "Chess", "Memory", "Focus"];
let activeSubTab = "Reading";

let sessionTimer = { remaining: 0, total: 0, intervalId: null, type: null, onComplete: null };

function container() {
  return document.getElementById("brain-root");
}

function statTile(value, label) {
  return `<div class="card stat-tile"><span class="stat-tile__value">${value}</span><span class="stat-tile__label">${label}</span></div>`;
}

function historyRows(entries, formatTitle, formatMeta, formatValue) {
  if (!entries.length) return `<div class="empty-state"><h3>No entries yet</h3><p>Log your first one below.</p></div>`;
  return entries
    .slice(0, 10)
    .map(
      (e) => `<div class="history-item">
        <div><div class="history-item__title">${formatTitle(e)}</div><div class="history-item__meta">${formatMeta(e)}</div></div>
        <span class="history-item__value">${formatValue(e)}</span>
      </div>`
    )
    .join("");
}

/* ---------------- Reading ---------------- */
async function renderReading() {
  const entries = (await dbGetAll("brainTraining")).filter((e) => e.type === "reading");
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalPages = entries.reduce((s, e) => s + (e.pages || 0), 0);
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);
  const uniqueBooks = new Set(entries.map((e) => e.book)).size;

  return `
    <div class="stats-grid">
      ${statTile(uniqueBooks, "Books")}
      ${statTile(totalPages, "Pages read")}
      ${statTile(totalMinutes, "Minutes")}
    </div>
    <div class="card">
      <h2 class="section-title">Log a reading session</h2>
      <form data-form="reading">
        <div class="form-field"><label>Book title</label><input type="text" name="book" required /></div>
        <div class="form-row">
          <div class="form-field"><label>Pages read</label><input type="number" name="pages" min="0" value="10" /></div>
          <div class="form-field"><label>Minutes</label><input type="number" name="minutes" min="0" value="20" /></div>
        </div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Save</button>
      </form>
    </div>
    <div class="card">
      <h2 class="section-title">History</h2>
      ${historyRows(sorted, (e) => e.book, (e) => e.date, (e) => `${e.pages}p`)}
    </div>
  `;
}

/* ---------------- Meditation ---------------- */
async function renderMeditation() {
  const entries = (await dbGetAll("brainTraining")).filter((e) => e.type === "meditation");
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);

  return `
    <div class="stats-grid">
      ${statTile(entries.length, "Sessions completed")}
      ${statTile(totalMinutes, "Minutes meditated")}
    </div>
    ${renderTimerCard("meditation", "Meditation timer", [300, 600, 900])}
    <div class="card">
      <h2 class="section-title">History</h2>
      ${historyRows(sorted, () => "Meditation session", (e) => e.date, (e) => `${e.minutes}m`)}
    </div>
  `;
}

/* ---------------- Chess ---------------- */
async function renderChess() {
  const entries = (await dbGetAll("brainTraining")).filter((e) => e.type === "chess");
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const ratings = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1)).map((e) => e.rating).filter(Boolean);
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);

  return `
    <div class="stats-grid">
      ${statTile(entries.length, "Games played")}
      ${statTile(totalMinutes, "Practice minutes")}
    </div>
    <div class="card">
      <h2 class="section-title">Rating over time</h2>
      ${ratings.length >= 2 ? renderLineChart(ratings) : `<div class="chart-empty">Log a couple of games with a rating to see this chart.</div>`}
    </div>
    <div class="card">
      <h2 class="section-title">Log a game</h2>
      <form data-form="chess">
        <div class="form-row">
          <div class="form-field"><label>Result</label>
            <select name="result"><option>Win</option><option>Loss</option><option>Draw</option></select>
          </div>
          <div class="form-field"><label>Rating (optional)</label><input type="number" name="rating" min="0" /></div>
        </div>
        <div class="form-field"><label>Practice minutes</label><input type="number" name="minutes" min="0" value="15" /></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Save</button>
      </form>
    </div>
    <div class="card">
      <h2 class="section-title">History</h2>
      ${historyRows(sorted, (e) => e.result, (e) => e.date, (e) => (e.rating ? e.rating : ""))}
    </div>
  `;
}

/* ---------------- Memory ---------------- */
async function renderMemory() {
  const entries = (await dbGetAll("brainTraining")).filter((e) => e.type === "memory");
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  return `
    <div class="stats-grid">
      ${statTile(entries.length, "Exercises logged")}
    </div>
    <div class="card">
      <h2 class="section-title">Log a memory exercise</h2>
      <form data-form="memory">
        <div class="form-field"><label>Exercise</label><input type="text" name="exercise" placeholder="e.g. Card sequence recall" required /></div>
        <div class="form-field"><label>Result / score</label><input type="text" name="result" placeholder="e.g. 8/10 recalled" required /></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Save</button>
      </form>
    </div>
    <div class="card">
      <h2 class="section-title">History</h2>
      ${historyRows(sorted, (e) => e.exercise, (e) => e.date, (e) => e.result)}
    </div>
  `;
}

/* ---------------- Focus (Pomodoro) ---------------- */
async function renderFocus() {
  const entries = (await dbGetAll("brainTraining")).filter((e) => e.type === "focus");
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  return `
    <div class="stats-grid">
      ${statTile(entries.length, "Pomodoro sessions")}
    </div>
    ${renderTimerCard("focus", "Focus timer (25 min)", [1500])}
    <div class="card">
      <h2 class="section-title">Focus history</h2>
      ${historyRows(sorted, () => "Focus session", (e) => e.date, () => "25m")}
    </div>
  `;
}

/* ---------------- Shared countdown timer card ---------------- */
function renderTimerCard(type, title, presets) {
  const mins = String(Math.floor(sessionTimer.remaining / 60)).padStart(2, "0");
  const secs = String(sessionTimer.remaining % 60).padStart(2, "0");
  const isThisTimer = sessionTimer.type === type;
  return `
    <div class="card">
      <h2 class="section-title">${title}</h2>
      <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;">
        <span class="text-mono" style="font-size:var(--fs-2xl);font-weight:700;">${isThisTimer ? `${mins}:${secs}` : "00:00"}</span>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
          ${presets.map((p) => `<button class="btn btn--ghost" data-brain-timer-preset="${type}:${p}">${Math.round(p / 60)}m</button>`).join("")}
          <button class="btn btn--primary" data-brain-timer-action="${type}:toggle">${isThisTimer && sessionTimer.intervalId ? "Pause" : "Start"}</button>
          <button class="btn btn--ghost" data-brain-timer-action="${type}:reset">Reset</button>
        </div>
      </div>
    </div>
  `;
}

function updateTimerCardOnly() {
  render(); // simplest correct approach: full page is cheap here
}

function startTimer(type, seconds) {
  clearInterval(sessionTimer.intervalId);
  sessionTimer = { remaining: seconds, total: seconds, intervalId: null, type };
  updateTimerCardOnly();
}

function toggleTimer(type) {
  if (sessionTimer.type !== type || sessionTimer.remaining <= 0) return;
  if (sessionTimer.intervalId) {
    clearInterval(sessionTimer.intervalId);
    sessionTimer.intervalId = null;
  } else {
    sessionTimer.intervalId = setInterval(async () => {
      sessionTimer.remaining -= 1;
      if (sessionTimer.remaining <= 0) {
        clearInterval(sessionTimer.intervalId);
        sessionTimer.intervalId = null;
        await dbAdd("brainTraining", {
          date: todayKey(),
          type,
          minutes: Math.round(sessionTimer.total / 60),
        });
      }
      updateTimerCardOnly();
    }, 1000);
  }
  updateTimerCardOnly();
}

function resetTimer(type) {
  if (sessionTimer.type !== type) return;
  clearInterval(sessionTimer.intervalId);
  sessionTimer.intervalId = null;
  sessionTimer.remaining = sessionTimer.total;
  updateTimerCardOnly();
}

/* ---------------- Shell ---------------- */

const RENDERERS = {
  Reading: renderReading,
  Meditation: renderMeditation,
  Chess: renderChess,
  Memory: renderMemory,
  Focus: renderFocus,
};

async function render() {
  const root = container();
  if (!root) return;

  root.innerHTML = `
    <div class="segmented-control">
      ${SUBTABS.map((t) => `<button class="segmented-control__item ${t === activeSubTab ? "is-active" : ""}" data-brain-subtab="${t}">${t}</button>`).join("")}
    </div>
    <div id="brain-subview"></div>
  `;

  document.getElementById("brain-subview").innerHTML = await RENDERERS[activeSubTab]();
}

async function handleFormSubmit(form) {
  const type = form.dataset.form;
  const data = new FormData(form);
  const today = todayKey();

  if (type === "reading") {
    await dbAdd("brainTraining", { date: today, type, book: data.get("book"), pages: Number(data.get("pages")) || 0, minutes: Number(data.get("minutes")) || 0 });
  } else if (type === "chess") {
    await dbAdd("brainTraining", { date: today, type, result: data.get("result"), rating: data.get("rating") ? Number(data.get("rating")) : null, minutes: Number(data.get("minutes")) || 0 });
  } else if (type === "memory") {
    await dbAdd("brainTraining", { date: today, type, exercise: data.get("exercise"), result: data.get("result") });
  }
  await render();
}

function handleRootClick(event) {
  const subtabBtn = event.target.closest("[data-brain-subtab]");
  if (subtabBtn) {
    activeSubTab = subtabBtn.dataset.brainSubtab;
    render();
    return;
  }

  const preset = event.target.closest("[data-brain-timer-preset]");
  if (preset) {
    const [type, seconds] = preset.dataset.brainTimerPreset.split(":");
    startTimer(type, Number(seconds));
    return;
  }

  const action = event.target.closest("[data-brain-timer-action]");
  if (action) {
    const [type, act] = action.dataset.brainTimerAction.split(":");
    if (act === "toggle") toggleTimer(type);
    if (act === "reset") resetTimer(type);
  }
}

export async function initBrain() {
  const root = container();
  if (!root) return;

  root.addEventListener("click", handleRootClick);
  root.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]");
    if (form) {
      event.preventDefault();
      handleFormSubmit(form);
    }
  });

  await render();
}
