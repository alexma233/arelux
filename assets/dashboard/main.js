
import { metricsConfig } from './constants.js';
import { fetchBatchData, fetchData, processData } from './api.js';
import { calculateTimeRange, formatCount, handleTimeRangeChange } from './utils.js';
import { ensureTopCharts, initCharts, resizeCharts } from './initCharts.js';
import {
  calculatePreviousTimeRange,
  hideAllKpiCompareLines,
  isSecurityCompareAllowed,
} from './compare.js';
import {
  applyTranslations,
  getLocale,
  initI18n,
  initLanguageSwitcher,
  onLocaleChange,
  t,
} from './i18n.js';
import {
  updateBandwidthSection,
  updateEdgeFunctionsSection,
  updateOriginPullSection,
  updatePerformanceSection,
  updateRequestsSection,
  updateSecuritySection,
  updateTopAnalysisSection,
  updateTrafficSection,
} from './charts.js';

let charts = null;
const THEME_EVENT_NAME = 'eo:themechange';
let topAnalysisActivated = false;
let topAnalysisRequestId = 0;

const dashboardCache = {
  core: null,
  zones: null,
  pagesBuild: null,
  pagesCloudFunctionTrend: null,
  pagesCloudFunctionMonthly: null,
  topAnalysis: null,
};

function getEchartsTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : null;
}

function getControlState() {
  const rangeKey = document.getElementById('timeRange')?.value || '30min';
  const interval = document.getElementById('interval')?.value || 'auto';
  const zoneId = (document.getElementById('zoneId')?.value || '').trim();
  return { rangeKey, interval, zoneId };
}

function isSameControlState(a, b) {
  if (!a || !b) return false;
  return a.rangeKey === b.rangeKey && a.interval === b.interval && a.zoneId === b.zoneId;
}

function disposeCharts(nextCharts) {
  if (!nextCharts) return;
  for (const chart of Object.values(nextCharts)) {
    if (!chart || typeof chart.dispose !== 'function') continue;
    try {
      chart.dispose();
    } catch {
      // ignore
    }
  }
}

let rebuildPromise = null;

function scheduleChartsRebuild() {
  if (rebuildPromise) return;

  rebuildPromise = Promise.resolve()
    .then(async () => {
      if (!charts) return;
      disposeCharts(charts);
      charts = initCharts(getEchartsTheme(), { includeTop: topAnalysisActivated });
      resizeCharts(charts);
      rerenderFromCache({ includeTop: true, includePages: true });
    })
    .finally(() => {
      rebuildPromise = null;
    });
}

function waitForEchartsReady({ timeoutMs = 15000 } = {}) {
  // 注意：echarts 脚本使用 defer，模块脚本可能先执行；这里做就绪等待，避免 initCharts 报错
  if (globalThis.echarts?.init) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (globalThis.echarts?.init) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}

function setupTopAnalysisLazyLoad() {
  const target = document.getElementById('section_top_analysis');
  if (!target) return;

  // 兼容性：IntersectionObserver 不可用时，直接激活（但仍不强制立刻加载）
  if (!('IntersectionObserver' in window)) {
    topAnalysisActivated = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      topAnalysisActivated = true;
      observer.disconnect();
      // 进入可视区域后再拉取 Top 指标 + 地图数据
      loadTopAnalysisInBackground();
    },
    { rootMargin: '200px 0px' }
  );

  observer.observe(target);
}

function loadTopAnalysisInBackground() {
  if (!charts) return;
  const requestId = ++topAnalysisRequestId;

  // 放到下一帧，避免和首屏渲染/交互抢主线程
  requestAnimationFrame(async () => {
    if (!charts || requestId !== topAnalysisRequestId) return;
    ensureTopCharts(charts, getEchartsTheme());

    const topMetrics = [...metricsConfig.topAnalysis];
    const results = {};
    const { startTime, endTime } = calculateTimeRange();
    const controls = { ...getControlState(), startTime, endTime };

    await Promise.all(
      topMetrics.map(async (metric) => {
        const res = await fetchData(metric, { startTime, endTime });
        if (res) results[metric] = processData(res, metric);
      })
    );

    if (!charts || requestId !== topAnalysisRequestId) return;
    dashboardCache.topAnalysis = { controls, results };
    updateTopAnalysisSection(charts, results);
  });
}

initI18n();
applyTranslations();
initLanguageSwitcher('language');
onLocaleChange(() => {
  applyTranslations();
  initLanguageSwitcher('language');
  renderZonesFromCache();
  rerenderFromCache({ includeTop: true, includePages: true });
});

