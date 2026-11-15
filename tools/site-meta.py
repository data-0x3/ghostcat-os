#!/usr/bin/env python3
"""GhostCat OS — fichiers servis par le site en plus des pages.
developed by 0x3 · https://t.me/data0x3

  site/download/ghostcat-os-source.tar.gz et .zip   tout le code (git archive)
  site/download/source.json                         version, date, tailles
  site/repo/x86_64/packages.json                    les paquets du dépôt
  site/source/tree.json + site/source/f/<n>         tout le code, lisible dans l'onglet Code source
                                                    (fichiers renommés f/0001… : GitHub Pages ne sert ni
                                                    les fichiers cachés ni le dossier .github)
Usage : python3 tools/site-meta.py   (depuis la racine du dépôt, après tools/build-packages.sh)
"""
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
REPO = SITE / "repo" / "x86_64"
DL = SITE / "download"

EN = {
    "ghostcat-desktop": "GhostCat OS: the whole system (desktop, Hub, Setup, installer, theme, privacy, updates)",
    "ghostcat-release": "GhostCat OS: system identity (os-release, issue, logo, fastfetch)",
    "ghostcat-keyring": "GhostCat OS: the key that signs the [ghostcat] repository",
    "ghostcat-mirrorlist": "GhostCat OS: addresses of the [ghostcat] repository",
    "ghostcat-privacy": "GhostCat OS: privacy settings (random MAC, encrypted DNS, hardened Firefox, VPN)",
    "ghostcat-theme": "GhostCat OS: fonts, icons, wallpapers, boot screens (GRUB, Plymouth) and GNOME settings",
    "ghostcat-shell": "GhostCat OS: the desktop interface (ghost menu, shield, ghost mode, animations, theme)",
    "ghostcat-shell-extras": "GhostCat OS: dock, blur effect and window animations (third-party GNOME extensions)",
    "ghostcat-hub": "GhostCat OS: GhostCat Hub, Red, Blue and Purple Team tools in one click",
    "ghostcat-setup": "GhostCat OS: the first-boot assistant (language, keyboard, time zone, privacy)",
    "ghostcat-installer": "GhostCat OS: the graphical installer (btrfs, encryption, snapshots, GhostCat GRUB)",
    "ghostcat-update": "GhostCat OS: safe updates (Arch news, keyrings, snapshots)",
}
ORDER = ["ghostcat-desktop", "ghostcat-shell", "ghostcat-hub", "ghostcat-setup", "ghostcat-installer",
         "ghostcat-privacy", "ghostcat-theme", "ghostcat-update", "ghostcat-release", "ghostcat-shell-extras",
         "ghostcat-mirrorlist", "ghostcat-keyring"]


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=True).stdout.strip()


def main():
    DL.mkdir(parents=True, exist_ok=True)
    tar, zipf = DL / "ghostcat-os-source.tar.gz", DL / "ghostcat-os-source.zip"
    git("archive", "--format=tar.gz", "--prefix=ghostcat-os/", "-o", str(tar), "HEAD")
    git("archive", "--format=zip", "--prefix=ghostcat-os/", "-o", str(zipf), "HEAD")
    (DL / "source.json").write_text(json.dumps({
        "commit": git("rev-parse", "--short", "HEAD"),
        "date": git("log", "-1", "--format=%cI"),
        "tar_size": tar.stat().st_size,
        "zip_size": zipf.stat().st_size,
    }, indent=1))

    pkgs = []
    if REPO.is_dir():
        for f in sorted(REPO.glob("*.pkg.tar.zst")):
            m = re.match(r"^(.+?)-([^-]+-[^-]+)-any\.pkg\.tar\.zst$", f.name)
            if not m:
                continue
            name, version = m.groups()
            desc = ""
            pb = ROOT / "pkgs" / name / "PKGBUILD"
            if pb.is_file():
                d = re.search(r'^pkgdesc="(.*)"', pb.read_text(encoding="utf-8"), re.M)
                desc = d.group(1) if d else ""
            if name == "ghostcat-keyring":
                desc = "GhostCat OS : clé qui signe les paquets du dépôt [ghostcat]"
            desc = re.sub(r"^GhostCat OS ?: ", "", desc)
            en = re.sub(r"^GhostCat OS ?: ", "", EN.get(name, desc))
            desc = desc[:1].upper() + desc[1:]
            en = en[:1].upper() + en[1:]
            pkgs.append({"name": name, "version": version, "file": f.name, "size": f.stat().st_size,
                         "desc": desc, "desc_en": en})
        pkgs.sort(key=lambda p: ORDER.index(p["name"]) if p["name"] in ORDER else 99)
        (REPO / "packages.json").write_text(json.dumps(pkgs, ensure_ascii=False, indent=1))
    # ---- explorateur du code source ----
    out = SITE / "source" / "f"
    if out.exists():
        import shutil
        shutil.rmtree(out)
    out.mkdir(parents=True)
    files = [f for f in git("ls-files", "-z").split("\0") if f]
    tree = []
    for i, rel in enumerate(sorted(files)):
        src = ROOT / rel
        if src.is_symlink() or not src.is_file():
            continue
        data = src.read_bytes()
        kind = "bin"
        if b"\0" not in data[:8192]:
            try:
                data.decode("utf-8")
                kind = "text"
            except UnicodeDecodeError:
                pass
        ext = rel.rsplit(".", 1)[-1].lower() if "." in rel.rsplit("/", 1)[-1] else ""
        if ext in ("png", "jpg", "jpeg", "webp", "gif", "svg"):
            kind = "image"
        key = f"{i:04d}"
        (out / key).write_bytes(data)
        tree.append({"p": rel, "s": len(data), "k": kind, "f": key, "x": ext})
    (SITE / "source" / "tree.json").write_text(json.dumps({
        "commit": git("rev-parse", "--short", "HEAD"), "date": git("log", "-1", "--format=%cI"),
        "tar_size": tar.stat().st_size, "zip_size": zipf.stat().st_size, "files": tree,
    }, ensure_ascii=False, separators=(",", ":")))
    print(f"source : {tar.stat().st_size} o, paquets : {len(pkgs)}, fichiers : {len(tree)}")


if __name__ == "__main__":
    main()
