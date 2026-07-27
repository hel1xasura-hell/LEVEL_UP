/**
 * LEVEL UP — Seed data
 * Populates first-run defaults. Every seed function checks the store
 * is empty before writing, so this is safe to call on every app
 * launch without ever clobbering real progress.
 */

import { dbCount, dbAdd } from "./db.js";

const DEFAULT_TASK_TEMPLATES = [
  { id: "workout", label: "Workout", xp: 50, category: "training" },
  { id: "martial-arts", label: "Martial arts practice", xp: 40, category: "training" },
  { id: "reading", label: "Reading", xp: 20, category: "brain" },
  { id: "meditation", label: "Meditation", xp: 15, category: "brain" },
  { id: "water", label: "Water goal", xp: 10, category: "health" },
  { id: "sleep", label: "Sleep goal", xp: 10, category: "health" },
  { id: "chess", label: "Chess practice", xp: 15, category: "brain" },
];

const DEFAULT_EXERCISES = [
  { id: "push-ups", name: "Push-ups", category: "strength" },
  { id: "squats", name: "Squats", category: "strength" },
  { id: "bench-press", name: "Bench Press", category: "strength" },
  { id: "deadlift", name: "Deadlift", category: "strength" },
  { id: "pull-ups", name: "Pull-ups", category: "strength" },
  { id: "plank", name: "Plank", category: "core" },
  { id: "lunges", name: "Lunges", category: "strength" },
  { id: "overhead-press", name: "Overhead Press", category: "strength" },
  { id: "rows", name: "Rows", category: "strength" },
  { id: "burpees", name: "Burpees", category: "cardio" },
];

const DISCIPLINES = ["Boxing", "Muay Thai", "Judo", "Brazilian Jiu-Jitsu"];

const TECHNIQUES_BY_DISCIPLINE = {
  Boxing: ["Jab", "Cross", "Hook", "Uppercut", "Slip Counter"],
  "Muay Thai": ["Roundhouse Kick", "Teep", "Elbow Strike", "Knee Strike", "Clinch Control"],
  Judo: ["Osoto Gari", "Ippon Seoi Nage", "Uchi Mata", "Kesa Gatame", "Tai Otoshi"],
  "Brazilian Jiu-Jitsu": ["Armbar", "Triangle Choke", "Guard Retention", "Mount Escape", "Rear Naked Choke"],
};

const DEFAULT_ACHIEVEMENTS = [
  { id: "first-workout", title: "First Rep", description: "Log your first workout.", unlockedDate: null },
  { id: "streak-7", title: "One Week Forged", description: "Reach a 7-day streak.", unlockedDate: null },
  { id: "streak-30", title: "Iron Habit", description: "Reach a 30-day streak.", unlockedDate: null },
  { id: "level-5", title: "Level 5", description: "Reach level 5.", unlockedDate: null },
  { id: "first-technique-confident", title: "Sharp Technique", description: "Mark a technique as Confident.", unlockedDate: null },
];

async function seedProfile() {
  const count = await dbCount("profile");
  if (count > 0) return;

  await dbAdd("profile", {
    id: "main",
    name: "",
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    streakCountedToday: false,
    joinedDate: new Date().toISOString().slice(0, 10),
  });
}

async function seedTaskTemplates() {
  const count = await dbCount("taskTemplates");
  if (count > 0) return;
  for (const task of DEFAULT_TASK_TEMPLATES) {
    await dbAdd("taskTemplates", task);
  }
}

async function seedAchievements() {
  const count = await dbCount("achievements");
  if (count > 0) return;
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    await dbAdd("achievements", achievement);
  }
}

async function seedExercises() {
  const count = await dbCount("exercises");
  if (count > 0) return;
  for (const exercise of DEFAULT_EXERCISES) {
    await dbAdd("exercises", exercise);
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function seedTechniques() {
  const count = await dbCount("techniques");
  if (count > 0) return;
  for (const discipline of DISCIPLINES) {
    for (const name of TECHNIQUES_BY_DISCIPLINE[discipline]) {
      await dbAdd("techniques", {
        id: `${slugify(discipline)}-${slugify(name)}`,
        discipline,
        name,
        status: "not-started",
      });
    }
  }
}

/** Runs all seed steps. Safe to call on every app start. */
export async function seedDatabase() {
  await seedProfile();
  await seedTaskTemplates();
  await seedAchievements();
  await seedExercises();
  await seedTechniques();
}
