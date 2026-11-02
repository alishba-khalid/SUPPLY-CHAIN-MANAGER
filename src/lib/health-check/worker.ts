/// <reference lib="webworker" />
/**
 * Runs the health check off the main thread so a large history file doesn't
 * freeze the page. Still entirely in the visitor's browser.
 */
import { analyzeHealthCheckBuffer, HealthCheckInputError } from "./analyze";

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    self.postMessage({ ok: true, result: analyzeHealthCheckBuffer(event.data) });
  } catch (err) {
    const message =
      err instanceof HealthCheckInputError ? err.message : "We couldn't read that file. Try saving it as CSV or .xlsx.";
    if (!(err instanceof HealthCheckInputError)) console.error("[health-check] analysis failed:", err);
    self.postMessage({ ok: false, error: message });
  }
};
