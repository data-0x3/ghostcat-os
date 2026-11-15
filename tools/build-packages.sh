#!/usr/bin/env bash
# GhostCat OS — construit les paquets du dépôt [ghostcat] et le dépôt lui-même.
# developed by 0x3 · https://t.me/data0x3
#
# Usage (root, dans un conteneur ou une machine Arch) :
#   VERSION=2026.11.15.60 tools/build-packages.sh <dossier-du-dépôt>
# Variables :
#   VERSION                 version de tous les paquets GhostCat (obligatoire)
#   GHOSTCAT_SIGNING_KEY    clé privée OpenPGP (armure ASCII) : si présente, les paquets
#                           et le dépôt sont signés et le paquet ghostcat-keyring est créé
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(realpath -m "${1:?dossier de sortie}")"
VERSION="${VERSION:?VERSION manquante}"
say() { printf '\e[1;37m[ghostcat-repo]\e[0m %s\n' "$*"; }

pacman -S --needed --noconfirm base-devel grub glib2 libarchive gnupg >/dev/null
GS_VER="$(pacman -Si gnome-shell 2>/dev/null | awk -F': ' '/^Version/{print $2}' | sed -E 's/^[0-9]+://; s/\..*//')"
export GS_VER="${GS_VER:-49}"
say "version $VERSION, GNOME Shell $GS_VER"

id builder &>/dev/null || useradd -m builder
WORK="$(mktemp -d)"
cp -r "$HERE/pkgs" "$WORK/"
mkdir -p "$OUT"

# ---- clé de signature (facultative) ----
FPR=""
export GNUPGHOME="$(mktemp -d)"; chmod 700 "$GNUPGHOME"
if [[ -n ${GHOSTCAT_SIGNING_KEY:-} ]]; then
  gpg --batch --quiet --import <<<"$GHOSTCAT_SIGNING_KEY"
  FPR="$(gpg --batch --with-colons --list-secret-keys | awk -F: '/^fpr/{print $10; exit}')"
  say "signature avec la clé $FPR"
  K="$WORK/pkgs/ghostcat-keyring"
  mkdir -p "$K/root/usr/share/pacman/keyrings"
  gpg --batch --export "$FPR" > "$K/root/usr/share/pacman/keyrings/ghostcat.gpg"
  echo "$FPR:4:" > "$K/root/usr/share/pacman/keyrings/ghostcat-trusted"
  : > "$K/root/usr/share/pacman/keyrings/ghostcat-revoked"
  cat > "$K/PKGBUILD" <<'PKG'
source ../_common.sh
pkgname=ghostcat-keyring
pkgver=0
pkgrel=1
pkgdesc="GhostCat OS : clé qui signe les paquets du dépôt [ghostcat]"
arch=(any)
url="https://data-0x3.github.io/ghostcat-os/"
license=(GPL-3.0-or-later)
install=ghostcat-keyring.install
package() { _ghostcat_install; }
PKG
  cat > "$K/ghostcat-keyring.install" <<'INS'
post_upgrade() {
  if usr/bin/pacman-key -l >/dev/null 2>&1; then
    usr/bin/pacman-key --populate ghostcat
  fi
}
post_install() {
  if [ -x usr/bin/pacman-key ]; then
    post_upgrade
  fi
}
INS
  sed -i 's/^depends=(ghostcat-release /depends=(ghostcat-keyring ghostcat-release /' "$WORK/pkgs/ghostcat-desktop/PKGBUILD"
  cp "$K/root/usr/share/pacman/keyrings/ghostcat.gpg" "$OUT/ghostcat.gpg"
  gpg --batch --armor --export "$FPR" > "$OUT/ghostcat.asc"
else
  say "pas de clé de signature : paquets NON signés"
fi

# ---- construction ----
chown -R builder: "$WORK"
for dir in "$WORK"/pkgs/*/; do
  [[ -f $dir/PKGBUILD ]] || continue
  name="$(basename "$dir")"
  sed -i "s/^pkgver=0$/pkgver=$VERSION/" "$dir/PKGBUILD"
  say "paquet $name"
  su builder -c "cd '$dir' && GS_VER='$GS_VER' PKGDEST='$WORK/out' makepkg -f --nodeps --noconfirm --noprogressbar" >/dev/null \
    || { echo "échec : $name"; su builder -c "cd '$dir' && GS_VER='$GS_VER' PKGDEST='$WORK/out' makepkg -f --nodeps --noconfirm" | tail -30; exit 1; }
done

# ---- dépôt ----
rm -f "$OUT"/*.pkg.tar.zst "$OUT"/*.sig "$OUT"/ghostcat.db* "$OUT"/ghostcat.files*
cp "$WORK"/out/*.pkg.tar.zst "$OUT/"
cd "$OUT"
if [[ -n $FPR ]]; then
  for p in *.pkg.tar.zst; do gpg --batch --yes -u "$FPR" --detach-sign --no-armor "$p"; done
  repo-add -q -s -k "$FPR" ghostcat.db.tar.gz ./*.pkg.tar.zst
else
  repo-add -q ghostcat.db.tar.gz ./*.pkg.tar.zst
fi
# GitHub Pages ne sert pas les liens symboliques : de vraies copies
for l in ghostcat.db ghostcat.files ghostcat.db.sig ghostcat.files.sig; do
  [[ -L $l ]] && cp --remove-destination "$(readlink -f "$l")" "$l"
done
echo "${FPR:-unsigned}" > "$OUT/signing"
ls -lh "$OUT"
rm -rf "$WORK" "$GNUPGHOME"
