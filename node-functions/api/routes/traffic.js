import { getKeys } from "../lib/credentials.js";
import { FUNCTION_METRICS, ORIGIN_PULL_METRICS, SECURITY_METRICS, TOP_ANALYSIS_METRICS } from "../lib/metrics.js";
import { createTeoCommonClient, createTeoSdkClient } from "../lib/teoClients.js";

export function registerTrafficRoutes(app) {
  app.get("/traffic", async (req, res) => {
    try {
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

      const metric = req.query.metric || "l7Flow_flux";
      const startTime = req.query.startTime || formatDate(yesterday);
      const endTime = req.query.endTime || formatDate(now);
      const interval = req.query.interval;
      const zoneId = req.query.zoneId;
      const zoneIds = zoneId ? [zoneId] : ["*"];

      let params = {};
      let data;

      console.log(
        `Requesting metric: ${metric}, StartTime: ${startTime}, EndTime: ${endTime}, Interval: ${interval}`
      );

      if (TOP_ANALYSIS_METRICS.includes(metric)) {
        // API: DescribeTopL7AnalysisData
        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricName: metric,
          ZoneIds: zoneIds,
        };
        console.log("Calling DescribeTopL7AnalysisData with params:", JSON.stringify(params, null, 2));
        data = await client.DescribeTopL7AnalysisData(params);
      } else if (SECURITY_METRICS.includes(metric)) {
        // API: DescribeWebProtectionData (DDoS/Security) using CommonClient
        params = {
          StartTime: startTime,
          EndTime: endTime,
          MetricNames: [metric],
          ZoneIds: zoneIds,
        };

        if (interval && interval !== "auto") {
          params.Interval = interval;
        }

        const commonClient = createTeoCommonClient({ secretId, secretKey, region: "ap-guangzhou" });
        console.log("Calling DescribeWebProtectionData with params:", JSON.stringify(params, null, 2));
        data = await commonClient.request("DescribeWebProtectionData", params);
      } else if (FUNCTION_METRICS.includes(metric)) {
        // API: DescribeTimingFunctionAnalysisData (Edge Functions)
        let metricNames = [metric];
        if (metric === "function_cpuCostTime") {
          metricNames = ["function_requestCount", "function_cpuCostTime"];
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
          MetricNames: [metric],
          ZoneIds: zoneIds,
        };

        if (interval && interval !== "auto") {
          params.Interval = interval;
        }

        console.log("Calling Timing API with params:", JSON.stringify(params, null, 2));

        if (ORIGIN_PULL_METRICS.includes(metric)) {
          data = await client.DescribeTimingL7OriginPullData(params);
        } else {
          data = await client.DescribeTimingL7AnalysisData(params);
        }
      }

      res.json(data);
    } catch (err) {
      console.error("Error calling Tencent Cloud API:", err);
      res.status(500).json({ error: err.message });
    }
  });
}

