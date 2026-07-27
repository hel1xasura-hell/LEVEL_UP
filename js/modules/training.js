import { dbGetAll, dbAdd, dbPut, dbGet } from "../db/db.js";
import { renderBarChart } from "../components/charts.js";
import { todayKey } from "../utils/dateUtils.js";
import { checkAchievements, showAchievementToast } from "../achievements.js";

const DISCIPLINES = ["Boxing", "Muay Thai", "Judo", "Brazilian Jiu-Jitsu"];
const TECHNIQUE_STATUSES = ["not-started", "learning", "practicing", "comfortable", "confident"];
const DISCIPLINE_LEVELS = [
  { minMinutes: 0, name: "Beginner" },
  { minMinutes: 300, name: "Foundation" },
  { minMinutes: 900, name: "Developing" },
  { minMinutes: 2100, name: "Intermediate" },
  { minMinutes: 4500, name: "Advanced" },
];

let activeSubTab = "workout";
let restTimerState = { remaining: 0, total: 0, intervalId: null };
let exerciseRowCount = 0;

function container() {
  return document.getElementById("training-root");
}

function disciplineLevel(totalMinutes) {
  let level = DISCIPLINE_LEVELS[0].name;
  for (const tier of DISCIPLINE_LEVELS) {
    if (totalMinutes >= tier.minMinutes) level = tier.name;
  }
  return level;
}

/* ============================== WORKOUT ============================== */

async function computePersonalRecords() {
  const workouts = await dbGetAll("workouts");
  const records = {}; // exerciseId -> { maxWeight, maxReps }

  for (const workout of workouts) {
    for (const entry of workout.exercises || []) {
      const current = records[entry.exerciseId] || { maxWeight: 0, maxReps: 0 };
      current.maxWeight = Math.max(current.maxWeight, entry.weight || 0);
      current.maxReps = Math.max(current.maxReps, entry.reps || 0);
      records[entry.exerciseId] = current;
    }
  }
  return records;
}

function renderRestTimer() {
  const mins = String(Math.floor(restTimerState.remaining / 60)).padStart(2, "0");
  const secs = String(restTimerState.remaining % 60).padStart(2, "0");
  return `
    <div class="card">
      <h2 class="section-title">Rest timer</h2>
      <div style="display:flex;align-items:center;gap:var(--space-4);">
        <span class="text-mono" style="font-size:var(--fs-2xl);font-weight:700;">${mins}:${secs}</span>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
          <button class="btn btn--ghost" data-timer-preset="30">30s</button>
          <button class="btn btn--ghost" data-timer-preset="60">60s</button>
          <button class="btn btn--ghost" data-timer-preset="90">90s</button>
          <button class="btn btn--primary" data-timer-action="toggle">${restTimerState.intervalId ? "Pause" : "Start"}</button>
          <button class="btn btn--ghost" data-timer-action="reset">Reset</button>
        </div>
      </div>
    </div>
  `;
}

async function renderWorkoutView() {
  const [workouts, exercises, records] = await Promise.all([
    dbGetAll("workouts"),
    dbGetAll("exercises"),
    computePersonalRecords(),
  ]);

  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

  const last8Weeks = last8WeekLabelsAndCounts(workouts);

  const historyHtml = sorted.length
    ? sorted
        .slice(0, 15)
        .map(
          (w) => `
        <div class="history-item">
          <div>
            <div class="history-item__title">${w.recoveryDay ? "Recovery day" : `${(w.exercises || []).length} exercise${(w.exercises || []).length === 1 ? "" : "s"}`}</div>
            <div class="history-item__meta">${w.date}${w.notes ? " · " + escapeHtml(w.notes) : ""}</div>
          </div>
          <span class="history-item__value">${w.durationMinutes || 0} min</span>
        </div>`
        )
        .join("")
    : `<div class="empty-state"><h3>No workouts yet</h3><p>Tap the + button to log your first session.</p></div>`;

  const prHtml = Object.keys(records).length
    ? Object.entries(records)
        .map(([exId, r]) => {
          const ex = exercises.find((e) => e.id === exId);
          return `<div class="history-item">
            <span class="history-item__title">${ex ? ex.name : exId}</span>
            <span class="history-item__value">${r.maxWeight > 0 ? r.maxWeight + " kg" : r.maxReps + " reps"}</span>
          </div>`;
        })
        .join("")
    : `<p class="text-secondary" style="font-size:var(--fs-sm);">Log a workout with weights/reps to start tracking PRs.</p>`;

  return `
    <div class="stats-grid">
      ${statTile(workouts.length, "Total workouts")}
      ${statTile(totalMinutes, "Minutes trained")}
    </div>

    ${renderRestTimer()}

    <div class="card">
      <h2 class="section-title">Workouts per week</h2>
      ${renderBarChart(last8Weeks.counts, last8Weeks.labels)}
    </div>

    <div class="card">
      <h2 class="section-title">Personal records</h2>
      ${prHtml}
    </div>

    <div class="card">
      <h2 class="section-title">Workout history</h2>
      ${historyHtml}
    </div>
  `;
}