function renderZonesFromCache() {
  const select = document.getElementById('zoneId');
  if (!select) return;

  const zones = dashboardCache.zones;
  const currentVal = select.value;
  select.innerHTML = '';

  if (zones === null) {
    const failOption = document.createElement('option');
    failOption.value = '*';
    failOption.text = t('zones.loadFailed');
    select.appendChild(failOption);
    select.value = '*';
    return;
  }

  const allOption = document.createElement('option');
  allOption.value = '*';
  allOption.text = t('zones.all');
  select.appendChild(allOption);

  if (Array.isArray(zones) && zones.length > 0) {
    zones.forEach((zone) => {
      const option = document.createElement('option');
      option.value = zone.ZoneId;
      let text = zone.ZoneName;
      if (text === 'default-pages-zone') {
        text += t('zones.pagesSuffix');
      }
      option.text = text;
      select.appendChild(option);
    });
  }

  if (currentVal && Array.from(select.options).some((o) => o.value === currentVal)) {
    select.value = currentVal;
  } else {
    select.value = '*';
  }
}

async function fetchZones() {
    try {
        const response = await fetch('/api/zones');
        const result = await response.json();

        dashboardCache.zones = Array.isArray(result?.Zones) ? result.Zones : [];
        renderZonesFromCache();
    } catch (err) {
        console.error("Error fetching zones:", err);
        dashboardCache.zones = null;
        renderZonesFromCache();
    }
}

function renderPagesBuildFromCache() {
  const cached = dashboardCache.pagesBuild;
  if (!cached) return;
  const current = getControlState();
  if (cached.zoneId !== current.zoneId) return;

  const { dplDailyCount, dplMonthCount } = cached;
  document.getElementById('kpi_pages_daily_build').innerText =
    dplDailyCount !== undefined ? Number(dplDailyCount).toLocaleString(getLocale()) : '-';
  document.getElementById('kpi_pages_monthly_build').innerText =
    dplMonthCount !== undefined ? Number(dplMonthCount).toLocaleString(getLocale()) : '-';
}

async function fetchPagesBuildStats() {
     try {
        // Pages build stats are global, not per zone (usually), or the API handles it.
        // If it needs zoneId, we might need to pass it.
        // The current backend implementation just calls DescribePagesResources without params, 
        // so it likely returns account-level or default zone stats.
        // However, the user request implied it's a new API. 
        // Let's assume it doesn't need time range or zoneId for now as per backend implementation.

        // Get ZoneId if selected
        const zoneIdElement = document.getElementById('zoneId');
        const zoneId = zoneIdElement ? zoneIdElement.value : null;
        const url = zoneId && zoneId !== '*' ? `/api/pages/build-count?zoneId=${zoneId}` : '/api/pages/build-count';

        const response = await fetch(url);
        const result = await response.json();

        if (result.parsedResult) {
            const { dplDailyCount, dplMonthCount } = result.parsedResult;
            dashboardCache.pagesBuild = { zoneId: zoneId || '*', dplDailyCount, dplMonthCount };
            renderPagesBuildFromCache();
        } else {
             document.getElementById('kpi_pages_daily_build').innerText = '-';
             document.getElementById('kpi_pages_monthly_build').innerText = '-';
        }

    } catch (err) {
        console.error("Error fetching pages build stats:", err);
        document.getElementById('kpi_pages_daily_build').innerText = t('common.error');
        document.getElementById('kpi_pages_monthly_build').innerText = t('common.error');
    }
}

function renderPagesCloudFunctionTrendFromCache() {
  const cached = dashboardCache.pagesCloudFunctionTrend;
  if (!cached) return;
  if (!charts?.pagesCloudFunctionRequests) return;

  const current = getControlState();
  if (cached.zoneId !== current.zoneId) return;

  const { TotalValue, Timestamps, Values } = cached;
  document.getElementById('kpi_pages_cloud_function_total').innerText =
    TotalValue !== undefined ? formatCount(TotalValue) : '-';

  if (Timestamps && Values && Timestamps.length > 0) {
    const dates = Timestamps.map((ts) => {
      return new Date(ts * 1000).toLocaleString(getLocale(), { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    });

    const option = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates },
      yAxis: { type: 'value' },
      series: [
        {
          name: t('charts.requests'),
          type: 'line',
          smooth: true,
          data: Values,
          areaStyle: { opacity: 0.1 },
          itemStyle: { color: '#3b82f6' },
        },
      ],
    };
    charts.pagesCloudFunctionRequests.setOption(option);
  } else {
    charts.pagesCloudFunctionRequests.clear();
  }
}

