#!/usr/bin/env bash
# GhostCat OS — démarre une ISO dans QEMU et prend des captures d'écran.
# developed by 0x3 · https://t.me/data0x3
#
# Usage : tools/vm-test.sh <iso> <dossier-captures>
#
# Deux passages :
#   1. UEFI (OVMF) : menu de démarrage, puis démarrage normal jusqu'au premier écran.
#   2. Noyau direct avec « ghostcat.demo=1 » : les applis GhostCat déroulent
#      leurs écrans toutes seules, ce qui permet de tout photographier sans souris.
set -euo pipefail
set -x
ISO="$1"; SHOTS="$2"
mkdir -p "$SHOTS"
RUN="$(mktemp -d)"
first() { for f in "$@"; do [[ -e $f ]] && { echo "$f"; return; }; done; }
OVMF_CODE="$(first /usr/share/OVMF/OVMF_CODE_4M.fd /usr/share/OVMF/OVMF_CODE.fd)"
OVMF_VARS_SRC="$(first /usr/share/OVMF/OVMF_VARS_4M.fd /usr/share/OVMF/OVMF_VARS.fd)"
ACCEL=(-accel tcg)
[[ -w /dev/kvm ]] && ACCEL=(-enable-kvm -cpu host)

mon() { printf '%s\n' "$*" | socat - "UNIX-CONNECT:$RUN/mon" >/dev/null 2>&1 || true; }
shot() {  # shot <nom>
  mon "screendump $RUN/s.ppm"
  sleep 1
  [[ -s $RUN/s.ppm ]] && convert "$RUN/s.ppm" "$SHOTS/$1.png" && rm -f "$RUN/s.ppm" && echo "  capture : $1"
}
key() { mon "sendkey $1"; sleep "${2:-1}"; }
stop() { mon quit; sleep 2; pkill -f "qemu-system-x86_64.*$RUN" 2>/dev/null || true; }

common() {  # common <passage>
  args=(-m 6144 -smp 2 -vga none -device virtio-vga,xres=1600,yres=900
    -device qemu-xhci -device usb-tablet -device usb-kbd
    -netdev user,id=n0 -device virtio-net-pci,netdev=n0
    -drive "file=$RUN/disk.qcow2,if=virtio,format=qcow2"
    -monitor "unix:$RUN/mon,server,nowait" -display none
    -serial "file:$SHOTS/serial-$1.log")
}

qemu-img create -f qcow2 "$RUN/disk.qcow2" 40G >/dev/null

# ---------- passage 1 : UEFI ----------
cp "$OVMF_VARS_SRC" "$RUN/vars.fd"
common uefi
qemu-system-x86_64 "${ACCEL[@]}" "${args[@]}" \
  -drive "if=pflash,format=raw,readonly=on,file=$OVMF_CODE" \
  -drive "if=pflash,format=raw,file=$RUN/vars.fd" \
  -cdrom "$ISO" -boot d &
sleep 8;  shot 01-menu
for t in 20 35 50 70 100 140; do sleep $((t - ${prev:-8})); prev=$t; shot "02-boot-${t}s"; done
stop

# ---------- passage 2 : noyau direct + mode démo ----------
mkdir -p "$RUN/k"
bsdtar -xf "$ISO" -C "$RUN/k" arch/boot/x86_64/vmlinuz-linux arch/boot/x86_64/initramfs-linux.img
LABEL="$(isoinfo -d -i "$ISO" | awk -F': ' '/Volume id/{print $2}')"
common demo
qemu-system-x86_64 "${ACCEL[@]}" "${args[@]}" \
  -kernel "$RUN/k/arch/boot/x86_64/vmlinuz-linux" \
  -initrd "$RUN/k/arch/boot/x86_64/initramfs-linux.img" \
  -append "archisobasedir=arch archisolabel=$LABEL quiet splash ghostcat.demo=1 console=ttyS0" \
  -cdrom "$ISO" &
prev=0
for t in 15 30 45 60 75 90 105 120 135 150 165 180 200 220 240 260 280 300 330 360; do
  sleep $((t - prev)); prev=$t; shot "03-demo-$(printf %03d "$t")s"
done
stop
rm -rf "$RUN"
ls -1 "$SHOTS"