function last8WeekLabelsAndCounts(workouts) {
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

function statTile(value, label) {
  return `<div class="card stat-tile"><span class="stat-tile__value">${value}</span><span class="stat-tile__label">${label}</span></div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* --------- Log workout modal --------- */

async function openLogWorkoutModal() {
  const exercises = await dbGetAll("exercises");
  exerciseRowCount = 0;

  const modal = document.getElementById("modal-root");
  modal.hidden = false;
  modal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet__header">
        <h2>Log workout</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <form id="workout-form">
        <div class="form-row">
          <div class="form-field">
            <label>Date</label>
            <input type="date" name="date" value="${todayKey()}" required />
          </div>
          <div class="form-field">
            <label>Duration (min)</label>
            <input type="number" name="durationMinutes" min="0" value="30" required />
          </div>
        </div>
        <div class="form-field">
          <label><input type="checkbox" name="recoveryDay" /> Recovery day (rest/mobility only)</label>
        </div>
        <div class="form-row">
          <div class="form-field"><label><input type="checkbox" name="warmUp" checked /> Warm-up done</label></div>
          <div class="form-field"><label><input type="checkbox" name="stretching" checked /> Stretching done</label></div>
        </div>

        <div id="exercise-rows"></div>
        <button type="button" class="btn btn--ghost" id="add-exercise-row" style="width:100%;margin-bottom:var(--space-3);">+ Add exercise</button>

        <div class="form-field">
          <label>Notes</label>
          <textarea name="notes" rows="2"></textarea>
        </div>

        <button type="submit" class="btn btn--primary" style="width:100%;">Save workout</button>
      </form>
    </div>
  `;

  const rowsContainer = document.getElementById("exercise-rows");

  function addExerciseRow() {
    const rowId = exerciseRowCount++;
    const row = document.createElement("div");
    row.className = "form-row";
    row.dataset.exerciseRow = rowId;
    row.innerHTML = `
      <div class="form-field" style="grid-column:1/-1;">
        <label>Exercise</label>
        <select name="exercise-${rowId}">
          ${exercises.map((e) => `<option value="${e.id}">${e.name}</option>`).join("")}
        </select>
      </div>
      <div class="form-field"><label>Sets</label><input type="number" name="sets-${rowId}" min="0" value="3" /></div>
      <div class="form-field"><label>Reps</label><input type="number" name="reps-${rowId}" min="0" value="10" /></div>
      <div class="form-field" style="grid-column:1/-1;"><label>Weight (kg, optional)</label><input type="number" name="weight-${rowId}" min="0" step="0.5" /></div>
    `;
    rowsContainer.appendChild(row);
  }

  document.getElementById("add-exercise-row").addEventListener("click", addExerciseRow);
  addExerciseRow();

  document.getElementById("workout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const exerciseEntries = [];

    rowsContainer.querySelectorAll("[data-exercise-row]").forEach((row) => {
      const id = row.dataset.exerciseRow;
      exerciseEntries.push({
        exerciseId: formData.get(`exercise-${id}`),
        sets: Number(formData.get(`sets-${id}`)) || 0,
        reps: Number(formData.get(`reps-${id}`)) || 0,
        weight: Number(formData.get(`weight-${id}`)) || 0,
      });
    });

    const recoveryDay = formData.get("recoveryDay") === "on";

    await dbAdd("workouts", {
      date: formData.get("date"),
      durationMinutes: Number(formData.get("durationMinutes")) || 0,
      recoveryDay,
      warmUp: formData.get("warmUp") === "on",
      stretching: formData.get("stretching") === "on",
      exercises: recoveryDay ? [] : exerciseEntries,
      notes: formData.get("notes") || "",
    });

    closeModal();
    await maybeUnlockAchievements();
    await rerender();
  });
}

