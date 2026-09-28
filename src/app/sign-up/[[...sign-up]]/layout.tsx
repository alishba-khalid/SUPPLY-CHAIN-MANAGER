import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site-config";

// The sign-up page is a client component, which can't export metadata, so
// its title and noindex live here.
export const metadata: Metadata = {
  title: `Create your account | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
