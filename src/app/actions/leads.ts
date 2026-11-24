"use server";

import { createDesignPartnerApplication, createHealthCheckLead } from "@/data/repositories/leads";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { notifyFounder } from "@/lib/email";

// Public, unauthenticated forms — cap per IP so a bot can't fill the tables
// or the founder's inbox.
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 200;

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim().slice(0, MAX_TEXT);
}

function nonNegativeInt(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").replace(/,/g, "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

async function allowed(scope: string): Promise<boolean> {
  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`form:${scope}:ip:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  return allowed;
}

export async function submitDesignPartnerApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  // Honeypot: hidden from humans, filled by naive bots. Pretend success.
  if (text(formData, "website")) return { status: "success" };

  const name = text(formData, "name");
  const company = text(formData, "company");
  const workEmail = text(formData, "workEmail").toLowerCase();
  const role = text(formData, "role");
  const skuCount = nonNegativeInt(formData, "skuCount");
  const warehouseCount = nonNegativeInt(formData, "warehouseCount");
  const toolChoice = text(formData, "currentTool");
  const toolDetail = text(formData, "currentToolDetail");

  if (!name || !company || !role) return { status: "error", message: "Please fill in every field." };
  if (!EMAIL_RE.test(workEmail)) return { status: "error", message: "Please enter a valid work email." };
  if (skuCount === null || warehouseCount === null) {
    return { status: "error", message: "SKU and warehouse counts must be whole numbers." };
  }
  if (!["Excel", "ERP", "Other"].includes(toolChoice)) return { status: "error", message: "Please pick your current tool." };
  if (toolChoice !== "Excel" && !toolDetail) {
    return { status: "error", message: toolChoice === "ERP" ? "Which ERP do you use?" : "Which tool do you use?" };
  }
  const currentTool = toolChoice === "Excel" ? "Excel" : `${toolChoice}: ${toolDetail}`;

  if (!(await allowed("design-partner"))) {
    return { status: "error", message: "Too many submissions from this network — please try again later." };
  }

  await createDesignPartnerApplication({ name, company, workEmail, role, skuCount, warehouseCount, currentTool });

  await notifyFounder(`Design partner application: ${company}`, {
    Name: name,
    Company: company,
    "Work email": workEmail,
    Role: role,
    SKUs: skuCount.toLocaleString(),
    Warehouses: warehouseCount,
    "Current tool": currentTool,
  });

  return { status: "success" };
}

export async function submitHealthCheckLead(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData, "website")) return { status: "success" };

  const workEmail = text(formData, "workEmail").toLowerCase();
  const companyName = text(formData, "companyName");

  if (!EMAIL_RE.test(workEmail)) return { status: "error", message: "Please enter a valid work email." };
  if (!companyName) return { status: "error", message: "Please enter your company name." };

  if (!(await allowed("health-check"))) {
    return { status: "error", message: "Too many requests from this network — please try again later." };
  }

  await createHealthCheckLead({ workEmail, companyName });
  await notifyFounder(`Health check report requested: ${companyName}`, {
    Company: companyName,
    "Work email": workEmail,
  });

  return { status: "success" };
}
