import { createTeoSdkClient } from "./teoClients.js";

export async function resolveZoneId({ reqZoneId, secretId, secretKey }) {
  // 1. 优先使用用户显式传入
  let targetZoneId = reqZoneId;
  if (targetZoneId) return targetZoneId;

  // 2. 尝试自动发现：default-pages-zone -> 第一个 zone
  try {
    const teoClient = createTeoSdkClient({ secretId, secretKey, region: "ap-guangzhou" });
    const zonesData = await teoClient.DescribeZones({});

    if (zonesData && zonesData.Zones) {
      const pagesZone = zonesData.Zones.find((z) => z.ZoneName === "default-pages-zone");
      if (pagesZone) {
        targetZoneId = pagesZone.ZoneId;
        console.log(`Found default-pages-zone: ${targetZoneId}`);
      } else if (zonesData.Zones.length > 0) {
        targetZoneId = zonesData.Zones[0].ZoneId;
        console.log(`default-pages-zone not found, using first zone: ${targetZoneId}`);
      }
    }
  } catch (zErr) {
    console.error("Error fetching zones for Pages:", zErr);
  }

  return targetZoneId;
}

