import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/ui/page-header";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="Profile" description="Your account and organization details." />
      <div className="p-8">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-(--color-border) w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
