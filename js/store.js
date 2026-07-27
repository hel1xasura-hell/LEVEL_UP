/**
 * LEVEL UP — Store
 *
 * The dashboard's data-access layer, now backed by IndexedDB (see
 * js/db/db.js) instead of the Phase 2 localStorage placeholder.
 *
 * Exported function names are unchanged from Phase 2 (getState,
 * getLevelInfo, getCompletionPercent, cycleTaskState) so dashboard.js
 * barely changes — but getState/cycleTaskState are now async, since
 * IndexedDB itself is asynchronous. getLevelInfo/getCompletionPercent
 * stay pure, synchronous functions (no I/O) since they just do math
 * on a state object you already have.
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex, dbAdd } from "./db/db.js";
import { todayKey } from "./utils/dateUtils.js";

const XP_PER_LEVEL = 100;
const STATUS_ORDER = ["not-started", "in-progress", "completed"];

/** True if every template task has a 'completed' log entry in `logs`. */
function isFullyCompleted(templates, logs) {
  if (templates.length === 0) return false;
  return templates.every((t) => {
    const log = logs.find((l) => l.taskId === t.id);
    return log && log.status === "completed";
  });
}

/**
 * Rolls the profile forward to "today": resets streakCountedToday,
 * and zeroes currentStreak if yesterday wasn't fully completed.
 * Mutates and persists `profile` in place if a rollover happens.
 */
async function rollForwardIfNewDay(profile, templates) {
  const today = todayKey();
  if (profile.lastActiveDate === today) return profile;

  if (profile.lastActiveDate) {
    const prevLogs = await dbGetAllByIndex("taskLogs", "date", profile.lastActiveDate);
    const wasFullyCompleted = isFullyCompleted(templates, prevLogs);
    if (!wasFullyCompleted) {
      profile.currentStreak = 0;
    }
    const completedCount = prevLogs.filter((l) => l.status === "completed").length;
    const completionPercent =
      templates.length > 0 ? Math.round((completedCount / templates.length) * 100) : 0;
    await dbAdd("streaks", {
      date: profile.lastActiveDate,
      completionPercent,
      fullyCompleted: wasFullyCompleted,
    });
  }

  profile.streakCountedToday = false;
  profile.lastActiveDate = today;
  await dbPut("profile", profile);
  return profile;
}

/**
 * Loads the full dashboard state: profile (xp/streaks), today's tasks
 * (templates merged with today's logged status), and quick stats.
 * @returns {Promise<object>}
 */
export async function getState() {
  const [profile, templates] = await Promise.all([
    dbGet("profile", "main"),
    dbGetAll("taskTemplates"),
  ]);

  await rollForwardIfNewDay(profile, templates);

  const todayLogs = await dbGetAllByIndex("taskLogs", "date", todayKey());
  const tasks = templates.map((t) => {
    const log = todayLogs.find((l) => l.taskId === t.id);
    return { ...t, status: log ? log.status : "not-started" };
  });

  const [workouts, brainSessions] = await Promise.all([
    dbGetAll("workouts"),
    dbGetAll("brainTraining"),
  ]);

  const stats = {
    totalWorkouts: workouts.length,
    totalTrainingMinutes: workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0),
    booksRead: new Set(brainSessions.filter((b) => b.type === "reading").map((b) => b.book)).size,
    meditationSessions: brainSessions.filter((b) => b.type === "meditation").length,
  };

  return {
    xp: profile.xp,
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
    streakCountedToday: profile.streakCountedToday,
    tasks,
    stats,
  };
}

/** @param {object} state @returns {{level:number, xpIntoLevel:number, xpForNextLevel:number, percent:number}} */
export function getLevelInfo(state) {
  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = state.xp % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    percent: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}

/** @param {object} state @returns {number} 0-100 */
export function getCompletionPercent(state) {
  const completed = state.tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / state.tasks.length) * 100);
}

/**
 * Advances a task to its next status, adjusting XP and streak,
 * persisting a taskLogs entry for today, and updating the profile.
 * @param {string} taskId
 * @returns {Promise<object>} the refreshed state
 */
export async function cycleTaskState(taskId) {
  const state = await getState(); // ensures day-rollover has happened
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];
  const profile = await dbGet("profile", "main");

  if (nextStatus === "completed") {
    profile.xp += task.xp;
  } else if (task.status === "completed") {
    profile.xp = Math.max(0, profile.xp - task.xp);
  }

  const today = todayKey();
  const todayLogs = await dbGetAllByIndex("taskLogs", "date", today);
  const existingLog = todayLogs.find((l) => l.taskId === taskId);

  if (existingLog) {
    existingLog.status = nextStatus;
    await dbPut("taskLogs", existingLog);
  } else {
    await dbAdd("taskLogs", { date: today, taskId, status: nextStatus });
  }

  const templates = await dbGetAll("taskTemplates");
  const updatedLogs = await dbGetAllByIndex("taskLogs", "date", today);
  const allCompleted = isFullyCompleted(templates, updatedLogs);

  if (allCompleted && !profile.streakCountedToday) {
    profile.currentStreak += 1;
    profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
    profile.streakCountedToday = true;
  } else if (!allCompleted && profile.streakCountedToday) {
    profile.currentStreak = Math.max(0, profile.currentStreak - 1);
    profile.streakCountedToday = false;
  }

  await dbPut("profile", profile);

  return getState();
}
