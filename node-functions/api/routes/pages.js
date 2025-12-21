import { getKeys } from "../lib/credentials.js";
import { requestTeoWithRegionFallback } from "../lib/teoPagesRegionFallback.js";
import { resolveZoneId } from "../lib/zones.js";

const PAGES_CACHE = new Map();

function getCacheEntry(key) {
  const entry = PAGES_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    PAGES_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCacheEntry(key, data, ttlMs) {
  // 注意：简单兜底避免无界增长（Pages 指标通常只有少量组合）
  if (PAGES_CACHE.size > 200) PAGES_CACHE.clear();
  PAGES_CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function registerPagesRoutes(app) {
  app.get("/pages/build-count", async (req, res) => {
    try {
      res.set("Cache-Control", "private, max-age=60");
      const noCache = String(req.query.noCache || "") === "1";
      const cacheKey = `build-count:${req.query.zoneId || "*"}`;
      if (!noCache) {
        const cached = getCacheEntry(cacheKey);
        if (cached) return res.json(cached);
      }

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

      if (!noCache) setCacheEntry(cacheKey, data, 60 * 1000);
      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });

  app.get("/pages/cloud-function-requests", async (req, res) => {
    try {
      res.set("Cache-Control", "private, max-age=60");
      const noCache = String(req.query.noCache || "") === "1";
      const cacheKey = `cf-requests:${req.query.zoneId || "*"}:${req.query.startTime || ""}:${req.query.endTime || ""}`;
      if (!noCache) {
        const cached = getCacheEntry(cacheKey);
        if (cached) return res.json(cached);
      }

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

      if (!noCache) setCacheEntry(cacheKey, data, 60 * 1000);
      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources for CloudFunction:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });

  app.get("/pages/cloud-function-monthly-stats", async (req, res) => {
    try {
      res.set("Cache-Control", "private, max-age=300");
      const noCache = String(req.query.noCache || "") === "1";
      const cacheKey = `cf-monthly:${req.query.zoneId || "*"}`;
      if (!noCache) {
        const cached = getCacheEntry(cacheKey);
        if (cached) return res.json(cached);
      }

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

      if (!noCache) setCacheEntry(cacheKey, data, 300 * 1000);
      res.json(data);
    } catch (err) {
      console.error("Error calling DescribePagesResources for CloudFunction Monthly:", err);
      res.status(500).json({ error: err.message, code: err.code, requestId: err.requestId });
    }
  });
}
