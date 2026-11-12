#!/usr/bin/env bash
# GhostCat OS — script de build — developed by 0x3 · https://t.me/data0x3
#
# Assemble le profil final : base officielle "releng" d'archiso
# + surcouche GhostCat (paquets, branding, live user, installeur),
# puis lance mkarchiso.
#
# Usage :  sudo ./build.sh            -> ISO dans ./out/
set -euo pipefail
export LC_ALL=C

HERE="$(cd "$(dirname "$0")" && pwd)"
RELENG="/usr/share/archiso/configs/releng"
PROFILE="$HERE/.profile-build"
WORK="${WORK:-/tmp/ghostcat-work}"
OUT="${OUT:-$HERE/out}"
export EDITION="${EDITION:-full}"         # full = tout dans l'ISO ; lite = ISO allégée (< 2 Go)

say() { printf '\e[1;37m[ghostcat]\e[0m %s\n' "$*"; }
die() { printf '\e[1;31m[ghostcat] %s\e[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "lance-moi avec sudo"
[[ -d $RELENG ]]  || die "archiso absent : sudo pacman -S archiso"
pacman-key --list-keys 2>/dev/null | grep -qi blackarch \
  || die "clé BlackArch absente : installe-la avec strap.sh (voir README)"

say "édition : $EDITION"
say "1/5  copie de la base releng"
rm -rf "$PROFILE"
cp -a "$RELENG" "$PROFILE"

say "2/5  surcouche GhostCat (airootfs, pacman.conf)"
cp -a "$HERE/airootfs/." "$PROFILE/airootfs/"
cp "$HERE/pacman.conf" "$PROFILE/pacman.conf"
# le live doit aussi connaître BlackArch (utilisé par ghostcat-install)
cp "$HERE/pacman.conf" "$PROFILE/airootfs/etc/pacman.conf"
# la liste des paquets est embarquée pour l'installeur
mkdir -p "$PROFILE/airootfs/usr/share/ghostcat"
grep -vE '^\s*(#|$)' "$HERE/packages.x86_64" | sort -u \
  > "$PROFILE/airootfs/usr/share/ghostcat/packages.txt"   # filtré à l'étape 3

say "3/5  fusion + vérification des paquets"
cat "$RELENG/packages.x86_64" "$HERE/packages.x86_64" \
  | grep -vE '^\s*(#|$)' | sort -u > "$PROFILE/packages.wanted"
# base de données temporaire : on vérifie chaque nom sans toucher au système
DB="$(mktemp -d)"; mkdir -p "$DB/local"
pacman --config "$HERE/pacman.conf" --dbpath "$DB" -Sy >/dev/null
{ pacman --config "$HERE/pacman.conf" --dbpath "$DB" -Slq
  pacman --config "$HERE/pacman.conf" --dbpath "$DB" -Sgq | sort -u
  pacman --config "$HERE/pacman.conf" --dbpath "$DB" -Sg | awk '{print $1}'
} | sort -u > "$DB/available"
comm -23 "$PROFILE/packages.wanted" "$DB/available" > "$HERE/packages.missing" || true
comm -12 "$PROFILE/packages.wanted" "$DB/available" > "$PROFILE/packages.x86_64"
if [[ $EDITION == lite ]]; then
  grep -vE '^\s*(#|$)' "$HERE/packages.heavy" | sort -u > "$DB/heavy"
  comm -23 "$PROFILE/packages.x86_64" "$DB/heavy" > "$PROFILE/packages.lite"
  mv "$PROFILE/packages.lite" "$PROFILE/packages.x86_64"
  say "     édition lite : $(grep -cvE '^\s*(#|$)' "$HERE/packages.heavy") paquets lourds installés seulement sur le disque"
fi
rm -rf "$DB" "$PROFILE/packages.wanted"
grep -vxF -f "$HERE/packages.missing" "$PROFILE/airootfs/usr/share/ghostcat/packages.txt" \
  > "$PROFILE/airootfs/usr/share/ghostcat/packages.tmp" || true
mv "$PROFILE/airootfs/usr/share/ghostcat/packages.tmp" "$PROFILE/airootfs/usr/share/ghostcat/packages.txt"
if [[ -s $HERE/packages.missing ]]; then
  say "     ⚠ introuvables, retirés (installables plus tard depuis le Hub) :"
  sed 's/^/        - /' "$HERE/packages.missing"
fi

say "4/5  profiledef + noyau 'quiet splash' + utilisateur live"
cat "$HERE/ghostcat.profiledef.sh" >> "$PROFILE/profiledef.sh"
# splash Plymouth au boot du live (GRUB, systemd-boot, syslinux)
find "$PROFILE/grub" "$PROFILE/efiboot" "$PROFILE/syslinux" -type f \
  \( -name '*.cfg' -o -name '*.conf' \) -print0 2>/dev/null \
  | xargs -0 -r sed -i -E \
      -e '/archisobasedir=/ { /splash/! s/$/ quiet splash/ }' \
      -e 's/Arch Linux install medium/GhostCat OS live/g'
# Plymouth dans l'initramfs du live (juste après udev)
sed -i -E '/^HOOKS=/ { /plymouth/! s/\budev\b/udev plymouth/ }' \
  "$PROFILE/airootfs/etc/mkinitcpio.conf.d/archiso.conf"
# utilisateur live "ghost" (sans mot de passe, sudo, autologin GDM)
A="$PROFILE/airootfs/etc"
grep -q '^ghost:' "$A/passwd" || {
  echo 'ghost:x:1000:1000:GhostCat Live:/home/ghost:/usr/bin/bash' >> "$A/passwd"
  echo 'ghost::14871::::::'                                     >> "$A/shadow"
  echo 'ghost:x:1000:'                                          >> "$A/group"
  echo 'ghost:!*::'                                             >> "$A/gshadow"
}
# services de la base releng inutiles ou bloquants pour un live graphique privé
for unit in sshd.service systemd-time-wait-sync.service choose-mirror.service; do
  find "$PROFILE/airootfs/etc/systemd/system" -name "$unit" -path '*.wants/*' -delete 2>/dev/null || true
done
# DNS : systemd-resolved (DNS chiffré, voir resolved.conf.d)
mkdir -p "$PROFILE/airootfs/etc/systemd/system/multi-user.target.wants"
ln -sf /usr/lib/systemd/system/systemd-resolved.service \
  "$PROFILE/airootfs/etc/systemd/system/multi-user.target.wants/systemd-resolved.service"
ln -sf /run/systemd/resolve/stub-resolv.conf "$PROFILE/airootfs/etc/resolv.conf"
mkdir -p "$PROFILE/airootfs/home/ghost"
cp -a "$HERE/airootfs/etc/skel/." "$PROFILE/airootfs/home/ghost/"

say "4b/5 extensions GNOME (effet verre + dock)"
GS_VER="$(pacman -Si gnome-shell 2>/dev/null | awk -F': ' '/^Version/{print $2}' | sed -E 's/^[0-9]+://; s/\..*//')"
[[ -n $GS_VER ]] || GS_VER=49
EXT_DIR="$PROFILE/airootfs/usr/share/gnome-shell/extensions"
mkdir -p "$EXT_DIR"
for uuid in blur-my-shell@aunetx dash-to-dock@micxgx.gmail.com burn-my-windows@schneegans.github.com; do
  tmp="$(mktemp --suffix=.zip)"
  if curl -fsSL -o "$tmp" \
      "https://extensions.gnome.org/download-extension/${uuid}.shell-extension.zip?shell_version=${GS_VER}"; then
    mkdir -p "$EXT_DIR/$uuid" && bsdtar -xf "$tmp" -C "$EXT_DIR/$uuid"
    [[ -d $EXT_DIR/$uuid/schemas ]] && glib-compile-schemas "$EXT_DIR/$uuid/schemas"
    chmod -R a+rX "$EXT_DIR/$uuid"
    say "     ✓ $uuid (GNOME $GS_VER)"
  else
    say "     ✗ $uuid introuvable pour GNOME $GS_VER — le bureau marchera, sans cet effet"
  fi
  rm -f "$tmp"
done

say "4c/5 thème GNOME Shell GhostCat"
# le thème importe le thème sombre officiel : on vérifie son nom exact pour cette version de GNOME
BASE_CSS=gnome-shell-dark.css
GS_RES=/usr/share/gnome-shell/gnome-shell-theme.gresource
if [[ -f $GS_RES ]] && command -v gresource >/dev/null; then
  RES_LIST="$(gresource list "$GS_RES")"
  if grep -q '/gnome-shell-dark\.css$' <<<"$RES_LIST"; then BASE_CSS=gnome-shell-dark.css
  elif grep -q '/gnome-shell\.css$' <<<"$RES_LIST"; then BASE_CSS=gnome-shell.css
  fi
  say "     base : $BASE_CSS (détectée)"
else
  say "     base : $BASE_CSS (par défaut, gnome-shell absent de la machine de build)"
fi
sed -i "s/__GHOSTCAT_BASE_CSS__/$BASE_CSS/" \
  "$PROFILE/airootfs/usr/share/themes/GhostCat/gnome-shell/gnome-shell.css"

say "5/5  mkarchiso (ça prend un moment ☕)"
rm -rf "$WORK"
mkarchiso -v -w "$WORK" -o "$OUT" "$PROFILE"
say "terminé → $(ls -1 "$OUT"/ghostcat-*.iso 2>/dev/null | tail -1)"
