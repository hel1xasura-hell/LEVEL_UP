/**
 * LEVEL UP — App entry point.
 *
 * Phase 1 responsibilities only:
 *   1. Switch between the 5 top-level pages via the bottom nav.
 *   2. Register the service worker for offline support.
 *
 * As later phases land, each module will export an `init()` that this
 * file calls — this file stays a thin orchestrator, not where feature
 * logic lives.
 */

import { initDashboard } from "./modules/dashboard.js";
import { initTraining } from "./modules/training.js";
import { initBrain } from "./modules/brain.js";
import { initProgress } from "./modules/progress.js";
import { initSettings, applyStoredTheme } from "./modules/settings.js";
import { openDB } from "./db/db.js";
import { seedDatabase } from "./db/seed.js";

const NAV_BUTTONS = document.querySelectorAll(".nav-item");
const PAGES = document.querySelectorAll(".page");

/**
 * Show the page matching `target`, hide the rest, and sync the
 * active state on the nav buttons.
 * @param {string} target - matches a page's data-page attribute
 */
function goToPage(target) {
  PAGES.forEach((page) => {
    page.hidden = page.dataset.page !== target;
  });

  NAV_BUTTONS.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.target === target);
  });

  // Remember last tab across reloads (simple, no localStorage schema yet)
  localStorage.setItem("levelup:lastTab", target);
}

function initNavigation() {
  NAV_BUTTONS.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.target));
  });

  // Restore last visited tab, defaulting to home
  const lastTab = localStorage.getItem("levelup:lastTab") || "home";
  goToPage(lastTab);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}

function initModalDismiss() {
  const modal = document.getElementById("modal-root");
  if (!modal) return;
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-modal]")) {
      modal.hidden = true;
      modal.innerHTML = "";
    }
  });
}

async function init() {
  applyStoredTheme();
  initNavigation();
  initModalDismiss();
  await openDB();
  await seedDatabase();
  await initDashboard();
  await initTraining();
  await initBrain();
  await initProgress();
  await initSettings();
  registerServiceWorker();
}

init();
