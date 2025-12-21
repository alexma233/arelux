import { getLocale } from './i18n.js';
import { formatDate } from './utils.js';

function wrapKpiValueEl(valueEl) {
  const parent = valueEl?.parentElement;
  if (!parent) return null;
  if (valueEl.dataset?.kpiWrapped === '1') return valueEl.parentElement;

  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-baseline gap-2';
  wrapper.dataset.kpiCompareWrapper = '1';

  parent.insertBefore(wrapper, valueEl);
  wrapper.appendChild(valueEl);
  valueEl.dataset.kpiWrapped = '1';

  return wrapper;
}

function getOrCreateCompareEl(kpiValueId) {
  const valueEl = document.getElementById(kpiValueId);
  if (!valueEl) return null;

  const compareId = `kpi_compare_${kpiValueId.replace(/^kpi_/, '')}`;
  const existing = document.getElementById(compareId);
  if (existing) return existing;

  const wrapper = wrapKpiValueEl(valueEl) || valueEl.parentElement;
  if (!wrapper) return null;

  const compareEl = document.createElement('span');
  compareEl.id = compareId;
  compareEl.className = 'text-sm font-semibold text-muted-foreground hidden whitespace-nowrap';
  // 对比信息显示在 KPI 数值右侧
  wrapper.appendChild(compareEl);
  return compareEl;
}

function setCompareElStyle(compareEl, kind) {
  compareEl.classList.remove(
    'text-muted-foreground',
    'text-emerald-600',
    'dark:text-emerald-400',
    'text-red-600',
    'dark:text-red-400'
  );
  if (kind === 'up') compareEl.classList.add('text-emerald-600', 'dark:text-emerald-400');
  else if (kind === 'down') compareEl.classList.add('text-red-600', 'dark:text-red-400');
  else compareEl.classList.add('text-muted-foreground');
}

function formatPercentAbs(pct) {
  const locale = getLocale();
  const absPercent = Math.abs(pct * 100);
  try {
    const num = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absPercent);
    return `${num}%`;
  } catch {
    return `${absPercent.toFixed(2)}%`;
  }
}

export function updateKpiCompareByKpiId(kpiValueId, currentValue, previousValue, enabled) {
  const compareEl = getOrCreateCompareEl(kpiValueId);
  if (!compareEl) return;

  if (!enabled) {
    compareEl.classList.add('hidden');
    compareEl.textContent = '';
    setCompareElStyle(compareEl, 'none');
    return;
  }

  compareEl.classList.remove('hidden');

  const cur = Number(currentValue);
  const prev = Number(previousValue);

  if (!Number.isFinite(cur) || !Number.isFinite(prev)) {
    // 不可用：直接不展示（不占位）
    compareEl.classList.add('hidden');
    compareEl.textContent = '';
    setCompareElStyle(compareEl, 'none');
    return;
  }

  if (prev === 0) {
    if (cur === 0) {
      compareEl.textContent = `→ ${formatPercentAbs(0)}`;
      setCompareElStyle(compareEl, 'none');
      return;
    }
    compareEl.textContent = '↑ ∞%';
    setCompareElStyle(compareEl, 'up');
    return;
  }

  const pct = (cur - prev) / prev;
  const kind = pct > 0 ? 'up' : pct < 0 ? 'down' : 'none';
  const arrow = kind === 'up' ? '↑' : kind === 'down' ? '↓' : '→';
  compareEl.textContent = `${arrow} ${formatPercentAbs(pct)}`;
  setCompareElStyle(compareEl, kind);
}

export function updateKpiCompare(metricId, currentValue, previousValue, enabled) {
  updateKpiCompareByKpiId(`kpi_${metricId}`, currentValue, previousValue, enabled);
}

export function hideAllKpiCompareLines() {
  document.querySelectorAll('[id^="kpi_compare_"]').forEach((el) => {
    el.classList.add('hidden');
    el.textContent = '';
  });
}

export function calculatePreviousTimeRange({ startTime, endTime, rangeKey }) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;

  // 今日/昨日：按自然日做同比（平移 24h），避免“今日”被平移到昨天的尾段造成口径不一致
  const dayShiftKeys = new Set(['today', 'yesterday']);
  if (dayShiftKeys.has(rangeKey)) {
    const shiftMs = 24 * 60 * 60 * 1000;
    return {
      startTime: formatDate(new Date(start.getTime() - shiftMs)),
      endTime: formatDate(new Date(end.getTime() - shiftMs)),
    };
  }

  const durationMs = end.getTime() - start.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;

  return {
    startTime: formatDate(new Date(start.getTime() - durationMs)),
    endTime: formatDate(new Date(end.getTime() - durationMs)),
  };
}

export function isSecurityCompareAllowed(compareStartTime) {
  const start = new Date(compareStartTime);
  if (!Number.isFinite(start.getTime())) return false;
  const threshold = Date.now() - (14 * 24 * 60 * 60 * 1000 + 60 * 1000);
  return start.getTime() >= threshold;
}
