"use client";

import { useSyncExternalStore } from "react";
import { PageHeader } from "@/components/ui/page-header";

function getGreetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const noSubscribe = () => () => {};
const browserGreeting = () => getGreetingForHour(new Date().getHours());
// The server doesn't know the visitor's time zone, so it renders a neutral
// greeting; the browser swaps in its local one after hydration (no mismatch).
const serverGreeting = () => "Welcome back";

export function OverviewHeader({ userName }: { userName?: string | null }) {
  const greeting = useSyncExternalStore(noSubscribe, browserGreeting, serverGreeting);

  return (
    <PageHeader
      title={userName ? `${greeting}, ${userName}.` : `${greeting}.`}
      description="Here's what your Supply Chain Manager is watching right now."
    />
  );
}
