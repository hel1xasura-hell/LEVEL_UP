/**
 * LEVEL UP — Forge Ring
 * The app's signature radial-progress element. Used for XP/level,
 * daily completion, and (in later phases) any other "how full is
 * this" visualization — streaks, goal progress, focus sessions, etc.
 */

let ringIdCounter = 0;

/**
 * Builds an HTML string for a circular progress ring.
 * @param {object} opts
 * @param {number} opts.percent - 0-100
 * @param {number} [opts.size=120] - width/height in px
 * @param {number} [opts.strokeWidth=10]
 * @param {"ember"|"steel"} [opts.variant="ember"]
 * @param {string} [opts.centerHtml=""] - HTML placed in the ring's center
 * @returns {string}
 */
export function renderForgeRing({
  percent,
  size = 120,
  strokeWidth = 10,
  variant = "ember",
  centerHtml = "",
}) {
  const id = `forge-ring-${ringIdCounter++}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  const gradientStops =
    variant === "steel"
      ? `<stop offset="0%" stop-color="#3f6a80" /><stop offset="100%" stop-color="#5b8fa8" />`
      : `<stop offset="0%" stop-color="#ff6b35" /><stop offset="100%" stop-color="#ffb648" />`;

  return `
    <div class="forge-ring" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            ${gradientStops}
          </linearGradient>
        </defs>
        <circle
          cx="${size / 2}" cy="${size / 2}" r="${radius}"
          fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}"
        />
        <circle
          class="forge-ring__progress"
          cx="${size / 2}" cy="${size / 2}" r="${radius}"
          fill="none" stroke="url(#${id})" stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 ${size / 2} ${size / 2})"
        />
      </svg>
      <div class="forge-ring__center">${centerHtml}</div>
    </div>
  `;
}
