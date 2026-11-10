(() => {
  "use strict";

  const repository = "SouzaEu/cv-auto-downloads";
  const downloads = {
    windows: {
      label: "Baixar para Windows",
      asset: "CV-Auto-Windows-Setup.exe",
      tag: "v2026.11.9.192-windows-beta",
      prerelease: true,
    },
    macos: {
      label: "Baixar para Mac",
      asset: "CV-Auto-macos-arm64.dmg",
      tag: "v2026.11.9.192",
      prerelease: false,
    },
  };

  for (const download of Object.values(downloads)) {
    download.url = `https://github.com/${repository}/releases/download/${download.tag}/${download.asset}`;
    download.version = version(download.tag);
  }

  function detectPlatform() {
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    const agent = navigator.userAgent || "";
    if (/Android|iPhone|iPad|iPod/i.test(agent)
        || navigator.userAgentData?.mobile
        || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) {
      return null;
    }
    if (/Windows|Win32|Win64/i.test(platform) || /Windows NT/i.test(agent)) return "windows";
    if (/macOS|MacIntel|MacPPC|Macintosh/i.test(platform) || /Macintosh/i.test(agent)) return "macos";
    return null;
  }

  const platform = detectPlatform();
  function renderDownloads() {
    for (const [name, download] of Object.entries(downloads)) {
      document.querySelectorAll(`[data-download-platform="${name}"]`).forEach(link => {
        link.href = download.url;
      });
      document.querySelectorAll(`[data-platform-status="${name}"]`).forEach(label => {
        label.hidden = !download.prerelease;
        label.textContent = download.prerelease ? "Versão de teste" : "";
      });
      document.querySelectorAll(`[data-platform-card="${name}"]`).forEach(card => {
        card.hidden = platform !== null && name !== platform;
        card.classList.toggle("featured", name === (platform || "windows"));
      });
    }
    if (platform) {
      document.querySelectorAll("[data-download-auto]").forEach(link => {
        link.href = downloads[platform].url;
        link.textContent = downloads[platform].label;
      });
    }
  }

  function version(tag) {
    const match = /^(?:autoapply-)?v(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,6})(?:-[a-z0-9.-]+)?$/i.exec(tag || "");
    return match ? match.slice(1).map(Number) : null;
  }

  function compare(first, second) {
    for (let index = 0; index < first.length; index++) {
      if (first[index] !== second[index]) return first[index] - second[index];
    }
    return 0;
  }

  renderDownloads();
  fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`, {
    credentials: "omit",
    headers: { Accept: "application/vnd.github+json" },
    signal: globalThis.AbortSignal?.timeout?.(5000),
  }).then(response => {
    if (!response.ok) throw new Error("Release lookup unavailable");
    return response.json();
  }).then(releases => {
    if (!Array.isArray(releases)) return;
    for (const download of Object.values(downloads)) {
      let selected = download;
      for (const release of releases) {
        const candidate = version(release.tag_name);
        if (release.draft || !candidate || !Array.isArray(release.assets)) continue;
        const expected = `https://github.com/${repository}/releases/download/${release.tag_name}/${download.asset}`;
        const asset = release.assets.find(item =>
          item.name === download.asset && item.state === "uploaded" && item.browser_download_url === expected);
        const checksum = release.assets.find(item =>
          item.name === download.asset + ".sha256" && item.state === "uploaded"
          && item.browser_download_url === expected + ".sha256");
        if (!asset || !checksum) continue;
        if (compare(candidate, selected.version) > 0
            || (compare(candidate, selected.version) === 0 && selected.prerelease && !release.prerelease)) {
          selected = { version: candidate, url: expected, prerelease: Boolean(release.prerelease) };
        }
      }
      Object.assign(download, selected);
    }
    renderDownloads();
  }).catch(() => {
    // The known public installers remain usable when release lookup is unavailable.
  });
})();
