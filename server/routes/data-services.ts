import type { Express, Request, Response } from "express";
import { requireAuth, requireAdvisor } from "./middleware";
import { logger } from "../lib/logger";
import {
  executeServiceCall,
  getServiceMetadata,
  listAvailableServices,
  type ServiceName,
} from "../services/service-routing";

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerDataServiceRoutes(app: Express) {
  app.get("/api/data-services", requireAuth, requireAdvisor, (_req: Request, res: Response) => {
    const services = listAvailableServices();
    res.json({ services });
  });

  app.get("/api/data-services/:serviceName/:methodName/metadata", requireAuth, requireAdvisor, (req: Request, res: Response) => {
    const serviceName = p(req.params.serviceName);
    const methodName = p(req.params.methodName);
    const metadata = getServiceMetadata(serviceName as ServiceName, methodName);
    res.json(metadata);
  });

  app.post("/api/data-services/:serviceName/:methodName", requireAuth, requireAdvisor, async (req: Request, res: Response) => {
    const serviceName = p(req.params.serviceName);
    const methodName = p(req.params.methodName);
    const args: unknown[] = Array.isArray(req.body.args) ? req.body.args : [];
    try {
      const result = await executeServiceCall(serviceName as ServiceName, methodName, args);
      res.json(result);
    } catch (err: unknown) {
      logger.error({ err }, "Data service call failed");
      res.status(400).json({ error: "Service call failed" });
    }
  });
}
