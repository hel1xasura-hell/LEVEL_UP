/**
 * LEVEL UP — Achievements
 * Call checkAchievements() after anything that could unlock a badge
 * (finishing a task, logging a workout, leveling up, hitting a
 * streak milestone, mastering a technique). Returns any newly
 * unlocked badges so the caller can show a toast/notification.
 */

import { dbGetAll, dbPut } from "./db/db.js";

/**
 * @param {object} ctx - whatever the caller already knows, to avoid
 *   re-fetching: { xp, level, currentStreak, workoutCount, hasConfidentTechnique }
 * @returns {Promise<object[]>} newly unlocked achievement records
 */
export async function checkAchievements(ctx) {
  const achievements = await dbGetAll("achievements");
  const newlyUnlocked = [];

  const conditions = {
    "first-workout": ctx.workoutCount >= 1,
    "streak-7": ctx.currentStreak >= 7,
    "streak-30": ctx.currentStreak >= 30,
    "level-5": ctx.level >= 5,
    "first-technique-confident": !!ctx.hasConfidentTechnique,
  };

  for (const achievement of achievements) {
    if (achievement.unlockedDate) continue;
    if (!conditions[achievement.id]) continue;

    achievement.unlockedDate = new Date().toISOString().slice(0, 10);
    await dbPut("achievements", achievement);
    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}

/** Simple toast for a newly unlocked badge. Fades out on its own. */
export function showAchievementToast(achievement) {
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <span class="achievement-toast__icon">🏆</span>
    <div>
      <div class="achievement-toast__title">${achievement.title}</div>
      <div class="achievement-toast__desc">${achievement.description}</div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}
