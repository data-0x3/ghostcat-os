#!/usr/bin/env bash
# GhostCat OS — passe une installation existante au dépôt [ghostcat].
# Pour les GhostCat installés avant novembre 2026 (archinstall + ghostcat-install).
#   curl -fsSL https://data-0x3.github.io/ghostcat-os/upgrade.sh | sudo bash
# developed by 0x3 · https://t.me/data0x3
set -euo pipefail
W='\e[1;37m'; OK='\e[32m'; N='\e[0m'
say() { printf "${W}[ghostcat]${N} %s\n" "$*"; }
[[ $EUID -eq 0 ]] || { echo "lance-moi avec sudo"; exit 1; }
REPO=https://data-0x3.github.io/ghostcat-os/repo/x86_64

say "1/4  dépôt [ghostcat]"
mkdir -p /etc/pacman.d
echo "Server = $REPO" > /etc/pacman.d/ghostcat-mirrorlist
SIG="Optional TrustAll"
if curl -fsS "$REPO/signing" 2>/dev/null | grep -qv unsigned; then
  curl -fsS "$REPO/ghostcat.asc" -o /tmp/ghostcat.asc
  FPR="$(curl -fsS "$REPO/signing")"
  pacman-key --add /tmp/ghostcat.asc >/dev/null && pacman-key --lsign-key "$FPR" >/dev/null
  SIG="Required DatabaseOptional"
fi
if ! grep -q '^\[ghostcat\]' /etc/pacman.conf; then
  # en premier : les paquets GhostCat passent avant ceux d'Arch
  sed -i "0,/^\[core\]/s//[ghostcat]\nSigLevel = $SIG\nInclude = \/etc\/pacman.d\/ghostcat-mirrorlist\n\n[core]/" /etc/pacman.conf
fi

say "2/4  retrait des anciens fichiers (remplacés par les paquets)"
rm -rf /opt/ghostcat-hub /opt/ghostcat-setup /usr/local/lib/ghostcat /usr/share/themes/GhostCat \
       /usr/local/share/applications /usr/share/wayland-sessions/ghostcat-setup.desktop
rm -f /usr/local/bin/ghostcat-{hub,setup,install,session-start,firstboot,live-setup} \
      /etc/udev/rules.d/90-ghostcat-vpn-dns.rules /etc/xdg/autostart/ghostcat-session-start.desktop \
      /usr/share/applications/ghostcat-*.desktop

say "3/4  installation de GhostCat OS depuis le dépôt"
pacman -Sy --noconfirm --needed --overwrite '/usr/share/icons/*' --overwrite '/usr/share/backgrounds/*' \
  --overwrite '/usr/share/plymouth/themes/ghostcat/*' --overwrite '/etc/dconf/*' --overwrite '/etc/skel/*' \
  --overwrite '/etc/NetworkManager/conf.d/*' --overwrite '/etc/systemd/resolved.conf.d/*' \
  --overwrite '/etc/firefox/*' --overwrite '/usr/share/ghostcat/*' --overwrite '/usr/share/pixmaps/ghostcat.png' \
  --overwrite '/usr/share/gnome-shell/extensions/*' --overwrite '/usr/share/gnome-background-properties/*' \
  ghostcat-desktop
mkdir -p /var/lib/ghostcat && touch /var/lib/ghostcat/setup-done
dconf update

say "4/4  vérification"
. /etc/os-release
printf "${OK}[  OK  ]${N} %s\n" "$PRETTY_NAME"
echo "Déconnecte-toi puis reconnecte-toi pour voir le nouveau bureau. Mises à jour : ghostcat-update"
