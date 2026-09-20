"use client";

import { SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/** Surfaces a visible error when Clerk fails to initialise.
 *  Without this, a missing / wrong publishable key produces a silent blank page. */
function ClerkInitGuard({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!key || key.trim() === "") {
      setError(
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from this deployment. " +
          "Add a pk_live_ key in your Vercel environment variables and redeploy."
      );
      return;
    }
    if (key.startsWith("pk_test_")) {
      // Development key deployed to production — Clerk will reject it on the
      // production domain.  Surface a warning rather than silently failing.
      console.warn(
        "[Clerk] pk_test_ key detected in a browser context. " +
          "Ensure pk_live_ / sk_live_ keys are set for the production deployment."
      );
    }
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        style={{
          maxWidth: 480,
          margin: "auto",
          padding: "2rem",
          background: "#1a1a2e",
          border: "1px solid #e53e3e",
          borderRadius: 12,
          color: "#feb2b2",
          fontFamily: "monospace",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#fc8181", display: "block", marginBottom: 8 }}>
          ⚠ Authentication unavailable
        </strong>
        {error}
        <br />
        <br />
        <span style={{ color: "#a0aec0", fontSize: "0.85em" }}>
          If you are the site owner, check your Vercel → Settings → Environment
          Variables and confirm that both{" "}
          <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> (pk_live_…) and{" "}
          <code>CLERK_SECRET_KEY</code> (sk_live_…) are set for the Production
          environment, then redeploy.
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg) p-4">
      <ClerkInitGuard>
        <SignUp fallbackRedirectUrl="/dashboard/overview" />
      </ClerkInitGuard>
    </div>
  );
}
