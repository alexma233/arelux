export function registerConfigRoutes(app) {
  app.get("/config", (req, res) => {
    // 缓存建议：配置通常很稳定，允许浏览器短期缓存以减少首屏阻塞请求
    res.set("Cache-Control", "private, max-age=600");
    res.json({
      siteName: process.env.SITE_NAME || "arelux",
      siteIcon: process.env.SITE_ICON || "https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0",
    });
  });
}
