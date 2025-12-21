// Metrics that belong to DescribeTimingL7OriginPullData
export const ORIGIN_PULL_METRICS = [
  "l7Flow_outFlux_hy",
  "l7Flow_outBandwidth_hy",
  "l7Flow_request_hy",
  "l7Flow_inFlux_hy",
  "l7Flow_inBandwidth_hy",
];

// Metrics that belong to DescribeTopL7AnalysisData
export const TOP_ANALYSIS_METRICS = [
  "l7Flow_outFlux_country",
  "l7Flow_outFlux_province",
  "l7Flow_outFlux_statusCode",
  "l7Flow_outFlux_domain",
  "l7Flow_outFlux_url",
  "l7Flow_outFlux_resourceType",
  "l7Flow_outFlux_sip",
  "l7Flow_outFlux_referers",
  "l7Flow_outFlux_ua_device",
  "l7Flow_outFlux_ua_browser",
  "l7Flow_outFlux_ua_os",
  "l7Flow_outFlux_ua",
  "l7Flow_request_country",
  "l7Flow_request_province",
  "l7Flow_request_statusCode",
  "l7Flow_request_domain",
  "l7Flow_request_url",
  "l7Flow_request_resourceType",
  "l7Flow_request_sip",
  "l7Flow_request_referers",
  "l7Flow_request_ua_device",
  "l7Flow_request_ua_browser",
  "l7Flow_request_ua_os",
  "l7Flow_request_ua",
];

// Metrics that belong to DescribeWebProtectionData (DDoS/Security)
export const SECURITY_METRICS = [
  "ccAcl_interceptNum",
  "ccManage_interceptNum",
  "ccRate_interceptNum",
];

// Metrics that belong to DescribeTimingFunctionAnalysisData (Edge Functions)
export const FUNCTION_METRICS = ["function_requestCount", "function_cpuCostTime"];

