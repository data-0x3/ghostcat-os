#!/usr/bin/env bash
# GhostCat OS — démarre une ISO dans QEMU, l'installe, redémarre dessus, et photographie tout.
# developed by 0x3 · https://t.me/data0x3
#
# Usage : tools/vm-test.sh <iso> <dossier-captures>
#
#   1. live (UEFI) : menu de démarrage, écran de chargement, GhostCat Setup en mode démo,
#      bureau, puis l'installeur se lance tout seul (ghostcat.autoinstall=1) et installe
#      sur le disque virtuel, avant d'éteindre la machine ;
#   2. disque installé : menu GRUB GhostCat, démarrage, écran de connexion, connexion,
#      apparition du bureau et GhostCat Hub.
set -euo pipefail
ISO="$1"; SHOTS="$2"
mkdir -p "$SHOTS"
RUN="$(mktemp -d)"
first() { for f in "$@"; do [[ -e $f ]] && { echo "$f"; return; }; done; }
OVMF_CODE="$(first /usr/share/OVMF/OVMF_CODE_4M.fd /usr/share/OVMF/OVMF_CODE.fd)"
OVMF_VARS_SRC="$(first /usr/share/OVMF/OVMF_VARS_4M.fd /usr/share/OVMF/OVMF_VARS.fd)"
ACCEL=(-accel tcg)
[[ -w /dev/kvm ]] && ACCEL=(-enable-kvm -cpu host)
PID=""

mon() { printf '%s\n' "$*" | socat - "UNIX-CONNECT:$RUN/mon" >/dev/null 2>&1 || true; }
shot() {
  mon "screendump $RUN/s.ppm"; sleep 1
  if [[ -s $RUN/s.ppm ]]; then convert "$RUN/s.ppm" "$SHOTS/$1.png" && rm -f "$RUN/s.ppm" && echo "  capture : $1"; fi
  return 0
}
key() { mon "sendkey $1"; sleep "${2:-0.3}"; }
type_text() {
  local c i
  for ((i = 0; i < ${#1}; i++)); do
    c="${1:i:1}"
    case $c in
      [A-Z]) c="shift-${c,,}" ;;
      " ") c=spc ;; "=") c=equal ;; ".") c=dot ;; "-") c=minus ;; "_") c=shift-minus ;; ",") c=comma ;;
    esac
    key "$c" 0.12
  done
}
alive() { [[ -n $PID ]] && kill -0 "$PID" 2>/dev/null; }
stop() { mon quit; sleep 2; if alive; then kill "$PID" 2>/dev/null || true; fi; PID=""; }

qemu_args() {  # qemu_args <nom-du-journal>
  args=("${ACCEL[@]}" -m 6144 -smp 2 -vga none -device virtio-vga,xres=1600,yres=900
    -device qemu-xhci -device usb-tablet -device usb-kbd
    -netdev user,id=n0 -device virtio-net-pci,netdev=n0
    -drive "if=pflash,format=raw,readonly=on,file=$OVMF_CODE"
    -drive "if=pflash,format=raw,file=$RUN/vars.fd"
    -drive "file=$RUN/disk.qcow2,if=virtio,format=qcow2"
    -monitor "unix:$RUN/mon,server,nowait" -display none -no-reboot
    -serial "file:$SHOTS/serial-$1.log")
}

qemu-img create -f qcow2 "$RUN/disk.qcow2" 60G >/dev/null
cp "$OVMF_VARS_SRC" "$RUN/vars.fd"

# ---------- 1. live : démo de Setup puis installation automatique ----------
# On édite l'entrée du menu de démarrage (touche e) pour ajouter les options de test.
qemu_args live
qemu-system-x86_64 "${args[@]}" -cdrom "$ISO" -boot d &
PID=$!
sleep 6; shot 01-menu
key e 1; key end; type_text " ghostcat.demo=1 ghostcat.autoinstall=1 console=tty1 console=ttyS0 systemd.journald.forward_to_console=1 systemd.journald.max_level_console=info"; key ret
t=0
for at in 10 20 35 50 65 80 95 110 125 140 160 180 200 225 250 280 310; do
  sleep $((at - t)); t=$at; alive || break; shot "02-live-$(printf %03d "$at")s"
done
# l'installation tourne : une capture par minute jusqu'à l'extinction (40 min au plus)
for m in $(seq 1 40); do
  alive || break
  sleep 60; alive || break; shot "03-install-$(printf %02d "$m")min"
done
if alive; then echo "l'installation ne s'est pas terminée à temps"; stop; fi
PID=""

# ---------- 2. disque installé ----------
qemu_args disk
qemu-system-x86_64 "${args[@]}" &
PID=$!
sleep 3; shot 04-grub
# disque chiffré : la phrase est demandée par l'écran de démarrage GhostCat
sleep 15; shot 05-passphrase
type_text "deluge"; sleep 1; shot 05-passphrase-typing
type_text " orbite glyphe"; key ret
t=0
for at in 5 12 20 30 45; do sleep $((at - t)); t=$at; alive || break; shot "05-boot-$(printf %03d "$at")s"; done
# connexion : on choisit le premier compte puis on tape le mot de passe de test
# (le système installé est en AZERTY, réglé par Setup : la touche Q du QWERTY donne « a »)
key ret 6; type_text ghostcqt; key ret
t=0
for at in 3 6 10 15 25 40 60 90; do sleep $((at - t)); t=$at; alive || break; shot "06-desktop-$(printf %03d "$at")s"; done
key meta_l 3; shot 07-overview
key meta_l 2
stop
rm -rf "$RUN"
ls -1 "$SHOTS"
