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

// 字体策略：首屏先用系统字体；页面加载后再异步启用 Inter（不阻塞渲染）
// 易错点：不要在这里做重计算或同步等待字体，否则会抬高 TBT
window.addEventListener('load', () => {
  const enableInter = () => {
    if (!document?.fonts?.load) return;
    document.fonts
      .load('1em Inter')
      .then(() => {
        document.documentElement.classList.add('font-inter');
      })
      .catch(() => {
        // ignore
      });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(enableInter, { timeout: 2000 });
  } else {
    setTimeout(enableInter, 0);
  }
});
