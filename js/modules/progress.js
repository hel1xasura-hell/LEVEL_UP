import { dbGetAll, dbAdd, dbPut, dbGet } from "../db/db.js";
import { renderBarChart, renderLineChart } from "../components/charts.js";
import { todayKey, dateKey } from "../utils/dateUtils.js";

const SUBTABS = ["Health", "Goals", "Calendar", "Statistics"];
let activeSubTab = "Health";
let calendarCursor = new Date(); // month currently shown

function container() {
  return document.getElementById("progress-root");
}
function statTile(value, label) {
  return `<div class="card stat-tile"><span class="stat-tile__value">${value}</span><span class="stat-tile__label">${label}</span></div>`;
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ============================== HEALTH ============================== */

async function renderHealth() {
  const records = (await dbGetAll("healthRecords")).sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = records[records.length - 1];

  let bmi = null;
  if (latest && latest.weight && latest.height) {
    const heightM = latest.height / 100;
    bmi = (latest.weight / (heightM * heightM)).toFixed(1);
  }

  const last7 = records.slice(-7);
  const weightSeries = records.slice(-14).map((r) => r.weight).filter((v) => v != null);

  return `
    <div class="stats-grid">
      ${statTile(latest && latest.weight != null ? latest.weight + " kg" : "—", "Latest weight")}
      ${statTile(bmi || "—", "BMI")}
    </div>

    <div class="card">
      <h2 class="section-title">Weight trend</h2>
      ${weightSeries.length >= 2 ? renderLineChart(weightSeries, { color: "var(--accent-jade)" }) : `<div class="chart-empty">Log weight a couple of times to see a trend.</div>`}
    </div>

    <div class="card">
      <h2 class="section-title">Water &amp; sleep (last 7 entries)</h2>
      <p class="text-secondary" style="font-size:var(--fs-xs);margin-bottom:var(--space-2);">Water (L)</p>
      ${renderBarChart(last7.map((r) => r.water || 0), last7.map((r) => r.date.slice(5)), { color: "var(--accent-steel)" })}
      <p class="text-secondary" style="font-size:var(--fs-xs);margin:var(--space-3) 0 var(--space-2);">Sleep (hrs)</p>
      ${renderBarChart(last7.map((r) => r.sleep || 0), last7.map((r) => r.date.slice(5)))}
    </div>

    <div class="card">
      <h2 class="section-title">Log today's health</h2>
      <form data-form="health">
        <div class="form-row">
          <div class="form-field"><label>Weight (kg)</label><input type="number" step="0.1" name="weight" value="${latest?.weight ?? ""}" /></div>
          <div class="form-field"><label>Height (cm)</label><input type="number" step="0.1" name="height" value="${latest?.height ?? ""}" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Water (L)</label><input type="number" step="0.1" name="water" /></div>
          <div class="form-field"><label>Sleep (hrs)</label><input type="number" step="0.1" name="sleep" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Steps</label><input type="number" name="steps" /></div>
          <div class="form-field"><label>Mood</label>
            <select name="mood">
              <option value="great">Great</option>
              <option value="good">Good</option>
              <option value="okay">Okay</option>
              <option value="low">Low</option>
              <option value="rough">Rough</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Save today's entry</button>
      </form>
    </div>
  `;
}

async function saveHealthEntry(form) {
  const data = new FormData(form);
  const today = todayKey();
  const records = await dbGetAll("healthRecords");
  const existing = records.find((r) => r.date === today);

  const entry = {
    date: today,
    weight: data.get("weight") ? Number(data.get("weight")) : null,
    height: data.get("height") ? Number(data.get("height")) : null,
    water: data.get("water") ? Number(data.get("water")) : null,
    sleep: data.get("sleep") ? Number(data.get("sleep")) : null,
    steps: data.get("steps") ? Number(data.get("steps")) : null,
    mood: data.get("mood"),
  };

  if (existing) {
    await dbPut("healthRecords", { ...existing, ...entry });
  } else {
    await dbAdd("healthRecords", entry);
  }
}

/* ============================== GOALS ============================== */

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

async function renderGoals() {
  const goals = await dbGetAll("goals");
  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  const sectionsHtml = PERIODS.map((period) => {
    const periodGoals = active.filter((g) => g.period === period);
    if (!periodGoals.length) return "";
    return `
      <div class="card">
        <h2 class="section-title">${period[0].toUpperCase() + period.slice(1)} goals</h2>
        ${periodGoals.map(renderGoalRow).join("")}
      </div>
    `;
  }).join("");

  const historyHtml = completed.length
    ? completed
        .slice(-10)
        .reverse()
        .map((g) => `<div class="history-item"><span class="history-item__title">${escapeHtml(g.title)}</span><span class="history-item__value">Done</span></div>`)
        .join("")
    : `<p class="text-secondary" style="font-size:var(--fs-sm);">Completed goals will show up here.</p>`;

  return `
    <div class="card">
      <h2 class="section-title">Add a goal</h2>
      <form data-form="goal">
        <div class="form-field"><label>Title</label><input type="text" name="title" required /></div>
        <div class="form-row">
          <div class="form-field"><label>Period</label>
            <select name="period">${PERIODS.map((p) => `<option value="${p}">${p}</option>`).join("")}</select>
          </div>
          <div class="form-field"><label>Target (e.g. 12)</label><input type="number" name="target" min="1" value="1" required /></div>
        </div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Add goal</button>
      </form>
    </div>

    ${sectionsHtml || `<div class="empty-state"><h3>No active goals</h3><p>Add one above to start tracking.</p></div>`}

    <div class="card">
      <h2 class="section-title">Goal history</h2>
      ${historyHtml}
    </div>
  `;
}

function renderGoalRow(goal) {
  const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  return `
    <div style="margin-bottom:var(--space-4);">
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);margin-bottom:var(--space-1);">
        <span>${escapeHtml(goal.title)}</span>
        <span class="text-mono text-secondary">${goal.progress}/${goal.target}</span>
      </div>
      <div style="height:8px;border-radius:var(--radius-full);background:var(--bg-sunken);overflow:hidden;">
        <div style="height:100%;width:${percent}%;background:var(--gradient-forge);"></div>
      </div>
      <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);">
        <button class="btn btn--ghost" data-goal-increment="${goal.id}" style="flex:1;">+1 progress</button>
        <button class="btn btn--ghost" data-goal-complete="${goal.id}" style="flex:1;">Mark complete</button>
      </div>
    </div>
  `;
}

async function saveGoal(form) {
  const data = new FormData(form);
  await dbAdd("goals", {
    title: data.get("title"),
    period: data.get("period"),
    target: Number(data.get("target")) || 1,
    progress: 0,
    completed: false,
  });
}

async function incrementGoal(id) {
  const goal = await dbGet("goals", Number(id));
  goal.progress = Math.min(goal.target, goal.progress + 1);
  if (goal.progress >= goal.target) goal.completed = true;
  await dbPut("goals", goal);
}

async function completeGoal(id) {
  const goal = await dbGet("goals", Number(id));
  goal.completed = true;
  goal.progress = goal.target;
  await dbPut("goals", goal);
}

/* ============================== CALENDAR ============================== */

async function renderCalendar() {
  const [streaks, workouts, sessions] = await Promise.all([
    dbGetAll("streaks"),
    dbGetAll("workouts"),
    dbGetAll("martialArtsSessions"),
  ]);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const monthLabel = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const trainingDates = new Set([...workouts, ...sessions].map((w) => w.date));

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(`<div class="calendar-day is-empty"></div>`);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const snapshot = streaks.find((s) => s.date === key);
    const level = snapshot ? (snapshot.fullyCompleted ? "full" : snapshot.completionPercent > 0 ? "partial" : "") : "";
    const isToday = key === todayKey();
    const dot = trainingDates.has(key) ? "•" : "";
    cells.push(
      `<div class="calendar-day ${isToday ? "is-today" : ""}" data-level="${level}" title="${key}">${day}${dot ? `<span style="position:absolute;bottom:2px;font-size:0.5rem;">${dot}</span>` : ""}</div>`
    );
  }

  return `
    <div class="card">
      <div class="calendar-header">
        <button class="calendar-nav-btn" data-cal-nav="-1">&larr;</button>
        <h2 class="section-title" style="margin:0;">${monthLabel}</h2>
        <button class="calendar-nav-btn" data-cal-nav="1">&rarr;</button>
      </div>
      <div class="calendar-grid">
        ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="calendar-weekday">${d}</div>`).join("")}
        ${cells.join("")}
      </div>
      <p class="text-secondary" style="font-size:var(--fs-xs);margin-top:var(--space-3);">
        Ember = fully completed day · faint = partial · • = training logged
      </p>
    </div>
  `;
}

/* ============================== STATISTICS ============================== */

async function renderStatistics() {
  const [workouts, streaks, profile] = await Promise.all([
    dbGetAll("workouts"),
    dbGetAll("streaks"),
    dbGet("profile", "main"),
  ]);

  const sortedStreaks = [...streaks].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-30);
  const last8Weeks = weeklyWorkoutCounts(workouts);
  const totalMinutes = workouts.reduce((s, w) => s + (w.durationMinutes || 0), 0);
  const avgCompletion = sortedStreaks.length
    ? Math.round(sortedStreaks.reduce((s, d) => s + d.completionPercent, 0) / sortedStreaks.length)
    : 0;

  return `
    <div class="stats-grid">
      ${statTile(workouts.length, "Total workouts")}
      ${statTile(totalMinutes, "Minutes trained")}
      ${statTile(profile.longestStreak, "Longest streak")}
      ${statTile(avgCompletion + "%", "Avg. daily completion (30d)")}
    </div>

    <div class="card">
      <h2 class="section-title">Workouts per week</h2>
      ${renderBarChart(last8Weeks.counts, last8Weeks.labels)}
    </div>

    <div class="card">
      <h2 class="section-title">Daily completion trend (30d)</h2>
      ${sortedStreaks.length >= 2 ? renderLineChart(sortedStreaks.map((d) => d.completionPercent), { color: "var(--accent-steel)" }) : `<div class="chart-empty">Use the app for a few more days to see this trend.</div>`}
    </div>
  `;
}

function weeklyWorkoutCounts(workouts) {
  const labels = [];
  const counts = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= weekStart && d < weekEnd;
    }).length;
    labels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
    counts.push(count);
  }
  return { labels, counts };
}

/* ============================== SHELL ============================== */

const RENDERERS = { Health: renderHealth, Goals: renderGoals, Calendar: renderCalendar, Statistics: renderStatistics };

async function render() {
  const root = container();
  if (!root) return;

  root.innerHTML = `
    <div class="segmented-control">
      ${SUBTABS.map((t) => `<button class="segmented-control__item ${t === activeSubTab ? "is-active" : ""}" data-progress-subtab="${t}">${t}</button>`).join("")}
    </div>
    <div id="progress-subview"></div>
  `;

  document.getElementById("progress-subview").innerHTML = await RENDERERS[activeSubTab]();
}

async function handleClick(event) {
  const subtabBtn = event.target.closest("[data-progress-subtab]");
  if (subtabBtn) {
    activeSubTab = subtabBtn.dataset.progressSubtab;
    return render();
  }

  const goalInc = event.target.closest("[data-goal-increment]");
  if (goalInc) {
    await incrementGoal(goalInc.dataset.goalIncrement);
    return render();
  }

  const goalComplete = event.target.closest("[data-goal-complete]");
  if (goalComplete) {
    await completeGoal(goalComplete.dataset.goalComplete);
    return render();
  }

  const calNav = event.target.closest("[data-cal-nav]");
  if (calNav) {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + Number(calNav.dataset.calNav), 1);
    return render();
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.form === "health") await saveHealthEntry(form);
  if (form.dataset.form === "goal") await saveGoal(form);

  await render();
}

export async function initProgress() {
  const root = container();
  if (!root) return;
  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  await render();
}
