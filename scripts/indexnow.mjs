// IndexNow submission. Dry run by default; pass --send to actually submit.
// Usage: node scripts/indexnow.mjs [--send] [--site https://supplychainmanager.app]
// Run it only AFTER the site is deployed (the key file must be reachable at
// <site>/cc486a79aa5a7400cfdf5dce44bef800.txt) and only when the owner has said yes.
const KEY = "cc486a79aa5a7400cfdf5dce44bef800";
const args = process.argv.slice(2);
const send = args.includes("--send");
const siteIdx = args.indexOf("--site");
const site = (siteIdx >= 0 ? args[siteIdx + 1] : "https://supplychainmanager.app").replace(/\/$/, "");

const loc = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " returned " + res.status);
  return res.text();
};

const sections = loc(await get(site + "/sitemap.xml"));
const urls = (await Promise.all(sections.map(async (s) => loc(await get(s))))).flat();
console.log("Found " + urls.length + " URLs in " + sections.length + " sitemap files.");

const keyLocation = site + "/" + KEY + ".txt";
const keyCheck = await fetch(keyLocation);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error("Key file is not reachable at " + keyLocation + ". Deploy first. Nothing submitted.");
  process.exit(1);
}

if (!send) {
  console.log("Dry run: nothing submitted. Re-run with --send to submit " + urls.length + " URLs.");
  process.exit(0);
}

const body = { host: new URL(site).host, key: KEY, keyLocation, urlList: urls };
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log("IndexNow responded " + res.status + " " + res.statusText + " (200 or 202 means accepted).");
