const TOP_CHART_ID_MAP = {
  topCountry: 'chart_top_country',
  topProvince: 'chart_top_province',
  topStatusCode: 'chart_top_status_code',
  topDomain: 'chart_top_domain',
  topUrl: 'chart_top_url',
  topResourceType: 'chart_top_resource_type',
  topSip: 'chart_top_sip',
  topReferer: 'chart_top_referer',
  topUaDevice: 'chart_top_ua_device',
  topUaBrowser: 'chart_top_ua_browser',
  topUaOs: 'chart_top_ua_os',
  topUa: 'chart_top_ua',
  topRequestCountry: 'chart_top_request_country',
  topRequestProvince: 'chart_top_request_province',
  topRequestStatusCode: 'chart_top_request_status_code',
  topRequestDomain: 'chart_top_request_domain',
  topRequestUrl: 'chart_top_request_url',
  topRequestResourceType: 'chart_top_request_resource_type',
  topRequestSip: 'chart_top_request_sip',
  topRequestReferer: 'chart_top_request_referer',
  topRequestUaDevice: 'chart_top_request_ua_device',
  topRequestUaBrowser: 'chart_top_request_ua_browser',
  topRequestUaOs: 'chart_top_request_ua_os',
  topRequestUa: 'chart_top_request_ua',
  topMap: 'chart_top_map',
};

function createInitChart(theme = null) {
  const resolvedTheme = theme || null;
  return (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return echarts.init(el, resolvedTheme);
  };
}

export function ensureTopCharts(charts, theme = null) {
  if (!charts) return charts;
  const init = createInitChart(theme);
  for (const [key, id] of Object.entries(TOP_CHART_ID_MAP)) {
    if (charts[key]) continue;
    charts[key] = init(id);
  }
  return charts;
}

export function initCharts(theme = null, { includeTop = true } = {}) {
  const init = createInitChart(theme);

  const charts = {
    traffic: init('chart_traffic'),
    bandwidth: init('chart_bandwidth'),
    requests: init('chart_requests'),
    performance: init('chart_performance'),
    security: init('chart_security'),
    originPull: init('chart_origin_pull'),

    functionRequests: init('chart_function_requests'),
    functionCpu: init('chart_function_cpu'),

    pagesCloudFunctionRequests: init('chart_pages_cloud_function_requests'),
  };

  if (includeTop) ensureTopCharts(charts, theme);
  return charts;
}

export function resizeCharts(charts) {
  if (!charts) return;

  for (const chart of Object.values(charts)) {
    if (chart && typeof chart.resize === 'function') {
      chart.resize();
    }
  }
}
