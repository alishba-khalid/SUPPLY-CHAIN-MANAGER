import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new name/export) —
// this file is the proxy equivalent of Clerk's usual `middleware.ts` example.

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isDashboardRoute(req)) return;

  // Live Demo mode: allow instant exploration of pre-loaded sample dataset with no signup
  const isDemo =
    req.nextUrl.searchParams.get("demo") === "true" ||
    req.cookies.get("demo_mode")?.value === "true";

  if (isDemo) {
    const res = NextResponse.next();
    if (req.nextUrl.searchParams.get("demo") === "true") {
      res.cookies.set("demo_mode", "true", { path: "/" });
    }
    return res;
  }

  const { userId, orgId } = await auth();

  if (!userId) {
    // Not signed in at all — Clerk's own redirect to sign-in.
    await auth.protect();
    return;
  }

  if (!orgId) {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    // Signed in, but no active organization selected — send to pick or create org
    const url = new URL("/select-org", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
