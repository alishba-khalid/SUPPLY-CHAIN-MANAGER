/**
 * How long one server request may run on the current host. Vercel honours
 * each long route's `maxDuration = 300`; Netlify caps every synchronous
 * function at 60s whatever the route asks for, so the Netlify site sets
 * FUNCTION_TIME_LIMIT_SECONDS=60. Unset means Vercel's 300s.
 */
const limitSeconds = Number(process.env.FUNCTION_TIME_LIMIT_SECONDS) || 300;

export const FUNCTION_TIME_LIMIT_MS = limitSeconds * 1000;

/** Stop starting new work this long into a request: leaves 10% of the limit (at most 30s) for the response to return before the host kills the invocation. 270s on Vercel, 54s on Netlify. */
export const SOFT_DEADLINE_MS = FUNCTION_TIME_LIMIT_MS - Math.min(30_000, FUNCTION_TIME_LIMIT_MS * 0.1);