async function fetchPagesCloudFunctionStats(startTime, endTime) {
    try {
        if (!charts?.pagesCloudFunctionRequests) return;
        // Get ZoneId if selected
        const zoneIdElement = document.getElementById('zoneId');
        const zoneId = zoneIdElement ? zoneIdElement.value : null;

        let url = zoneId && zoneId !== '*' ? `/api/pages/cloud-function-requests?zoneId=${zoneId}` : '/api/pages/cloud-function-requests';

        // Add time range params if provided
        if (startTime && endTime) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        // Parsed Result: { Status, Granularity, Timestamps, Values, TotalValue }
        if (result.parsedResult) {
            const { TotalValue, Timestamps, Values } = result.parsedResult;
            dashboardCache.pagesCloudFunctionTrend = {
              zoneId: zoneId || '*',
              startTime: startTime || null,
              endTime: endTime || null,
              TotalValue,
              Timestamps,
              Values,
            };
            renderPagesCloudFunctionTrendFromCache();

        } else {
             document.getElementById('kpi_pages_cloud_function_total').innerText = '-';
             charts.pagesCloudFunctionRequests.clear();
        }
    } catch (err) {
        console.error("Error fetching pages cloud function stats:", err);
        document.getElementById('kpi_pages_cloud_function_total').innerText = t('common.error');
        charts.pagesCloudFunctionRequests.clear();
    }
}

function renderPagesCloudFunctionMonthlyFromCache() {
  const cached = dashboardCache.pagesCloudFunctionMonthly;
  if (!cached) return;
  const current = getControlState();
  if (cached.zoneId !== current.zoneId) return;

  const { TotalMemDuration, TotalInvocation } = cached;
  document.getElementById('kpi_pages_monthly_cf_requests').innerText =
    TotalInvocation !== undefined ? formatCount(TotalInvocation) : '-';

  if (TotalMemDuration !== undefined) {
    const gbs = (Number(TotalMemDuration) / 1024).toFixed(2);
    document.getElementById('kpi_pages_monthly_cf_gbs').innerText = gbs;
  } else {
    document.getElementById('kpi_pages_monthly_cf_gbs').innerText = '-';
  }
}

async function fetchPagesCloudFunctionMonthlyStats() {
    try {
        // Get ZoneId if selected
        const zoneIdElement = document.getElementById('zoneId');
        const zoneId = zoneIdElement ? zoneIdElement.value : null;
        const url = zoneId && zoneId !== '*' ? `/api/pages/cloud-function-monthly-stats?zoneId=${zoneId}` : '/api/pages/cloud-function-monthly-stats';

        const response = await fetch(url);
        const result = await response.json();

        // Expected Result: { parsedResult: { TotalMemDuration: number, TotalInvocation: number } }
        if (result.parsedResult) {
            const { TotalMemDuration, TotalInvocation } = result.parsedResult;
            dashboardCache.pagesCloudFunctionMonthly = {
              zoneId: zoneId || '*',
              TotalMemDuration,
              TotalInvocation,
            };
            renderPagesCloudFunctionMonthlyFromCache();

        } else {
             document.getElementById('kpi_pages_monthly_cf_requests').innerText = '-';
             document.getElementById('kpi_pages_monthly_cf_gbs').innerText = '-';
        }
    } catch (err) {
        console.error("Error fetching pages cloud function monthly stats:", err);
        document.getElementById('kpi_pages_monthly_cf_requests').innerText = t('common.error');
        document.getElementById('kpi_pages_monthly_cf_gbs').innerText = t('common.error');
    }
}

function rerenderFromCache({ includeTop = true, includePages = true } = {}) {
  if (!charts) return false;

  hideAllKpiCompareLines();

  const current = getControlState();

  const core = dashboardCache.core;
  if (core && isSameControlState(current, core.controls)) {
    updateTrafficSection(charts, core.results, core.compareResults, core.compareEnabled);
    updateBandwidthSection(charts, core.results, core.compareResults, core.compareEnabled);
    updateOriginPullSection(charts, core.results, core.compareResults, core.compareEnabled);
    updateRequestsSection(charts, core.results, core.compareResults, core.compareEnabled);
    updatePerformanceSection(charts, core.results, core.compareResults, core.compareEnabled);
    updateEdgeFunctionsSection(charts, core.results, core.compareResults, core.compareEnabled);
    updateSecuritySection(charts, core.results, core.compareResults, core.compareEnabled);
  }

  if (includePages) {
    renderPagesBuildFromCache();
    renderPagesCloudFunctionTrendFromCache();
    renderPagesCloudFunctionMonthlyFromCache();
  }

  if (includeTop && topAnalysisActivated) {
    const top = dashboardCache.topAnalysis;
    if (top && isSameControlState(current, top.controls)) {
      ensureTopCharts(charts, getEchartsTheme());
      updateTopAnalysisSection(charts, top.results);
    }
  }

  return true;
}

