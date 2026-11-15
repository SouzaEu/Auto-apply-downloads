"""Hide superseded installers only after the site's current fallback is deployed."""

import argparse
import json
from pathlib import Path
import re
import subprocess


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


def pinned_tags(script):
    found = re.findall(r'tag: "(v\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,6}(?:-windows-beta)?)"', script)
    if len(found) != 2 or len(set(found)) != 2:
        raise ValueError("Expected exactly two pinned desktop releases")
    mac = next((tag for tag in found if not tag.endswith("-windows-beta")), None)
    windows = next((tag for tag in found if tag.endswith("-windows-beta")), None)
    if not mac or windows != mac + "-windows-beta":
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
    pinned = pinned_tags((ROOT / "docs/downloads.js").read_text())
    html = (ROOT / "docs/index.html").read_text()
    if any(tag not in html for tag in pinned):
        raise ValueError("HTML fallback differs from downloads.js")
    old = retirement_plan(all_releases(), pinned)
    if args.apply:
        for tag in old:
            subprocess.run(["gh", "release", "edit", tag, "-R", REPO, "--draft"],
                           cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    print(json.dumps({"current": pinned, "retired" if args.apply else "would_retire": old}))


if __name__ == "__main__":
    main()
