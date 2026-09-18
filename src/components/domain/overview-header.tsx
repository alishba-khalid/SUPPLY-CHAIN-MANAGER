"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";

function getGreetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function OverviewHeader({ userName }: { userName?: string | null }) {
  const [greeting, setGreeting] = useState(() => {
    return getGreetingForHour(new Date().getHours());
  });

  useEffect(() => {
    setGreeting(getGreetingForHour(new Date().getHours()));
  }, []);

  return (
    <PageHeader
      title={userName ? `${greeting}, ${userName}.` : `${greeting}.`}
      description="Here's what your Supply Chain Manager is watching right now."
    />
  );
}
