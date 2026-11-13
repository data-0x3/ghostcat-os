#!/usr/bin/env bash
# shellcheck disable=SC2034
# GhostCat OS — surcharges appliquées par-dessus le profiledef.sh de releng
# developed by 0x3 — https://t.me/data0x3

iso_name="ghostcat${EDITION:+-$EDITION}"
iso_label="GHOSTCAT_$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y%m)"
iso_publisher="0x3 <https://t.me/data0x3>"
iso_application="GhostCat OS — Cybersecurity Edition"
iso_version="$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y.%m.%d)"
pacman_conf="pacman.conf"

file_permissions+=(
  ["/usr/local/bin/ghostcat-install"]="0:0:755"
  ["/usr/local/bin/ghostcat-live-setup"]="0:0:755"
  ["/usr/local/bin/ghostcat-hub"]="0:0:755"
  ["/opt/ghostcat-hub/ghostcat_hub.py"]="0:0:755"
  ["/usr/local/bin/ghostcat-setup"]="0:0:755"
  ["/usr/local/bin/ghostcat-session-start"]="0:0:755"
  ["/usr/local/bin/ghostcat-firstboot"]="0:0:755"
  ["/var/lib/AccountsService/users"]="0:0:700"
  ["/var/lib/AccountsService/users/ghost"]="0:0:600"
  ["/usr/local/lib/ghostcat/setup-apply"]="0:0:755"
  ["/opt/ghostcat-setup/ghostcat_setup.py"]="0:0:755"
  ["/etc/sudoers.d/10-ghostcat-live"]="0:0:440"
  ["/home/ghost"]="1000:1000:750"
)