export async function refreshData() {
    if (!charts) return;

    // 始终开启对比：先清空对比行，避免上一次结果残留
    hideAllKpiCompareLines();

    // Show loading（不覆盖对比行，避免出现“加载中...”闪烁）
    document.querySelectorAll('[id^="kpi_"]:not([id^="kpi_compare_"])').forEach(el => el.innerText = t('common.loading'));

    // Check time range for Security Metrics
    const { startTime, endTime } = calculateTimeRange();
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Allow a small buffer (e.g., 1 minute) for "7 days" check to handle slight offsets
    const isSecuritySupported = (end - start) <= (14 * 24 * 60 * 60 * 1000 + 60000);

    const results = {};
    const compareResults = {};
    const controls = getControlState();
    const rangeKey = document.getElementById('timeRange')?.value || '30min';
    const compareEnabled = true;
    const prevRange = calculatePreviousTimeRange({ startTime, endTime, rangeKey });
    const securityCompareEnabled = !!prevRange && isSecurityCompareAllowed(prevRange.startTime);

    // Start Pages Build Stats fetch (independent)
    fetchPagesBuildStats();
    // Start Pages Cloud Function Stats fetch (independent) - Pass time range
    fetchPagesCloudFunctionStats(startTime, endTime);
    // Start Pages Cloud Function Monthly Stats fetch (independent)
    fetchPagesCloudFunctionMonthlyStats();

    // 批量拉取：将可合并的指标按 API 家族聚合，减少 /api/traffic 请求次数
    const timingMetrics = [
      ...metricsConfig.traffic,
      ...metricsConfig.bandwidth,
      ...metricsConfig.requests,
      ...metricsConfig.performance,
    ];
    const originPullMetrics = [...metricsConfig.originPull];
    const functionMetrics = [...metricsConfig.edgeFunctions];
    const securityMetrics = isSecuritySupported ? [...metricsConfig.security] : [];

    const [
      timingRes,
      timingPrevRes,
      originPullRes,
      originPullPrevRes,
      functionRes,
      functionPrevRes,
      securityRes,
      securityPrevRes,
    ] = await Promise.all([
      fetchBatchData(timingMetrics),
      prevRange ? fetchBatchData(timingMetrics, prevRange) : Promise.resolve(null),
      fetchBatchData(originPullMetrics),
      prevRange ? fetchBatchData(originPullMetrics, prevRange) : Promise.resolve(null),
      fetchBatchData(functionMetrics),
      prevRange ? fetchBatchData(functionMetrics, prevRange) : Promise.resolve(null),
      securityMetrics.length > 0 ? fetchBatchData(securityMetrics) : Promise.resolve(null),
      securityMetrics.length > 0 && securityCompareEnabled ? fetchBatchData(securityMetrics, prevRange) : Promise.resolve(null),
    ]);

    for (const m of timingMetrics) {
      if (timingRes) results[m] = processData(timingRes, m);
      if (timingPrevRes) compareResults[m] = processData(timingPrevRes, m);
    }
    for (const m of originPullMetrics) {
      if (originPullRes) results[m] = processData(originPullRes, m);
      if (originPullPrevRes) compareResults[m] = processData(originPullPrevRes, m);
    }
    for (const m of functionMetrics) {
      if (functionRes) results[m] = processData(functionRes, m);
      if (functionPrevRes) compareResults[m] = processData(functionPrevRes, m);
    }
    for (const m of securityMetrics) {
      if (securityRes) results[m] = processData(securityRes, m);
      if (securityPrevRes) compareResults[m] = processData(securityPrevRes, m);
    }

    // Update UI
    updateTrafficSection(charts, results, compareResults, compareEnabled); //1.
    updateBandwidthSection(charts, results, compareResults, compareEnabled); //2.
    updateOriginPullSection(charts, results, compareResults, compareEnabled); //3.
    updateRequestsSection(charts, results, compareResults, compareEnabled); //4.
    updatePerformanceSection(charts, results, compareResults, compareEnabled); //5.
    updateEdgeFunctionsSection(charts, results, compareResults, compareEnabled); // New
    updateSecuritySection(charts, results, compareResults, compareEnabled); //5.1
    dashboardCache.core = { controls, results, compareResults, compareEnabled };

    // Top 分析：只在用户滚动到该区块后加载，减少首屏网络与 CPU 压力
    if (topAnalysisActivated) {
      loadTopAnalysisInBackground();
    }
}


export async function initDashboard() {
  const ready = await waitForEchartsReady();
  if (!ready) {
    console.error('[echarts] not ready, skip initDashboard');
    return;
  }

  charts = initCharts(getEchartsTheme(), { includeTop: false });
  setupTopAnalysisLazyLoad();

  await fetchZones();
  await refreshData();

  window.addEventListener('resize', () => resizeCharts(charts));
  window.addEventListener(THEME_EVENT_NAME, () => scheduleChartsRebuild());
}

// Expose for inline handlers in index.html
window.refreshData = refreshData;
window.handleTimeRangeChange = handleTimeRangeChange;

// 放到下一帧，让浏览器先完成一次绘制，降低 FCP/LCP 被 JS 阻塞的概率
requestAnimationFrame(() => initDashboard());
