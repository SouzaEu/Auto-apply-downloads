"""Hide superseded installers only after the site's current fallback is deployed."""

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlparse, parse_qs


REPO = "SouzaEu/Auto-apply-downloads"
ROOT = Path(__file__).resolve().parents[1]
TAG = re.compile(r"v(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,6})(-windows-beta)?")


def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def api(path):
    return json.loads(command("gh", "api", f"repos/{REPO}/{path}"))


def all_releases():
    pages = json.loads(command("gh", "api", "--paginate", "--slurp",
                               f"repos/{REPO}/releases?per_page=100"))
    return [release for page in pages for release in page]


def pinned_tags(html):
    paths = {
        "macos": "CV-Auto-macos-arm64.dmg",
        "windows": "CV-Auto-Windows-Setup.exe",
    }
    hrefs = {}

    class DownloadLinks(HTMLParser):
        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs)
            platform = attributes.get("data-download-platform")
            if tag != "a" or platform not in paths:
                return
            if platform in hrefs:
                raise ValueError(f"Duplicate fallback link for {platform}")
            hrefs[platform] = attributes.get("href", "")

    DownloadLinks().feed(html)
    base = f"https://github.com/{REPO}/releases/download/"
    pinned = {}
    for platform, asset in paths.items():
        href = hrefs.get(platform, "")
        suffix = f"/{asset}"
        parsed = urlparse(href)
        query = parse_qs(parsed.query)
        if parsed.scheme == 'https' and parsed.netloc == 'auto-apply-billing.vsouzaeu.workers.dev' and parsed.path == f'/downloads/{platform}' and set(query) == {'tag'} and len(query['tag']) == 1:
            tag = query['tag'][0]
        elif href.startswith(base) and href.endswith(suffix):
            tag = href[len(base):-len(suffix)]
        else:
            raise ValueError(f"Missing or invalid fallback link for {platform}")
        if not TAG.fullmatch(tag):
            raise ValueError(f"Invalid fallback version for {platform}")
        pinned[platform] = tag

    mac, windows = pinned["macos"], pinned["windows"]
    if mac.endswith("-windows-beta") or windows != mac + "-windows-beta":
        raise ValueError("Pinned Mac and Windows versions differ")
    return mac, windows


def retirement_plan(releases, pinned):
    active = {item["tag_name"]: item for item in releases if not item.get("draft")}
    if not set(pinned) <= active.keys():
        raise ValueError("Both pinned releases must be public")
    expected_assets = {
        pinned[0]: {"CV-Auto-macos-arm64.dmg", "Auto-apply-macos-arm64.zip", "release-manifest.json"},
        pinned[1]: {"CV-Auto-Windows-Setup.exe", "release-manifest.json"},
    }
    for tag, names in expected_assets.items():
        uploaded = {asset.get("name") for asset in active[tag].get("assets", [])
                    if asset.get("state") == "uploaded"}
        if not names <= uploaded:
            raise ValueError(f"Pinned release incomplete: {tag}")
    current = tuple(map(int, TAG.fullmatch(pinned[0]).groups()[:4]))
    old = []
    for tag in active:
        match = TAG.fullmatch(tag)
        if not match:
            raise ValueError(f"Unexpected public release: {tag}")
        version = tuple(map(int, match.groups()[:4]))
        if version > current:
            raise ValueError(f"Newer public release exists: {tag}")
        if tag not in pinned:
            old.append(tag)
    return old


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Actually mark superseded releases as drafts")
    args = parser.parse_args()
    if command("git", "status", "--porcelain"):
        raise ValueError("Site checkout must be clean")
    sha = command("git", "rev-parse", "HEAD")
    if command("git", "ls-remote", "origin", "refs/heads/main").split()[0] != sha:
        raise ValueError("Site checkout must match public main")
    pages = api("pages/builds/latest")
    if pages.get("status") != "built" or pages.get("commit") != sha:
        raise ValueError("Pages has not deployed the current site commit")
    pinned = pinned_tags((ROOT / "docs/index.html").read_text())
    old = retirement_plan(all_releases(), pinned)
    if args.apply:
        for tag in old:
            subprocess.run(["gh", "release", "edit", tag, "-R", REPO, "--draft"],
                           cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    print(json.dumps({"current": pinned, "retired" if args.apply else "would_retire": old}))


if __name__ == "__main__":
    main()
