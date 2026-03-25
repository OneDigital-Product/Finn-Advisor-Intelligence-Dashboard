/**
 * Next.js Instrumentation Hook
 *
 * Called once when the Next.js server starts (both dev and production).
 * Replaces the Express server entry point (server/index.ts) by running
 * the same process-level initialization: DB, scheduler, providers, caches.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  // Only run on the server runtime (not during build or edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrap } = await import("./server/bootstrap");
    await bootstrap();
  }
}
