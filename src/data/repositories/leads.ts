import { prisma } from "@/lib/prisma";

/**
 * Public marketing-site submissions. Not tenant data — these come from
 * visitors without an org, so unlike every other repository here there is
 * no orgId to scope by.
 */

export interface DesignPartnerApplicationInput {
  name: string;
  company: string;
  workEmail: string;
  role: string;
  skuCount: number;
  warehouseCount: number;
  currentTool: string;
}

export async function createDesignPartnerApplication(data: DesignPartnerApplicationInput): Promise<void> {
  await prisma.designPartnerApplication.create({ data });
}

export async function createHealthCheckLead(data: { workEmail: string; companyName: string }): Promise<void> {
  await prisma.healthCheckLead.create({ data });
}
