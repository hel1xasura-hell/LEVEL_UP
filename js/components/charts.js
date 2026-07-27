/**
 * LEVEL UP — Charts
 * Minimal, dependency-free SVG bar/line charts. No external chart
 * library, so the app stays fully offline with zero network calls.
 */

/**
 * @param {number[]} values
 * @param {string[]} labels
 * @param {object} [opts]
 * @returns {string} HTML
 */
export function renderBarChart(values, labels, opts = {}) {
  const { width = 320, height = 140, color = "var(--accent-ember)" } = opts;
  const max = Math.max(1, ...values);
  const padding = 20;
  const barGap = 6;
  const barWidth = (width - padding * 2) / values.length - barGap;

  const bars = values
    .map((v, i) => {
      const barHeight = (v / max) * (height - padding * 2);
      const x = padding + i * (barWidth + barGap);
      const y = height - padding - barHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(2, barHeight)}" rx="3" fill="${color}" />`;
    })
    .join("");

  const labelEls = labels
    .map((l, i) => {
      const x = padding + i * (barWidth + barGap) + barWidth / 2;
      return `<text x="${x}" y="${height - 4}" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">${l}</text>`;
    })
    .join("");

  return `
    <svg class="chart" width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${bars}${labelEls}
    </svg>
  `;
}

/**
 * @param {number[]} values
 * @param {object} [opts]
 * @returns {string} HTML
 */
export function renderLineChart(values, opts = {}) {
  const { width = 320, height = 140, color = "var(--accent-steel)" } = opts;
  if (values.length === 0) {
    return `<div class="chart-empty">Not enough data yet.</div>`;
  }
  const padding = 16;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / Math.max(1, values.length - 1);

  const points = values
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <svg class="chart" width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `;
}
