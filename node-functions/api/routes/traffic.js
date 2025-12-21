import { getKeys } from "../lib/credentials.js";
import { FUNCTION_METRICS, ORIGIN_PULL_METRICS, SECURITY_METRICS, TOP_ANALYSIS_METRICS } from "../lib/metrics.js";
import { createTeoCommonClient, createTeoSdkClient } from "../lib/teoClients.js";

const TRAFFIC_CACHE = new Map();

function getCachedTraffic(key) {
  const entry = TRAFFIC_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    TRAFFIC_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedTraffic(key, data, ttlMs) {
  // 注意：简单兜底避免无界增长（时间范围/站点组合过多时直接清空）
  if (TRAFFIC_CACHE.size > 300) TRAFFIC_CACHE.clear();
  TRAFFIC_CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function parseMetricsQuery(req) {
  const raw = req.query.metrics;
  if (!raw) return null;

  const value = Array.isArray(raw) ? raw.join(",") : String(raw);
  const metrics = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return metrics.length > 0 ? metrics : null;
}

function classifyMetricFamily(metric) {
  if (TOP_ANALYSIS_METRICS.includes(metric)) return "top";
  if (SECURITY_METRICS.includes(metric)) return "security";
  if (FUNCTION_METRICS.includes(metric)) return "function";
  if (ORIGIN_PULL_METRICS.includes(metric)) return "originPull";
  return "timing";
}

export function registerTrafficRoutes(app) {
  app.get("/traffic", async (req, res) => {
    try {
      // 缓存建议：该接口走云 API，延迟与成本都更高；允许短期缓存可显著提升刷新/切换主题体验
      res.set("Cache-Control", "private, max-age=30");

      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      const client = createTeoSdkClient({ secretId, secretKey, region: "ap-guangzhou" });

      const now = new Date();
      const formatDate = (date) => {
        return date.toISOString().slice(0, 19) + "Z";
      };

      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const metricsFromQuery = parseMetricsQuery(req);
      const metric = req.query.metric || "l7Flow_flux";
      const metrics = metricsFromQuery || [metric];
      const startTime = req.query.startTime || formatDate(yesterday);
      const endTime = req.query.endTime || formatDate(now);
      const interval = req.query.interval;
      const zoneId = req.query.zoneId;
      const zoneIds = zoneId ? [zoneId] : ["*"];
      const noCache = String(req.query.noCache || "") === "1";

      let params = {};
      let data;

      console.log(
        `Requesting metrics: ${metrics.join(",")}, StartTime: ${startTime}, EndTime: ${endTime}, Interval: ${interval}`
      );

      const family = classifyMetricFamily(metrics[0]);
      const hasMixedFamilies = metrics.some((m) => classifyMetricFamily(m) !== family);
      if (hasMixedFamilies) {
        return res.status(400).json({
          error: "Mixed metric families are not supported in one request. Please group metrics by API family.",
        });
      }

      const cacheKey = `${family}:${metrics.join(",")}:${startTime}:${endTime}:${interval || ""}:${zoneId || "*"}`;
      if (!noCache) {
        const cached = getCachedTraffic(cacheKey);
        if (cached) return res.json(cached);
      }

      if (family === "top") {
        // 注意：DescribeTopL7AnalysisData 只支持单个 MetricName
        if (metrics.length !== 1) {
          return res.status(400).json({
            error: "Top analysis metrics do not support batching. Please request one metric per call.",
          });
        }
        // API: DescribeTopL7AnalysisData
        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricName: metrics[0],
          ZoneIds: zoneIds,
        };
        console.log("Calling DescribeTopL7AnalysisData with params:", JSON.stringify(params, null, 2));
        data = await client.DescribeTopL7AnalysisData(params);
      } else if (family === "security") {
        // API: DescribeWebProtectionData (DDoS/Security) using CommonClient
        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricNames: metrics,
          ZoneIds: zoneIds,
        };

        if (interval && interval !== "auto") {
          params.Interval = interval;
        }

        const commonClient = createTeoCommonClient({ secretId, secretKey, region: "ap-guangzhou" });
        console.log("Calling DescribeWebProtectionData with params:", JSON.stringify(params, null, 2));
        data = await commonClient.request("DescribeWebProtectionData", params);
      } else if (family === "function") {
        // API: DescribeTimingFunctionAnalysisData (Edge Functions)
        const metricNames = [...metrics];
        // 注意：部分场景需要一起取请求数，便于前端展示/对齐
        if (metricNames.includes("function_cpuCostTime") && !metricNames.includes("function_requestCount")) {
          metricNames.unshift("function_requestCount");
        }

        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricNames: metricNames,
          ZoneIds: zoneIds,
        };

        if (interval && interval !== "auto") {
          params.Interval = interval;
        }

        console.log("Calling DescribeTimingFunctionAnalysisData with params:", JSON.stringify(params, null, 2));
        const commonClient = createTeoCommonClient({ secretId, secretKey, region: "ap-guangzhou" });
        data = await commonClient.request("DescribeTimingFunctionAnalysisData", params);
      } else {
        // API: DescribeTimingL7AnalysisData OR DescribeTimingL7OriginPullData
        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricNames: metrics,
          ZoneIds: zoneIds,
        };

        if (interval && interval !== "auto") {
          params.Interval = interval;
        }

        console.log("Calling Timing API with params:", JSON.stringify(params, null, 2));

        if (family === "originPull") {
          data = await client.DescribeTimingL7OriginPullData(params);
        } else {
          data = await client.DescribeTimingL7AnalysisData(params);
        }
      }

      if (!noCache) setCachedTraffic(cacheKey, data, 30 * 1000);
      res.json(data);
    } catch (err) {
      console.error("Error calling Tencent Cloud API:", err);
      res.status(500).json({ error: err.message });
    }
  });
}
