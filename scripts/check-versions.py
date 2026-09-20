"""Require aligned versions and the complete LGPL distribution notices."""
import json
from pathlib import Path
import tomllib

root = Path(__file__).resolve().parent.parent
crate = tomllib.loads((root / "Cargo.toml").read_text())["package"]
name = crate["name"]
version = crate["version"]
license_id = crate["license"]
assert license_id == "LGPL-3.0-only WITH LGPL-3.0-linking-exception"
package = root / "js/@corbet-foss" / name
for manifest in ("package.json", "jsr.json"):
    metadata = json.loads((package / manifest).read_text())
    assert metadata["version"] == version
    # Every manifest declares the full LGPL-3.0-only WITH
    # LGPL-3.0-linking-exception grant; the exception text ships in the
    # published file set (no publish.exclude carve-out).
    assert metadata["license"] == license_id
for manifest, key in (("py/pyproject.toml", "project"), ("typst.toml", "package")):
    metadata = tomllib.loads((root / manifest).read_text())[key]
    assert metadata["version"] == version
    assert metadata["license"] == license_id
# LICENSES/FSL-1.1-ALv2.txt is a historical reference for superseded grants
# and is never distributed: it stays out of the crate, wheels, and JS bundles.
expected = {path.name: path.read_bytes() for path in (root / "LICENSES").iterdir() if path.is_file() and path.name != "FSL-1.1-ALv2.txt"}
for filename in ("LGPL-3.0-only.txt", "LGPL-3.0-only WITH LGPL-3.0-linking-exception.txt", "LGPL-3.0-linking-exception.txt", "GPL-3.0-only.txt"):
    assert expected[filename], f"Missing complete {filename}"
assert (root / "LICENSE").read_bytes().endswith(expected["LGPL-3.0-only.txt"])
assert b"Copyright 2026 Julian Y. Richard Corbet" in (root / "LICENSE").read_bytes()
assert {path.name: path.read_bytes() for path in (root / "py/LICENSES").iterdir() if path.is_file()} == expected
assert (root / "py/README.md").read_bytes() == (root / "README.md").read_bytes()
assert (package / "README.md").read_bytes() == (root / "README.md").read_bytes()
lock = tomllib.loads((root / "Cargo.lock").read_text())
assert any(item["name"] == name and item["version"] == version and "source" not in item for item in lock["package"])
print(f"{name}: all distributions at {version}, license {license_id}")
