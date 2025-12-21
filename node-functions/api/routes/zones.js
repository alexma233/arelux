import { getKeys } from "../lib/credentials.js";
import { createTeoSdkClient } from "../lib/teoClients.js";

const ZONES_CACHE = {
  expiresAt: 0,
  data: null,
};

export function registerZonesRoutes(app) {
  app.get("/zones", async (req, res) => {
    try {
      // 缓存建议：站点列表变化频率低，允许浏览器/函数实例短期缓存
      res.set("Cache-Control", "private, max-age=300");

      const noCache = String(req.query.noCache || "") === "1";
      if (!noCache && ZONES_CACHE.data && Date.now() < ZONES_CACHE.expiresAt) {
        return res.json(ZONES_CACHE.data);
      }

      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      const client = createTeoSdkClient({ secretId, secretKey, region: "ap-guangzhou" });

      const params = {};

      console.log("Calling DescribeZones...");
      const data = await client.DescribeZones(params);
      ZONES_CACHE.data = data;
      ZONES_CACHE.expiresAt = Date.now() + 300 * 1000;
      res.json(data);
    } catch (err) {
      console.error("Error calling DescribeZones:", err);
      res.status(500).json({ error: err.message });
    }
  });
}
