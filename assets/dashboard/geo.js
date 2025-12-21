let worldMapReadyPromise = null;

export async function ensureWorldMapRegistered() {
  // 注意：ECharts 未就绪时不要触发加载，避免报错
  if (!globalThis.echarts?.registerMap || !globalThis.echarts?.getMap) return false;
  if (globalThis.echarts.getMap('world')) return true;

  if (!worldMapReadyPromise) {
    const url = './assets/geo/world.json';
    worldMapReadyPromise = fetch(url, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch world GeoJSON: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((geojson) => {
        globalThis.echarts.registerMap('world', geojson);
        return true;
      })
      .catch((err) => {
        console.error('[echarts] Failed to load/register world map GeoJSON:', err);
        return false;
      });
  }

  return await worldMapReadyPromise;
}

