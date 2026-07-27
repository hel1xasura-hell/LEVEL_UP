/**
 * LEVEL UP — Quote pool
 * Original short lines, not attributed quotes. One is shown per day,
 * picked deterministically (see dashboard.js) so it stays stable
 * across multiple opens of the app on the same day.
 */
export const QUOTES = [
  "Discipline is the bridge between today's effort and tomorrow's strength.",
  "You don't rise to the level of your goals. You fall to the level of your habits.",
  "Small reps, done daily, beat big efforts done rarely.",
  "The body keeps score. Show up for it.",
  "Consistency is a skill. Train it like any other.",
  "Comfort is the enemy of growth.",
  "Every session is a deposit. Compound interest is real.",
  "You are one workout away from a better mood.",
  "Strength is built in the rounds you almost skipped.",
  "The mat doesn't lie. Neither should your effort.",
  "Progress is quiet. Trust the process on the loud days too.",
  "Rest is part of training, not a break from it.",
  "What you repeat, you become.",
  "Today's discomfort is tomorrow's baseline.",
  "Show up especially on the days you don't want to.",
  "A calm mind trains a strong body.",
  "Master the basics before chasing the advanced.",
  "Your future self is built from today's decisions.",
  "Effort compounds when nobody's watching.",
  "The streak isn't the goal. The habit is.",
];

/**
 * Returns today's quote, stable for the whole day.
 * @returns {string}
 */
export function getQuoteOfTheDay() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}
