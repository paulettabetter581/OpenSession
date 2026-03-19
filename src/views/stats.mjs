import { escapeHtml } from "../markdown.mjs";
import { layout } from "./layout.mjs";
import { t } from "../i18n.mjs";

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function renderLineChart(data, width = 600, height = 200) {
  if (!data || data.length === 0) return '<svg width="600" height="200"><text x="300" y="100" text-anchor="middle">No data</text></svg>';
  
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  
  const maxTokens = Math.max(...data.map(d => d.total_tokens || 0), 1);
  
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((d.total_tokens || 0) / maxTokens) * innerHeight;
    return `${x},${y}`;
  });
  
  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${padding.left + innerWidth},${padding.top + innerHeight} L ${padding.left},${padding.top + innerHeight} Z`;
  
  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * innerHeight;
    const val = maxTokens - (i / 4) * maxTokens;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4 4" />`;
    gridLines += `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${formatNumber(val)}</text>`;
  }
  
  let xLabels = '';
  if (data.length > 0) {
    xLabels += `<text x="${padding.left}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${data[0].day.substring(5)}</text>`;
    if (data.length > 1) {
      xLabels += `<text x="${width - padding.right}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${data[data.length - 1].day.substring(5)}</text>`;
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
      <defs>
        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaData}" fill="url(#gradient)" />
      <path d="${pathData}" fill="none" stroke="#6366f1" stroke-width="2" />
      ${points.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#6366f1" />`).join('')}
      ${xLabels}
    </svg>
  `;
}

function renderPieChart(data, width = 300, height = 300) {
  if (!data || data.length === 0) return '<svg width="300" height="300"><text x="150" y="150" text-anchor="middle">No data</text></svg>';
  
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 20;
  
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);
  if (total === 0) return '<svg width="300" height="300"><text x="150" y="150" text-anchor="middle">No data</text></svg>';
  
  let currentAngle = 0;
  let paths = '';
  let legend = '';
  
  data.forEach((d, i) => {
    const sliceAngle = ((d.count || 0) / total) * 2 * Math.PI;
    const color = colors[i % colors.length];
    
    if (sliceAngle > 0) {
      // If it's a full circle
      if (sliceAngle >= 2 * Math.PI - 0.001) {
        paths += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />`;
      } else {
        const x1 = cx + radius * Math.cos(currentAngle);
        const y1 = cy + radius * Math.sin(currentAngle);
        const x2 = cx + radius * Math.cos(currentAngle + sliceAngle);
        const y2 = cy + radius * Math.sin(currentAngle + sliceAngle);
        
        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
        
        paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${color}" />`;
      }
    }
    
    currentAngle += sliceAngle;
    
    legend += `
      <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; margin-right: 8px; border-radius: 2px;"></span>
        <span style="font-size: 12px; color: #4b5563;">${escapeHtml(d.model || 'Unknown')} (${formatNumber(d.count || 0)})</span>
      </div>
    `;
  });
  
  return `
    <div style="display: flex; align-items: center; gap: 20px;">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
        ${paths}
      </svg>
      <div class="chart-legend">
        ${legend}
      </div>
    </div>
  `;
}

function renderBarChart(data, width = 600, height = 200) {
  if (!data || data.length === 0) return '<svg width="600" height="200"><text x="300" y="100" text-anchor="middle">No data</text></svg>';
  
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  
  const maxCount = Math.max(...data.map(d => d.count || 0), 1);
  const barWidth = Math.max((innerWidth / data.length) - 4, 2);
  
  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * innerHeight;
    const val = maxCount - (i / 4) * maxCount;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4 4" />`;
    gridLines += `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${formatNumber(val)}</text>`;
  }
  
  const bars = data.map((d, i) => {
    const x = padding.left + (i / data.length) * innerWidth + 2;
    const barHeight = ((d.count || 0) / maxCount) * innerHeight;
    const y = padding.top + innerHeight - barHeight;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#6366f1" rx="2" />`;
  }).join('');
  
  let xLabels = '';
  if (data.length > 0) {
    xLabels += `<text x="${padding.left + barWidth/2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${data[0].day.substring(5)}</text>`;
    if (data.length > 1) {
      xLabels += `<text x="${width - padding.right - barWidth/2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${data[data.length - 1].day.substring(5)}</text>`;
    }
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
      ${gridLines}
      ${bars}
      ${xLabels}
    </svg>
  `;
}

export function renderStatsPage(data) {
  const { tokenStats = [], modelDistribution = [], dailySessions = [], overview = {} } = data;
  
  const totalTokens = tokenStats.reduce((sum, d) => sum + (d.total_tokens || 0), 0);
  
  const content = `
    <div class="stats-page">
      <header class="page-header">
        <h1>${t("stats.title")}</h1>
      </header>
      
      <section class="stats-overview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">${t("stats.total_sessions")}</h3>
          <p class="stat-value" style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${formatNumber(overview.totalSessions || 0)}</p>
        </div>
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">${t("stats.total_messages")}</h3>
          <p class="stat-value" style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${formatNumber(overview.totalMessages || 0)}</p>
        </div>
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">${t("stats.token_usage")}</h3>
          <p class="stat-value" style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${formatNumber(totalTokens)}</p>
        </div>
      </section>

      <section class="chart-section" style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${t("stats.token_trend")}</h2>
        <div style="overflow-x: auto;">
          ${renderLineChart(tokenStats)}
        </div>
      </section>

      <section class="chart-section" style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${t("stats.model_distribution")}</h2>
        <div style="overflow-x: auto;">
          ${renderPieChart(modelDistribution)}
        </div>
      </section>

      <section class="chart-section" style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${t("stats.daily_sessions")}</h2>
        <div style="overflow-x: auto;">
          ${renderBarChart(dailySessions)}
        </div>
      </section>
    </div>
  `;
  
  return layout(t("stats.title"), content);
}
