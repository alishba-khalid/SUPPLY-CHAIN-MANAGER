import { Card } from "@/components/ui/card";
import { Sparkles, Mail, CheckCircle2 } from "lucide-react";

const STEPS = [
  { time: "6:00 AM", description: "Reads trailing transaction velocity across every warehouse facility." },
  { time: "6:02 AM", description: "Flags SKU-1015 at NDC as falling under 3 days of cover against a 7-day lead time." },
  { time: "6:03 AM", description: "Detects supplier OTIF fell on SUP-004 from overdue open purchase orders." },
  { time: "6:04 AM", description: "Prioritized decisions are waiting in your dashboard. You approve every single action." },
];

export function MorningBriefing() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">It clocks in before you do</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Every morning, an in-app briefing summarizes your top risks before your first meeting.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <Card key={step.time} className="p-5 border-(--color-border) bg-(--color-surface)">
            <p className="text-body font-bold text-(--color-brand)">{step.time}</p>
            <p className="mt-2 text-body text-(--color-text-primary) font-medium leading-relaxed">{step.description}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-small text-(--color-text-secondary)">
        <Sparkles size={16} className="text-(--color-brand)" />
        <span>In-app briefing included on all plans · Growth plans add automated 6:00 AM email & WhatsApp alerts.</span>
      </div>
    </section>
  );
}
