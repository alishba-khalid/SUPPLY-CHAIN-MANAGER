import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE_URL } from "../site-config";
import { SITEMAP_SECTION_NAMES, allSitemapUrls, renderIndex, renderUrlSet, SITEMAP_SECTIONS } from "../sitemap-data";

test("sitemap has 100 unique URLs on the site's own domain, none from private areas", () => {
  const urls = allSitemapUrls();
  assert.equal(new Set(urls).size, urls.length, "duplicate URL");
  assert.equal(urls.length, 100);
  for (const u of urls) {
    assert.ok(u.startsWith(SITE_URL), u);
    assert.ok(!u.includes("/dashboard"), u);
  }
});

test("index points to one file per section", () => {
  const xml = renderIndex();
  for (const n of SITEMAP_SECTION_NAMES) assert.ok(xml.includes(`${SITE_URL}/sitemaps/${n}.xml`), n);
  assert.ok(xml.startsWith("<?xml"));
});

test("section files are well-formed and carry real dates", () => {
  for (const n of SITEMAP_SECTION_NAMES) {
    const entries = SITEMAP_SECTIONS[n]();
    assert.ok(entries.length > 0, n);
    const xml = renderUrlSet(entries);
    assert.equal((xml.match(/<url>/g) ?? []).length, entries.length);
    for (const e of entries) assert.ok(!Number.isNaN(e.lastModified.getTime()), e.url);
  }
});
