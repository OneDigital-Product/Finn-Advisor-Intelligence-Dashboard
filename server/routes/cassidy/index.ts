import type { Express } from "express";
import { registerCoreRoutes } from "./core";
import { registerFactsRoutes } from "./facts";
import { registerSignalsRoutes } from "./signals";
import { registerReportsRoutes } from "./reports";
import { registerAdminRoutes } from "./admin";
import { registerFinnModeRoutes } from "./finn-mode";

export function registerCassidyRoutes(app: Express) {
  registerCoreRoutes(app);
  registerFinnModeRoutes(app);
  registerFactsRoutes(app);
  registerSignalsRoutes(app);
  registerReportsRoutes(app);
  registerAdminRoutes(app);
}
