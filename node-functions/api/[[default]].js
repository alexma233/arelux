import express from "express";
import "dotenv/config";

import { registerConfigRoutes } from "./routes/config.js";
import { registerZonesRoutes } from "./routes/zones.js";
import { registerPagesRoutes } from "./routes/pages.js";
import { registerTrafficRoutes } from "./routes/traffic.js";

const app = express();

registerConfigRoutes(app);
registerZonesRoutes(app);
registerPagesRoutes(app);
registerTrafficRoutes(app);

export default app;
