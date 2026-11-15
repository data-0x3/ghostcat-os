#!/usr/bin/env bash
# GhostCat OS — script de build — developed by 0x3 · https://t.me/data0x3
#
# 1. construit les paquets GhostCat et le dépôt [ghostcat] (tools/build-packages.sh) ;
# 2. assemble le profil : base officielle "releng" d'archiso + fichiers propres au live ;
# 3. lance mkarchiso.
#
# Usage :  sudo VERSION=2026.11.15.1 ./build.sh     -> ISO dans ./out/, dépôt dans ./repo-out/
#          REPO_DIR=… pour réutiliser un dépôt déjà construit
set -euo pipefail
export LC_ALL=C

HERE="$(cd "$(dirname "$0")" && pwd)"
RELENG="/usr/share/archiso/configs/releng"
PROFILE="$HERE/.profile-build"
WORK="${WORK:-/tmp/ghostcat-work}"
OUT="${OUT:-$HERE/out}"
export EDITION="${EDITION:-full}"         # full = tout dans l'ISO ; lite = ISO allégée (< 2 Go)
export VERSION="${VERSION:-$(date -u +%Y.%m.%d).0}"
REPO_DIR="${REPO_DIR:-$HERE/repo-out}"

say() { printf '\e[1;37m[ghostcat]\e[0m %s\n' "$*"; }
die() { printf '\e[1;31m[ghostcat] %s\e[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "lance-moi avec sudo"
[[ -d $RELENG ]]  || die "archiso absent : sudo pacman -S archiso"
pacman-key --list-keys 2>/dev/null | grep -qi blackarch \
  || die "clé BlackArch absente : installe-la avec strap.sh (voir README)"

say "édition : $EDITION, version $VERSION"
if [[ ! -f $REPO_DIR/ghostcat.db ]]; then
  say "0/5  paquets GhostCat et dépôt [ghostcat]"
  "$HERE/tools/build-packages.sh" "$REPO_DIR"
fi
SIGNED=no
[[ -f $REPO_DIR/signing && $(cat "$REPO_DIR/signing") != unsigned ]] && SIGNED=yes
say "     dépôt : $REPO_DIR (signé : $SIGNED)"

say "1/5  copie de la base releng"
rm -rf "$PROFILE"
cp -a "$RELENG" "$PROFILE"

say "2/5  surcouche GhostCat (airootfs, pacman.conf)"
cp -a "$HERE/airootfs/." "$PROFILE/airootfs/"
# pacman.conf du système (live et installé) : [ghostcat] vérifié par signature si le dépôt est signé
cp "$HERE/pacman.conf" "$PROFILE/airootfs/etc/pacman.conf"
if [[ $SIGNED == no ]]; then
  sed -i '/^\[ghostcat\]/,/^\[/ s/^SigLevel.*/SigLevel = Optional TrustAll/' "$PROFILE/airootfs/etc/pacman.conf"
fi
# pacman.conf du build : le dépôt [ghostcat] est lu directement sur le disque
sed -e '/^\[ghostcat\]/,/^\[/ { s#^Include.*#Server = file://'"$REPO_DIR"'#; s/^SigLevel.*/SigLevel = Optional TrustAll/ }' \
  "$HERE/pacman.conf" > "$PROFILE/pacman.conf"
# la liste des paquets est embarquée pour l'installeur
mkdir -p "$PROFILE/airootfs/usr/share/ghostcat"
echo "$EDITION" > "$PROFILE/airootfs/usr/share/ghostcat/edition"
grep -vE '^\s*(#|$)' "$HERE/packages.heavy" > "$PROFILE/airootfs/usr/share/ghostcat/packages.heavy"
grep -vE '^\s*(#|$)' "$HERE/packages.x86_64" | sort -u \
  > "$PROFILE/airootfs/usr/share/ghostcat/packages.txt"   # filtré à l'étape 3

say "3/5  fusion + vérification des paquets"
cat "$RELENG/packages.x86_64" "$HERE/packages.x86_64" \
  | grep -vE '^\s*(#|$)' | sort -u > "$PROFILE/packages.wanted"
# base de données temporaire : on vérifie chaque nom sans toucher au système
DB="$(mktemp -d)"; mkdir -p "$DB/local"
pacman --config "$PROFILE/pacman.conf" --dbpath "$DB" -Sy >/dev/null
{ pacman --config "$PROFILE/pacman.conf" --dbpath "$DB" -Slq
  pacman --config "$PROFILE/pacman.conf" --dbpath "$DB" -Sgq | sort -u
  pacman --config "$PROFILE/pacman.conf" --dbpath "$DB" -Sg | awk '{print $1}'
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
      -e 's/Arch Linux install medium/GhostCat OS live/g' \
      -e 's/Arch Linux/GhostCat OS/g'
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
for unit in sshd.service systemd-time-wait-sync.service choose-mirror.service iwd.service \
            systemd-networkd.service systemd-networkd.socket systemd-networkd-wait-online.service reflector.service; do
  find "$PROFILE/airootfs/etc/systemd/system" -name "$unit" -path '*.wants/*' -delete 2>/dev/null || true
done
# DNS : systemd-resolved (DNS chiffré, voir resolved.conf.d)
mkdir -p "$PROFILE/airootfs/etc/systemd/system/multi-user.target.wants"
ln -sf /usr/lib/systemd/system/systemd-resolved.service \
  "$PROFILE/airootfs/etc/systemd/system/multi-user.target.wants/systemd-resolved.service"
ln -sf /run/systemd/resolve/stub-resolv.conf "$PROFILE/airootfs/etc/resolv.conf"
mkdir -p "$PROFILE/airootfs/home/ghost"
cp -a "$HERE/airootfs/etc/skel/." "$PROFILE/airootfs/home/ghost/"

say "5/5  mkarchiso (ça prend un moment ☕)"
rm -rf "$WORK"
mkarchiso -v -w "$WORK" -o "$OUT" "$PROFILE"
say "terminé → $(ls -1 "$OUT"/ghostcat-*.iso 2>/dev/null | tail -1)"
