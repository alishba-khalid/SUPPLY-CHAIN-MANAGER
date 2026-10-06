import { prisma } from "@/lib/prisma";
import type { DataSource, DataSourceProvider, NewDataSource, RefreshSchedule } from "@/types/integrations";
import type { TemplateType } from "@/lib/importer/template-rows";

/** Saved links per workspace — keeps the list short and the cron bounded. */
export const MAX_SOURCES_PER_ORG = 10;

interface DataSourceRow {
  id: string;
  orgId: string;
  provider: string;
  url: string;
  dataType: string;
  schedule: string;
  lastRefreshedAt: Date | null;
  lastResult: string | null;
}

function toDataSource(row: DataSourceRow): DataSource {
  return {
    id: row.id,
    provider: row.provider as DataSourceProvider,
    url: row.url,
    dataType: row.dataType as TemplateType,
    schedule: row.schedule as RefreshSchedule,
    lastRefreshedAt: row.lastRefreshedAt ? row.lastRefreshedAt.toISOString() : null,
    lastResult: row.lastResult,
  };
}

export async function listDataSources(orgId: string): Promise<DataSource[]> {
  const rows = await prisma.dataSource.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
  return rows.map(toDataSource);
}

export async function countDataSources(orgId: string): Promise<number> {
  return prisma.dataSource.count({ where: { orgId } });
}

export async function getDataSource(orgId: string, id: string): Promise<DataSource | undefined> {
  const row = await prisma.dataSource.findFirst({ where: { orgId, id } });
  return row ? toDataSource(row) : undefined;
}

export async function insertDataSource(orgId: string, source: NewDataSource): Promise<DataSource> {
  const row = await prisma.dataSource.create({
    data: { id: crypto.randomUUID(), orgId, ...source },
  });
  return toDataSource(row);
}

/** Deletes only within this org; false when nothing matched. */
export async function deleteDataSource(orgId: string, id: string): Promise<boolean> {
  const res = await prisma.dataSource.deleteMany({ where: { orgId, id } });
  return res.count > 0;
}

export async function recordDataSourceRefresh(orgId: string, id: string, result: string): Promise<DataSource | undefined> {
  await prisma.dataSource.updateMany({
    where: { orgId, id },
    data: { lastRefreshedAt: new Date(), lastResult: result.slice(0, 500) },
  });
  return getDataSource(orgId, id);
}

/** Every daily source across all orgs, for the cron job. */
export async function listDailyDataSources(): Promise<(DataSource & { orgId: string })[]> {
  const rows = await prisma.dataSource.findMany({ where: { schedule: "daily" }, orderBy: { orgId: "asc" } });
  return rows.map((row) => ({ ...toDataSource(row), orgId: row.orgId }));
}