async function maybeUnlockAchievements() {
  const [workouts, profile] = await Promise.all([dbGetAll("workouts"), dbGet("profile", "main")]);
  const level = Math.floor(profile.xp / 100) + 1;
  const unlocked = await checkAchievements({
    workoutCount: workouts.length,
    currentStreak: profile.currentStreak,
    level,
  });
  unlocked.forEach(showAchievementToast);
}

function closeModal() {
  const modal = document.getElementById("modal-root");
  modal.hidden = true;
  modal.innerHTML = "";
}

/* --------- Rest timer interactions --------- */

function tickTimer() {
  restTimerState.remaining -= 1;
  if (restTimerState.remaining <= 0) {
    clearInterval(restTimerState.intervalId);
    restTimerState.intervalId = null;
    restTimerState.remaining = 0;
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = container();
  if (!el) return;
  const existing = el.querySelector(".card");
  if (!existing) return;
  const timerCardHtml = renderRestTimer();
  const timerCard = el.querySelector('[data-timer-action]')?.closest(".card");
  if (timerCard) timerCard.outerHTML = timerCardHtml;
}

function handleTimerPreset(seconds) {
  clearInterval(restTimerState.intervalId);
  restTimerState.intervalId = null;
  restTimerState.remaining = seconds;
  restTimerState.total = seconds;
  updateTimerDisplay();
}

function handleTimerToggle() {
  if (restTimerState.intervalId) {
    clearInterval(restTimerState.intervalId);
    restTimerState.intervalId = null;
  } else {
    if (restTimerState.remaining <= 0) return;
    restTimerState.intervalId = setInterval(tickTimer, 1000);
  }
  updateTimerDisplay();
}

function handleTimerReset() {
  clearInterval(restTimerState.intervalId);
  restTimerState.intervalId = null;
  restTimerState.remaining = restTimerState.total;
  updateTimerDisplay();
}

/* ============================== MARTIAL ARTS ============================== */

let activeDiscipline = DISCIPLINES[0];

async function renderMartialArtsView() {
  const [sessions, techniques] = await Promise.all([
    dbGetAll("martialArtsSessions"),
    dbGetAll("techniques"),
  ]);

  const disciplineSessions = sessions.filter((s) => s.discipline === activeDiscipline);
  const totalMinutes = disciplineSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const level = disciplineLevel(totalMinutes);
  const disciplineTechniques = techniques.filter((t) => t.discipline === activeDiscipline);

  const sortedSessions = [...disciplineSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const historyHtml = sortedSessions.length
    ? sortedSessions
        .slice(0, 10)
        .map(
          (s) => `
        <div class="history-item">
          <div>
            <div class="history-item__title">${s.date}</div>
            ${s.notes ? `<div class="history-item__meta">${escapeHtml(s.notes)}</div>` : ""}
          </div>
          <span class="history-item__value">${s.durationMinutes} min</span>
        </div>`
        )
        .join("")
    : `<div class="empty-state"><h3>No sessions yet</h3><p>Log your first ${activeDiscipline} session.</p></div>`;

  const techniquesHtml = disciplineTechniques
    .map(
      (t) => `
      <div class="technique-item" data-technique-id="${t.id}">
        <span>${t.name}</span>
        <button class="technique-pill" data-status="${t.status}" data-cycle-technique="${t.id}">${formatStatus(t.status)}</button>
      </div>`
    )
    .join("");

  return `
    <div class="segmented-control" id="discipline-tabs">
      ${DISCIPLINES.map(
        (d) => `<button class="segmented-control__item ${d === activeDiscipline ? "is-active" : ""}" data-discipline="${d}">${d}</button>`
      ).join("")}
    </div>

    <div class="card" style="text-align:center;">
      <span class="level-pill">${level}</span>
      <div class="stats-grid" style="margin-top:var(--space-4);">
        ${statTile(disciplineSessions.length, "Sessions")}
        ${statTile(totalMinutes, "Minutes trained")}
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">Techniques</h2>
      ${techniquesHtml}
    </div>

    <div class="card">
      <h2 class="section-title">Training history</h2>
      ${historyHtml}
    </div>
  `;
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
}

async function cycleTechnique(techniqueId) {
  const technique = await dbGet("techniques", techniqueId);
  const nextIndex = (TECHNIQUE_STATUSES.indexOf(technique.status) + 1) % TECHNIQUE_STATUSES.length;
  technique.status = TECHNIQUE_STATUSES[nextIndex];
  await dbPut("techniques", technique);

  if (technique.status === "confident") {
    const unlocked = await checkAchievements({ hasConfidentTechnique: true, workoutCount: 0, currentStreak: 0, level: 0 });
    unlocked.forEach(showAchievementToast);
  }
}

async function openLogSessionModal() {
  const modal = document.getElementById("modal-root");
  modal.hidden = false;
  modal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet__header">
        <h2>Log session</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <form id="session-form">
        <div class="form-field">
          <label>Discipline</label>
          <select name="discipline">
            ${DISCIPLINES.map((d) => `<option value="${d}" ${d === activeDiscipline ? "selected" : ""}>${d}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Date</label><input type="date" name="date" value="${todayKey()}" required /></div>
          <div class="form-field"><label>Duration (min)</label><input type="number" name="durationMinutes" min="0" value="60" required /></div>
        </div>
        <div class="form-field"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>
        <button type="submit" class="btn btn--primary" style="width:100%;">Save session</button>
      </form>
    </div>
  `;

  document.getElementById("session-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    await dbAdd("martialArtsSessions", {
      discipline: formData.get("discipline"),
      date: formData.get("date"),
      durationMinutes: Number(formData.get("durationMinutes")) || 0,
      notes: formData.get("notes") || "",
    });
    activeDiscipline = formData.get("discipline");
    closeModal();
    await rerender();
  });
}

/* ============================== SHELL ============================== */

async function render() {
  const root = container();
  if (!root) return;

  root.innerHTML = `
    <div class="segmented-control" id="training-tabs">
      <button class="segmented-control__item ${activeSubTab === "workout" ? "is-active" : ""}" data-subtab="workout">Workout</button>
      <button class="segmented-control__item ${activeSubTab === "martial-arts" ? "is-active" : ""}" data-subtab="martial-arts">Martial Arts</button>
    </div>
    <div id="training-subview"></div>
  `;

  const subview = document.getElementById("training-subview");
  subview.innerHTML = activeSubTab === "workout" ? await renderWorkoutView() : await renderMartialArtsView();
}

async function rerender() {
  await render();
}

function handleRootClick(event) {
  const subtabBtn = event.target.closest("[data-subtab]");
  if (subtabBtn) {
    activeSubTab = subtabBtn.dataset.subtab;
    render();
    return;
  }

  const disciplineBtn = event.target.closest("[data-discipline]");
  if (disciplineBtn) {
    activeDiscipline = disciplineBtn.dataset.discipline;
    render();
    return;
  }

  const timerPreset = event.target.closest("[data-timer-preset]");
  if (timerPreset) {
    handleTimerPreset(Number(timerPreset.dataset.timerPreset));
    return;
  }

  const timerAction = event.target.closest("[data-timer-action]");
  if (timerAction) {
    if (timerAction.dataset.timerAction === "toggle") handleTimerToggle();
    if (timerAction.dataset.timerAction === "reset") handleTimerReset();
    return;
  }

  const techniqueBtn = event.target.closest("[data-cycle-technique]");
  if (techniqueBtn) {
    cycleTechnique(techniqueBtn.dataset.cycleTechnique).then(rerender);
    return;
  }

  const fab = event.target.closest("[data-fab='training']");
  if (fab) {
    if (activeSubTab === "workout") openLogWorkoutModal();
    else openLogSessionModal();
  }
}

export async function initTraining() {
  const root = container();
  if (!root) return;
  root.addEventListener("click", handleRootClick);
  await render();
}
