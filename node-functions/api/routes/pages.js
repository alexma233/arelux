import { getKeys } from "../lib/credentials.js";
import { requestTeoWithRegionFallback } from "../lib/teoPagesRegionFallback.js";
import { resolveZoneId } from "../lib/zones.js";

export function registerPagesRoutes(app) {
  app.get("/pages/build-count", async (req, res) => {
    try {
      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      // 1. Find ZoneId (Pages usually requires 'default-pages-zone')
      const targetZoneId = await resolveZoneId({ reqZoneId: req.query.zoneId, secretId, secretKey });

      if (!targetZoneId) {
        return res.status(400).json({ error: "Missing ZoneId and could not auto-discover one." });
      }

      const params = {
        Interface: "pages:DescribePagesDeploymentUsage",
        Payload: "{}",
        ZoneId: targetZoneId,
      };

      console.log("Calling DescribePagesResources with params:", JSON.stringify(params));
      const { data, region } = await requestTeoWithRegionFallback({ secretId, secretKey }, "DescribePagesResources", params);
      data.usedRegion = region;

      // Parse Result string if present
      if (data && data.Result) {
        try {
          data.parsedResult = JSON.parse(data.Result);
        } catch (e) {
          console.error("Error parsing Result JSON:", e);
        }
      }

      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });

  app.get("/pages/cloud-function-requests", async (req, res) => {
    try {
      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      // 1. Find ZoneId
      const { startTime, endTime } = req.query;
      const targetZoneId = await resolveZoneId({ reqZoneId: req.query.zoneId, secretId, secretKey });

      if (!targetZoneId) {
        return res.status(400).json({ error: "Missing ZoneId and could not auto-discover one." });
      }

      const payload = {
        ZoneId: targetZoneId,
        Interval: "hour",
      };

      if (startTime) payload.StartTime = startTime;
      if (endTime) payload.EndTime = endTime;

      const params = {
        ZoneId: targetZoneId,
        Interface: "pages:DescribePagesFunctionsRequestDataByZone",
        Payload: JSON.stringify(payload),
      };

      console.log("Calling DescribePagesResources (CloudFunction) with params:", JSON.stringify(params));
      const { data, region } = await requestTeoWithRegionFallback({ secretId, secretKey }, "DescribePagesResources", params);
      data.usedRegion = region;

      // Parse Result string if present
      if (data && data.Result) {
        try {
          data.parsedResult = JSON.parse(data.Result);
        } catch (e) {
          console.error("Error parsing Result JSON:", e);
        }
      }

      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources for CloudFunction:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });

  app.get("/pages/cloud-function-monthly-stats", async (req, res) => {
    try {
      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      // 1. Find ZoneId
      const targetZoneId = await resolveZoneId({ reqZoneId: req.query.zoneId, secretId, secretKey });

      if (!targetZoneId) {
        return res.status(400).json({ error: "Missing ZoneId and could not auto-discover one." });
      }

      const payload = {
        ZoneId: targetZoneId,
      };

      const params = {
        ZoneId: targetZoneId,
        Interface: "pages:DescribeHistoryCloudFunctionStats",
        Payload: JSON.stringify(payload),
      };

      console.log("Calling DescribePagesResources (CloudFunction Monthly) with params:", JSON.stringify(params));
      const { data, region } = await requestTeoWithRegionFallback({ secretId, secretKey }, "DescribePagesResources", params);
      data.usedRegion = region;

      // Parse Result string if present
      if (data && data.Result) {
        try {
          data.parsedResult = JSON.parse(data.Result);
        } catch (e) {
          console.error("Error parsing Result JSON:", e);
        }
      }

      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources for CloudFunction Monthly:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });
}

