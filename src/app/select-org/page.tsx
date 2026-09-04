import { OrganizationList } from "@clerk/nextjs";

export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-(--color-bg) p-4">
      <div className="text-center">
        <h1 className="text-h1 text-(--color-text-primary)">Select an organization</h1>
        <p className="mt-1 text-body text-(--color-text-secondary)">
          Every workspace is scoped to one organization. Pick one or create a new one to continue.
        </p>
      </div>
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/dashboard/overview"
        afterCreateOrganizationUrl="/dashboard/overview"
      />
    </div>
  );
}
