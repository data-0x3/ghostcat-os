#!/usr/bin/env bash
# shellcheck disable=SC2034
# GhostCat OS — surcharges appliquées par-dessus le profiledef.sh de releng
# developed by 0x3 — https://t.me/data0x3
#
# Les composants GhostCat (Hub, Setup, installeur, thème…) sont des paquets du
# dépôt [ghostcat] : leurs droits viennent des paquets. Seuls les fichiers
# propres au live sont listés ici.

iso_name="ghostcat${EDITION:+-$EDITION}"
iso_label="GHOSTCAT_$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y%m)"
iso_publisher="GhostCat OS <https://data-0x3.github.io/ghostcat-os/>"
iso_application="GhostCat OS — Cybersecurity Edition"
iso_version="$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y.%m.%d)"
install_dir="ghostcat"
pacman_conf="pacman.conf"

file_permissions+=(
  ["/usr/lib/ghostcat/live-setup"]="0:0:755"
  ["/var/lib/AccountsService/users"]="0:0:700"
  ["/var/lib/AccountsService/users/ghost"]="0:0:600"
  ["/etc/sudoers.d/10-ghostcat-live"]="0:0:440"
  ["/home/ghost"]="1000:1000:750"
)

# image du système en zstd : plus rapide à construire, à démarrer et à copier par l'installeur
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '15' '-b' '1M')
