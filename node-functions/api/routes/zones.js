import { getKeys } from "../lib/credentials.js";
import { createTeoSdkClient } from "../lib/teoClients.js";

export function registerZonesRoutes(app) {
  app.get("/zones", async (req, res) => {
    try {
      const { secretId, secretKey } = getKeys();

      if (!secretId || !secretKey) {
        return res.status(500).json({ error: "Missing credentials" });
      }

      const client = createTeoSdkClient({ secretId, secretKey, region: "ap-guangzhou" });

      const params = {};

      console.log("Calling DescribeZones...");
      const data = await client.DescribeZones(params);
      res.json(data);
    } catch (err) {
      console.error("Error calling DescribeZones:", err);
      res.status(500).json({ error: err.message });
    }
  });
}

