import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const code = await readFile(new URL("../docs/downloads.js", import.meta.url), "utf8");
const base = "https://github.com/SouzaEu/Auto-apply-downloads/releases/download/";
const assets = { windows: "CV-Auto-Windows-Setup.exe", macos: "CV-Auto-macos-arm64.dmg" };

function release(tag, platform, prerelease = false) {
  const asset = assets[platform];
  return {
    tag_name: tag, prerelease, draft: false,
    assets: [asset, asset + ".sha256"].map(name => ({
      name, state: "uploaded", browser_download_url: base + tag + "/" + name,
    })),
  };
}

async function page(navigator, releases = [], error = false) {
  const auto = [{ href: "#download", textContent: "Experimentar grátis" }];
  const links = { windows: [{}], macos: [{}] };
  const statuses = { windows: [{}] };
  const cards = { windows: [{ classList: { toggle() {} } }], macos: [{ classList: { toggle() {} } }] };
  const document = {
    querySelectorAll(selector) {
      if (selector === "[data-download-auto]") return auto;
      for (const [attribute, group] of Object.entries({
        "data-download-platform": links, "data-platform-status": statuses, "data-platform-card": cards,
      })) {
        const match = new RegExp('^\\[' + attribute + '="([^"]+)"\\]$').exec(selector);
        if (match) return group[match[1]] || [];
      }
      return [];
    },
  };
  vm.runInNewContext(code, {
    navigator, document,
    fetch: async () => {
      if (error) throw new Error("offline");
      return { ok: true, json: async () => releases };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { auto: auto[0], windows: links.windows[0], macos: links.macos[0], status: statuses.windows[0], cards };
}

test("chooses the appropriate desktop download while keeping both installers visible", async () => {
  const windows = await page({ userAgentData: { platform: "Windows" } });
  assert.equal(windows.auto.textContent, "Baixar para Windows");
  assert.equal(windows.cards.windows[0].hidden, false);
  assert.equal(windows.cards.macos[0].hidden, false);
  const mac = await page({ platform: "MacIntel", maxTouchPoints: 0 });
  assert.equal(mac.auto.textContent, "Baixar para Mac");
  assert.equal(mac.cards.windows[0].hidden, false);
  assert.equal(mac.cards.macos[0].hidden, false);
  for (const navigator of [
    { platform: "MacIntel", maxTouchPoints: 5 },
    { userAgent: "Android", userAgentData: { platform: "Linux", mobile: true } },
    { userAgent: "iPhone" },
    { platform: "Linux x86_64" },
  ]) {
    assert.equal((await page(navigator)).auto.href, "#download");
  }
});

test("selects each platform independently, including the published Windows beta", async () => {
  const result = await page({ platform: "Win32" }, [
    release("v2026.11.8.188", "macos"),
    release("v2026.11.11.200", "macos"),
    release("v2026.11.14.211-windows-beta", "windows", true),
    release("v2026.11.14.210", "windows"),
  ]);
  assert.match(result.auto.href, /211-windows-beta\/CV-Auto-Windows-Setup.exe$/);
  assert.match(result.macos.href, /209\/CV-Auto-macos-arm64.dmg$/);
  assert.equal(result.status.hidden, false);
});

test("ignores drafts, incomplete releases, foreign URLs and older versions", async () => {
  const draft = { ...release("v2026.11.11.220", "windows"), draft: true };
  const incomplete = release("v2026.11.11.221", "windows");
  incomplete.assets.pop();
  const foreign = release("v2026.11.11.222", "windows");
  foreign.assets[0].browser_download_url = "https://example.invalid/app.exe";
  const result = await page({ platform: "Win32" }, [
    draft, incomplete, foreign, release("v2026.11.8.180", "windows"),
  ]);
  assert.match(result.auto.href, /209-windows-beta/);
});

test("stable publication replaces the beta and failed lookups preserve usable links", async () => {
  const stable = await page({ platform: "Win32" }, [release("v2026.11.14.210", "windows")]);
  assert.equal(stable.status.hidden, true);
  assert.match(stable.auto.href, /v2026.11.14.210\//);
  const offline = await page({ platform: "MacIntel" }, [], true);
  assert.match(offline.auto.href, /CV-Auto-macos-arm64.dmg$/);
});
