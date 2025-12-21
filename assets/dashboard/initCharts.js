export function initCharts(theme = null) {
  const resolvedTheme = theme || null;
  const init = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return echarts.init(el, resolvedTheme);
  };

  return {
    traffic: init('chart_traffic'),
    bandwidth: init('chart_bandwidth'),
    requests: init('chart_requests'),
    performance: init('chart_performance'),
    security: init('chart_security'),
    originPull: init('chart_origin_pull'),

    topCountry: init('chart_top_country'),
    topProvince: init('chart_top_province'),
    topStatusCode: init('chart_top_status_code'),
    topDomain: init('chart_top_domain'),
    topUrl: init('chart_top_url'),
    topResourceType: init('chart_top_resource_type'),
    topSip: init('chart_top_sip'),
    topReferer: init('chart_top_referer'),
    topUaDevice: init('chart_top_ua_device'),
    topUaBrowser: init('chart_top_ua_browser'),
    topUaOs: init('chart_top_ua_os'),
    topUa: init('chart_top_ua'),

    topRequestCountry: init('chart_top_request_country'),
    topRequestProvince: init('chart_top_request_province'),
    topRequestStatusCode: init('chart_top_request_status_code'),
    topRequestDomain: init('chart_top_request_domain'),
    topRequestUrl: init('chart_top_request_url'),
    topRequestResourceType: init('chart_top_request_resource_type'),
    topRequestSip: init('chart_top_request_sip'),
    topRequestReferer: init('chart_top_request_referer'),
    topRequestUaDevice: init('chart_top_request_ua_device'),
    topRequestUaBrowser: init('chart_top_request_ua_browser'),
    topRequestUaOs: init('chart_top_request_ua_os'),
    topRequestUa: init('chart_top_request_ua'),

    topMap: init('chart_top_map'),

    functionRequests: init('chart_function_requests'),
    functionCpu: init('chart_function_cpu'),

    pagesCloudFunctionRequests: init('chart_pages_cloud_function_requests'),
  };
}

export function resizeCharts(charts) {
  if (!charts) return;

  for (const chart of Object.values(charts)) {
    if (chart && typeof chart.resize === 'function') {
      chart.resize();
    }
  }
}
