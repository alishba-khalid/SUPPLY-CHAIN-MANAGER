import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function AIManagerPage() {
  return (
    <div>
      <PageHeader title="AI Manager" description="Ask questions about your supply chain." />
      <SessionPlaceholder
        session="Session 6"
        description="Deterministic AI responses — answer, evidence, explanation, and recommendation — grounded in the exact same seed data as every other page."
      />
    </div>
  );
}
