import type { Express } from 'express';
import { healthCheckShallow, healthCheckDetailed, healthCheckReady } from '../health';

export function registerHealthRoutes(app: Express) {
  app.get('/api/health', healthCheckShallow);
  app.get('/api/health/detailed', healthCheckDetailed);
  app.get('/api/health/ready', healthCheckReady);
}
