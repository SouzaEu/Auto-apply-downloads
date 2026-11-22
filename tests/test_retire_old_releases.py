import unittest
from pathlib import Path

from scripts.retire_old_releases import pinned_tags, retirement_plan


def release(tag, names):
    return {"tag_name": tag, "draft": False,
            "assets": [{"name": name, "state": "uploaded"} for name in names]}


HTML = (Path(__file__).parents[1] / "docs/index.html").read_text()
PINNED = ("v2026.11.22.239", "v2026.11.22.239-windows-beta")
CURRENT = [
    release(PINNED[0], ["CV-Auto-macos-arm64.dmg", "Auto-apply-macos-arm64.zip", "release-manifest.json"]),
    release(PINNED[1], ["CV-Auto-Windows-Setup.exe", "release-manifest.json"]),
]


class ReleaseRetirementTests(unittest.TestCase):
    def test_only_complete_matching_pair_can_retire_older_release(self):
        self.assertEqual(pinned_tags(HTML), PINNED)
        old = release("v2026.11.15.218", ["CV-Auto-macos-arm64.dmg"])
        self.assertEqual(retirement_plan(CURRENT + [old], PINNED), [old["tag_name"]])

    def test_incomplete_or_newer_release_stops_retirement(self):
        with self.assertRaises(ValueError):
            retirement_plan(CURRENT[:1], PINNED)
        with self.assertRaises(ValueError):
            retirement_plan(CURRENT + [release("v2026.11.22.240", [])], PINNED)
        with self.assertRaises(ValueError):
            pinned_tags(HTML.replace(PINNED[1], "v2026.11.15.218-windows-beta"))


if __name__ == "__main__":
    unittest.main()
