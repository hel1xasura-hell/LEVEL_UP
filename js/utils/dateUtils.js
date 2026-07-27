/**
 * LEVEL UP — Date utilities
 * Shared across every module that logs data by day (tasks, workouts,
 * health records, brain training, etc.) so date keys are consistent
 * throughout the whole app.
 */

/** @returns {string} today's date as 'YYYY-MM-DD' in local time */
export function todayKey() {
  return dateKey(new Date());
}

/** @param {Date} date @returns {string} 'YYYY-MM-DD' in local time */
export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
