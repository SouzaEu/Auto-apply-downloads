import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const code = await readFile(new URL("../docs/downloads.js", import.meta.url), "utf8");
const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
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
  const links = Object.fromEntries(Object.keys(assets).map(platform => {
    const tag = new RegExp(`data-download-platform="${platform}"[^>]*href="([^"]+)"`).exec(html);
    assert.ok(tag, `HTML fallback for ${platform}`);
    return [platform, [{ href: tag[1] }]];
  }));
  const statuses = { windows: [{}] };
  const versions = { windows: [{}], macos: [{}] };
  const cards = { windows: [{ classList: { toggle() {} } }], macos: [{ classList: { toggle() {} } }] };
  const document = {
    querySelectorAll(selector) {
      if (selector === "[data-download-auto]") return auto;
      for (const [attribute, group] of Object.entries({
        "data-download-platform": links, "data-platform-status": statuses, "data-platform-version": versions,
        "data-platform-card": cards,
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
  return { auto: auto[0], windows: links.windows[0], macos: links.macos[0], status: statuses.windows[0], versions, cards };
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
    release("v2026.11.23.240-windows-beta", "windows", true),
    release("v2026.11.14.210", "windows"),
  ]);
  assert.match(result.auto.href, /downloads\/windows\?tag=v2026\.11\.23\.240-windows-beta$/);
  assert.match(result.macos.href, /downloads\/macos\?tag=v2026\.11\.22\.239$/);
  assert.equal(result.status.hidden, false);
  assert.equal(result.versions.windows[0].textContent, "Build 240");
  assert.equal(result.versions.macos[0].textContent, "Build 239");
});

test("ignores drafts, incomplete releases, foreign URLs and older versions", async () => {
  const draft = { ...release("v2026.11.23.240", "windows"), draft: true };
  const incomplete = release("v2026.11.24.241", "windows");
  incomplete.assets.pop();
  const foreign = release("v2026.11.25.242", "windows");
  foreign.assets[0].browser_download_url = "https://example.invalid/app.exe";
  const result = await page({ platform: "Win32" }, [
    draft, incomplete, foreign, release("v2026.11.8.180", "windows"),
  ]);
  assert.match(result.auto.href, /239-windows-beta/);
});

test("stable publication replaces the beta and failed lookups preserve usable links", async () => {
  const stable = await page({ platform: "Win32" }, [release("v2026.11.23.240", "windows")]);
  assert.equal(stable.status.hidden, true);
  assert.match(stable.auto.href, /tag=v2026.11.23.240$/);
  const offline = await page({ platform: "MacIntel" }, [], true);
  assert.match(offline.auto.href, /downloads\/macos\?tag=v2026\.11\.22\.239$/);
  assert.equal(offline.versions.macos[0].textContent, "Build 239");
});
