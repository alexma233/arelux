// 获取站点配置（标题/图标）：
// - 用 defer 加载，避免阻塞首屏渲染
// - 只更新必要 DOM，避免重复布局/回流
(async function fetchConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (config?.siteName) {
      document.title = config.siteName;
      const headerEl = document.getElementById('page-header');
      if (headerEl) headerEl.innerText = config.siteName;
    }

    if (config?.siteIcon) {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = config.siteIcon;
    }
  } catch (err) {
    console.error('Error fetching config:', err);
  }
})();
