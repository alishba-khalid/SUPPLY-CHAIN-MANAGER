"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitDesignPartnerApplication, type FormState } from "@/app/actions/leads";

export const INPUT_CLASS =
  "h-10 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)";
export const LABEL_CLASS = "mb-1.5 block text-small font-medium text-(--color-text-primary)";

/** Off-screen field real users never see; bots that fill every input trip it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

const INITIAL: FormState = { status: "idle" };

export function DesignPartnerForm() {
  const [state, formAction, pending] = useActionState(submitDesignPartnerApplication, INITIAL);
  const [tool, setTool] = useState("Excel");

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 size={40} className="text-emerald-500" />
        <p className="mt-4 text-h3 text-(--color-text-primary)">Application received</p>
        <p className="mt-2 text-body text-(--color-text-secondary)">
          Thanks — I read every application personally and will reply by email within two business days.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="relative space-y-5">
      <Honeypot />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL_CLASS}>Name</label>
          <input id="name" name="name" required autoComplete="name" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="company" className={LABEL_CLASS}>Company</label>
          <input id="company" name="company" required autoComplete="organization" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="workEmail" className={LABEL_CLASS}>Work email</label>
          <input id="workEmail" name="workEmail" type="email" required autoComplete="email" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="role" className={LABEL_CLASS}>Role</label>
          <input id="role" name="role" required autoComplete="organization-title" placeholder="e.g. Purchasing Manager" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="skuCount" className={LABEL_CLASS}>Number of SKUs</label>
          <input id="skuCount" name="skuCount" type="number" min={0} step={1} inputMode="numeric" required className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="warehouseCount" className={LABEL_CLASS}>Number of warehouses</label>
          <input id="warehouseCount" name="warehouseCount" type="number" min={0} step={1} inputMode="numeric" required className={INPUT_CLASS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="currentTool" className={LABEL_CLASS}>Current tool</label>
          <select id="currentTool" name="currentTool" value={tool} onChange={(e) => setTool(e.target.value)} className={INPUT_CLASS}>
            <option value="Excel">Excel</option>
            <option value="ERP">ERP</option>
            <option value="Other">Other</option>
          </select>
        </div>
        {tool !== "Excel" && (
          <div>
            <label htmlFor="currentToolDetail" className={LABEL_CLASS}>{tool === "ERP" ? "Which ERP?" : "Which tool?"}</label>
            <input
              id="currentToolDetail"
              name="currentToolDetail"
              required
              placeholder={tool === "ERP" ? "e.g. NetSuite, Acumatica" : "e.g. Google Sheets"}
              className={INPUT_CLASS}
            />
          </div>
        )}
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-small font-medium text-(--color-critical)">{state.message}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Apply as a design partner"}
      </Button>
    </form>
  );
}
