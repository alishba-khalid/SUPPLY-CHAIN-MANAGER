import { test, describe } from "node:test";
import assert from "node:assert";
import { downloadUrl, isPrivateAddress, linkProblem } from "../source-url";

describe("linkProblem", () => {
  test("accepts normal provider links", () => {
    assert.strictEqual(linkProblem("google_sheets", "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?output=csv"), null);
    assert.strictEqual(linkProblem("onedrive", "https://1drv.ms/x/s!Abc123"), null);
    assert.strictEqual(linkProblem("onedrive", "https://contoso.sharepoint.com/:x:/g/abc"), null);
    assert.strictEqual(linkProblem("csv_url", "https://example.com/stock.csv"), null);
  });

  test("rejects non-https, wrong host, local and IP links", () => {
    assert.match(linkProblem("csv_url", "http://example.com/a.csv") ?? "", /https/);
    assert.match(linkProblem("google_sheets", "https://example.com/sheet") ?? "", /docs\.google\.com/);
    assert.match(linkProblem("onedrive", "https://evil.com/onedrive.live.com") ?? "", /OneDrive/);
    assert.ok(linkProblem("csv_url", "https://localhost/a.csv"));
    assert.ok(linkProblem("csv_url", "https://169.254.169.254/latest/meta-data"));
    assert.ok(linkProblem("csv_url", "https://[::1]/a.csv"));
    assert.ok(linkProblem("csv_url", "https://user:pw@example.com/a.csv"));
    assert.ok(linkProblem("csv_url", "https://example.com:8443/a.csv"));
    assert.ok(linkProblem("csv_url", "not a link"));
  });
});

describe("downloadUrl", () => {
  test("Google publish-to-web page becomes its CSV export, keeping the tab", () => {
    assert.strictEqual(
      downloadUrl("google_sheets", "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pubhtml?gid=42"),
      "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=42&single=true&output=csv",
    );
  });

  test("Google edit link becomes an export link with the tab from the hash", () => {
    assert.strictEqual(
      downloadUrl("google_sheets", "https://docs.google.com/spreadsheets/d/SHEETID/edit#gid=7"),
      "https://docs.google.com/spreadsheets/d/SHEETID/export?format=csv&gid=7",
    );
  });

  test("OneDrive share link gets download=1", () => {
    assert.strictEqual(downloadUrl("onedrive", "https://1drv.ms/x/s!Abc"), "https://1drv.ms/x/s!Abc?download=1");
  });

  test("other CSV links are left alone", () => {
    assert.strictEqual(downloadUrl("csv_url", "https://example.com/a.csv?x=1"), "https://example.com/a.csv?x=1");
  });
});

describe("isPrivateAddress", () => {
  test("blocks private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.1.2.3"]) {
      assert.ok(isPrivateAddress(ip), ip);
    }
  });

  test("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "142.250.72.14", "172.32.0.1", "2607:f8b0:4005::200e"]) {
      assert.ok(!isPrivateAddress(ip), ip);
    }
  });
});
