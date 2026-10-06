/**
 * Link rules for Automatic refresh (pure — no network). Which hosts each
 * provider may start from, how a share/edit link becomes a direct download,
 * and which IP addresses must never be fetched (private networks, loopback,
 * cloud metadata), so a saved link can't be used to probe internal systems.
 */
import type { DataSourceProvider } from "@/types/integrations";

export const PROVIDER_HOSTS: Record<DataSourceProvider, RegExp | null> = {
  google_sheets: /^docs\.google\.com$/,
  onedrive: /(^|\.)(onedrive\.live\.com|1drv\.ms|sharepoint\.com)$/,
  csv_url: null, // any public https host
};

/** A message when the link can't be used, else null. */
export function linkProblem(provider: DataSourceProvider, raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "That isn't a full link — it should start with https://";
  }
  if (url.protocol !== "https:") return "Use an https:// link.";
  if (url.username || url.password) return "Links with a username or password in them aren't allowed.";
  if (url.port && url.port !== "443") return "Use a normal https link (no custom port).";
  const allowed = PROVIDER_HOSTS[provider];
  if (allowed && !allowed.test(url.hostname)) {
    return provider === "google_sheets"
      ? "Google Sheets links start with https://docs.google.com/"
      : "OneDrive links come from onedrive.live.com, 1drv.ms or sharepoint.com.";
  }
  if (isIpLiteral(url.hostname) || url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    return "Use a public link, not a local or IP address.";
  }
  if (raw.length > 2000) return "That link is too long.";
  return null;
}

/**
 * The URL to download. Google Sheets: a "publish to web" page or an edit
 * link becomes its CSV export (keeping the tab's gid). OneDrive/SharePoint:
 * a share link gets download=1. Anything else is used as given.
 */
export function downloadUrl(provider: DataSourceProvider, raw: string): string {
  const url = new URL(raw.trim());
  if (provider === "google_sheets") {
    const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([^/]+)\/(pubhtml|pub)/);
    if (published) {
      const out = new URL(`https://docs.google.com/spreadsheets/d/e/${published[1]}/pub`);
      const gid = url.searchParams.get("gid");
      if (gid) out.searchParams.set("gid", gid);
      out.searchParams.set("single", "true");
      out.searchParams.set("output", "csv");
      return out.toString();
    }
    const edit = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
    if (edit) {
      const out = new URL(`https://docs.google.com/spreadsheets/d/${edit[1]}/export`);
      out.searchParams.set("format", "csv");
      const gid = url.searchParams.get("gid") ?? url.hash.match(/gid=(\d+)/)?.[1];
      if (gid) out.searchParams.set("gid", gid);
      return out.toString();
    }
    return url.toString();
  }
  if (provider === "onedrive") {
    url.searchParams.set("download", "1");
    return url.toString();
  }
  return url.toString();
}

export function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
}

/** True for addresses a server-side fetch must never reach. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast and reserved
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}
