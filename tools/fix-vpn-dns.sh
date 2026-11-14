#!/usr/bin/env bash
# GhostCat OS — correctif DNS chiffré + VPN (Mullvad, WireGuard, OpenVPN…)
# developed by 0x3 · https://t.me/data0x3
#
# Pour un GhostCat déjà installé :
#   curl -fsSL https://raw.githubusercontent.com/data-0x3/ghostcat-os/main/tools/fix-vpn-dns.sh | sudo bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "lance-moi avec sudo"; exit 1; }
RAW=https://raw.githubusercontent.com/data-0x3/ghostcat-os/main/airootfs
mkdir -p /usr/local/lib/ghostcat /etc/udev/rules.d /etc/systemd/resolved.conf.d
curl -fsSL "$RAW/usr/local/lib/ghostcat/vpn-dns" -o /usr/local/lib/ghostcat/vpn-dns
curl -fsSL "$RAW/etc/udev/rules.d/90-ghostcat-vpn-dns.rules" -o /etc/udev/rules.d/90-ghostcat-vpn-dns.rules
chmod 755 /usr/local/lib/ghostcat/vpn-dns
# remet le DNS chiffré GhostCat s'il avait été supprimé à la main
if [[ ! -f /etc/systemd/resolved.conf.d/90-ghostcat-dns.conf ]]; then
  curl -fsSL "$RAW/etc/systemd/resolved.conf.d/90-ghostcat-dns.conf" -o /etc/systemd/resolved.conf.d/90-ghostcat-dns.conf
fi
udevadm control --reload
# un VPN est peut-être déjà connecté
VPN=$(ls /sys/class/net | grep -E '^(wg|tun|tap|mullvad|proton|nordlynx|tailscale|ppp)' | head -1 || true)
if [[ -n $VPN ]]; then /usr/local/lib/ghostcat/vpn-dns up "$VPN"; else systemctl reload systemd-resolved || true; fi
echo "✓ GhostCat : le DNS chiffré se met en pause tout seul quand un VPN est connecté."
