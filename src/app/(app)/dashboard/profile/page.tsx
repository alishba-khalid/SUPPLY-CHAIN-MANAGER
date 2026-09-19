import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { UserRoundX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireOrgId, isDemoOrg } from "@/lib/auth";

export default async function ProfilePage() {
  const orgId = await requireOrgId();
  const isDemo = isDemoOrg(orgId);

  return (
    <div>
      <PageHeader title="Profile" description="Your account and organization details." />
      <div className="p-8">
        {isDemo ? (
          <EmptyState
            icon={<UserRoundX size={18} />}
            title="No account attached"
            description="Demo Workspace — you're exploring shared, simulated data with no real account behind it."
            action={
              <Link href="/sign-up" className={buttonVariants({ variant: "primary" })}>
                Sign up to manage your own profile
              </Link>
            }
          />
        ) : (
          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-(--color-border) w-full",
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
