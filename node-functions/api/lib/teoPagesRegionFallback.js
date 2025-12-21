import { createTeoCommonClient } from "./teoClients.js";

// EdgeOne(TEO) 属于全局服务，但 SDK 仍要求显式传递 `region`（即 X-TC-Region）。
// Pages 部分接口会在某些 region 下返回 `UnsupportedRegion`，且 `global` 并不是合法 region。
// 这里对 Pages 接口做 region 兜底重试：
// - 允许用 `TEO_PAGES_REGION`（支持逗号分隔）或 `TEO_PAGES_REGIONS` 覆盖候选列表
// - 未配置时默认尝试 `ap-guangzhou` -> `ap-singapore`
const PAGES_REGION_CANDIDATES = (() => {
  const raw = process.env.TEO_PAGES_REGION || process.env.TEO_PAGES_REGIONS || "";
  const regions = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (regions.length > 0) return regions;
  return ["ap-guangzhou", "ap-singapore"];
})();

function isUnsupportedRegionError(err) {
  const message = String(err?.message || "");
  // - UnsupportedRegion：动作在该 region 不支持
  // - InvalidParameterValue：X-TC-Region 非法/不可用（常见于填了不存在的 region）
  return err?.code === "UnsupportedRegion" || (err?.code === "InvalidParameterValue" && /X-TC-Region/i.test(message));
}

export async function requestTeoWithRegionFallback(
  { secretId, secretKey },
  action,
  params,
  regionCandidates = PAGES_REGION_CANDIDATES
) {
  let lastError = null;

  for (const region of regionCandidates) {
    try {
      const client = createTeoCommonClient({ secretId, secretKey, region });
      const data = await client.request(action, params);
      return { data, region };
    } catch (err) {
      lastError = err;
      if (isUnsupportedRegionError(err)) {
        console.warn(`[Pages] region 不支持，自动重试下一个候选：${region}`, {
          code: err?.code,
          requestId: err?.requestId,
        });
        continue;
      }
      throw err;
    }
  }

  const attempted = regionCandidates.join(",") || "(empty)";
  const wrappedError = new Error(
    `Pages 接口在候选 region 均不可用（已尝试：${attempted}）。` +
      `可通过环境变量 TEO_PAGES_REGION（支持逗号分隔）或 TEO_PAGES_REGIONS 指定可用 region。` +
      `最后一次错误：${String(lastError?.message || lastError)}`
  );
  wrappedError.code = lastError?.code;
  wrappedError.requestId = lastError?.requestId;
  throw wrappedError;
}

