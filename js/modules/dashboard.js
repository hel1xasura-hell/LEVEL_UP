import { getState, getLevelInfo, getCompletionPercent, cycleTaskState } from "../store.js";
import { renderForgeRing } from "../components/forgeRing.js";
import { getQuoteOfTheDay } from "../data/quotes.js";

const CHECK_ICON = `<svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>`;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

function getFormattedDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function renderTaskItem(task) {
  return `
    <div class="task-item" data-status="${task.status}" data-task-id="${task.id}" role="button" tabindex="0">
      <span class="task-item__check">${CHECK_ICON}</span>
      <div class="task-item__body">
        <span class="task-item__label">${task.label}</span>
        <span class="task-item__xp">+${task.xp} XP</span>
      </div>
    </div>
  `;
}

function renderStatTile(value, label) {
  return `
    <div class="card stat-tile">
      <span class="stat-tile__value">${value}</span>
      <span class="stat-tile__label">${label}</span>
    </div>
  `;
}

async function render() {
  const container = document.getElementById("dashboard-root");
  if (!container) return;

  const state = await getState();
  const { level, xpIntoLevel, xpForNextLevel, percent: xpPercent } = getLevelInfo(state);
  const completionPercent = getCompletionPercent(state);

  const levelRing = renderForgeRing({
    percent: xpPercent,
    variant: "ember",
    centerHtml: `
      <span class="hero-card__value">${level}</span>
      <span class="hero-card__unit">${xpIntoLevel}/${xpForNextLevel} XP</span>
    `,
  });

  const completionRing = renderForgeRing({
    percent: completionPercent,
    variant: "steel",
    centerHtml: `<span class="hero-card__value">${completionPercent}%</span>`,
  });

  container.innerHTML = `
    <section class="dashboard">

      <div class="dashboard__greeting">
        <h1>${getGreeting()}</h1>
        <p class="dashboard__date">${getFormattedDate()}</p>
        <p class="dashboard__quote">${getQuoteOfTheDay()}</p>
      </div>

      <div class="hero-row">
        <div class="card hero-card">
          ${levelRing}
          <span class="hero-card__label">Level</span>
        </div>
        <div class="card hero-card">
          ${completionRing}
          <span class="hero-card__label">Today's completion</span>
          <div class="streak-row">
            <div class="streak-stat">
              <span class="streak-stat__value">${state.currentStreak}</span>
              <span class="streak-stat__label">Current streak</span>
            </div>
            <div class="streak-stat">
              <span class="streak-stat__value">${state.longestStreak}</span>
              <span class="streak-stat__label">Longest</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 class="section-title">Today's tasks</h2>
        <div class="task-list">
          ${state.tasks.map(renderTaskItem).join("")}
        </div>
      </div>

      <div>
        <h2 class="section-title">Quick stats</h2>
        <div class="stats-grid">
          ${renderStatTile(state.stats.totalWorkouts, "Total workouts")}
          ${renderStatTile(state.stats.totalTrainingMinutes, "Minutes trained")}
          ${renderStatTile(state.stats.booksRead, "Books read")}
          ${renderStatTile(state.stats.meditationSessions, "Meditation sessions")}
        </div>
      </div>

    </section>
  `;
}

async function handleTaskTap(taskId) {
  await cycleTaskState(taskId);
  await render(); // re-render from fresh state so XP/streak/rings all stay in sync
}

/**
 * Initializes the dashboard: renders it once and wires up task-tap
 * interactions via event delegation (so re-renders don't need to
 * re-bind listeners).
 */
export async function initDashboard() {
  const container = document.getElementById("dashboard-root");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const item = event.target.closest(".task-item");
    if (item) handleTaskTap(item.dataset.taskId);
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest(".task-item");
    if (item) {
      event.preventDefault();
      handleTaskTap(item.dataset.taskId);
    }
  });

  await render();
}
