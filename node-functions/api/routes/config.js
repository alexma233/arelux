export function registerConfigRoutes(app) {
  app.get("/config", (req, res) => {
    res.json({
      siteName: process.env.SITE_NAME || "arelux",
      siteIcon: process.env.SITE_ICON || "https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0",
    });
  });
}

