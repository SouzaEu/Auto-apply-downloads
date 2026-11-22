(() => {
  "use strict";

  const repository = "SouzaEu/Auto-apply-downloads";
  const downloads = {
    windows: {
      label: "Baixar para Windows",
      asset: "CV-Auto-Windows-Setup.exe",
    },
    macos: {
      label: "Baixar para Mac",
      asset: "CV-Auto-macos-arm64.dmg",
    },
  };

  const releaseBase = `https://github.com/${repository}/releases/download/`;
  // Read the same known installers that work with JavaScript disabled.
  for (const [name, download] of Object.entries(downloads)) {
    const [fallback] = document.querySelectorAll(`[data-download-platform="${name}"]`);
    const url = fallback?.href || "";
    const suffix = `/${download.asset}`;
    const tag = url.startsWith(releaseBase) && url.endsWith(suffix)
      ? url.slice(releaseBase.length, -suffix.length)
      : "";
    const pinned = version(tag);
    if (pinned) Object.assign(download, { url, version: pinned, prerelease: tag.endsWith("-windows-beta") });
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
  const betaLabels = {
    "pt-BR": "Versão de teste",
    en: "Beta version",
    es: "Versión de prueba",
  };
  function renderDownloads() {
    for (const [name, download] of Object.entries(downloads)) {
      if (!download.version) continue;
      document.querySelectorAll(`[data-download-platform="${name}"]`).forEach(link => {
        link.href = download.url;
      });
      document.querySelectorAll(`[data-platform-version="${name}"]`).forEach(label => {
        label.textContent = `Build ${download.version[3]}`;
        label.hidden = false;
      });
      document.querySelectorAll(`[data-platform-status="${name}"]`).forEach(label => {
        label.hidden = !download.prerelease;
        label.textContent = download.prerelease
          ? betaLabels[document.documentElement?.lang] || betaLabels["pt-BR"]
          : "";
      });
      document.querySelectorAll(`[data-platform-card="${name}"]`).forEach(card => {
        card.hidden = false;
        card.classList.toggle("featured", name === (platform || "windows"));
      });
    }
    if (platform && downloads[platform].version) {
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
  globalThis.addEventListener?.("forma-language", renderDownloads);
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
      if (!download.version) continue;
      let selected = download;
      for (const release of releases) {
        const candidate = version(release.tag_name);
        if (release.draft || !candidate || !Array.isArray(release.assets)) continue;
        const expected = `${releaseBase}${release.tag_name}/${download.asset}`;
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
