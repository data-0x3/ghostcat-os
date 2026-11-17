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
#      apparition du bureau et GhostCat Hub ;
#   3. mise à jour : par la console série (ouverte par un identifiant systemd passé à la VM,
#      sans toucher au disque), ghostcat-update tire les paquets publiés sur le dépôt,
#      puis le Hub est relancé, défilé à la molette et photographié page par page.
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
# QMP : pointeur absolu (0..32767) et molette, ce que le moniteur texte ne sait pas faire
qmp() { printf '{"execute":"qmp_capabilities"}\n%s\n' "$1" | socat -t1 - "UNIX-CONNECT:$RUN/qmp" >/dev/null 2>&1 || true; sleep 0.2; }
point() {  # point <x> <y> en pixels d'un écran 1600x900
  qmp "{\"execute\":\"input-send-event\",\"arguments\":{\"events\":[{\"type\":\"abs\",\"data\":{\"axis\":\"x\",\"value\":$(( $1 * 32767 / 1600 ))}},{\"type\":\"abs\",\"data\":{\"axis\":\"y\",\"value\":$(( $2 * 32767 / 900 ))}}]}}"
}
button() {  # button <left|wheel-down|wheel-up>
  qmp "{\"execute\":\"input-send-event\",\"arguments\":{\"events\":[{\"type\":\"btn\",\"data\":{\"down\":true,\"button\":\"$1\"}}]}}"
  qmp "{\"execute\":\"input-send-event\",\"arguments\":{\"events\":[{\"type\":\"btn\",\"data\":{\"down\":false,\"button\":\"$1\"}}]}}"
}
# fenêtre lancée depuis la console : clic sur sa barre de titre pour la prendre, puis Super+Haut
focus_max() { key esc 1; point 800 74; button left; sleep 1; key meta_l-up 3; }
wheel() { local i; for ((i = 0; i < $2; i++)); do button "wheel-$1"; sleep 0.15; done; sleep 1; }
# console série : on écrit dans la prise, on lit le journal
ser() { printf '%s\r' "$1" | socat -t1 - "UNIX-CONNECT:$RUN/ser" >/dev/null 2>&1 || true; sleep 0.5; }
serwait() {  # serwait <motif-étendu> <secondes>
  local t=0
  until grep -Eqa -- "$1" "$SHOTS/serial-disk.log" 2>/dev/null; do
    sleep 2; t=$((t + 2)); ((t < $2)) || { echo "  série : « $1 » pas vu en $2 s"; return 1; }
  done
}
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
    -monitor "unix:$RUN/mon,server,nowait" -qmp "unix:$RUN/qmp,server,nowait" -display none -no-reboot
    -chardev "socket,id=ser0,path=$RUN/ser,server=on,wait=off,logfile=$SHOTS/serial-$1.log"
    -serial chardev:ser0
    # identifiant systemd : une invite de connexion sur le port série (getty-generator)
    -smbios "type=11,value=io.systemd.credential:getty.ttys.serial=ttyS0")
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

# ---------- 3. mise à jour par ghostcat-update, puis le Hub ----------
U=ghost0; P=ghostcat
relogin() {  # la session graphique est tombée : on se reconnecte comme l'utilisateur
  key ret 6; type_text ghostcqt; key ret; sleep 25; key esc 2
  ser "P0=\$(pgrep -u $U -x gnome-shell | head -1)"
}
# étape <n> <commande> : lance une partie de la mise à jour et vérifie que gnome-shell a tenu
etape() {
  local n=$1; shift
  ser "$*; sleep 25; p=\$(pgrep -u $U -x gnome-shell | head -1); if [ \"\$p\" = \"\$P0\" ]; then echo ETAPE-$n-''TENU; else echo ETAPE-$n-''TOMBE; fi"
  serwait "ETAPE-$n-(TENU|TOMBE)" 900 || true
  if grep -aq "ETAPE-$n-TOMBE" "$SHOTS/serial-disk.log"; then
    echo "  étape $n ($*) : gnome-shell est tombé"; shot "08-tombe-etape-$n"; relogin
  else
    echo "  étape $n ($*) : gnome-shell a tenu"
  fi
}
ser ""; sleep 2; ser ""
if serwait "login:" 60; then
  ser "$U"; serwait "assword|ot de passe" 20 && ser "$P"; sleep 5
  ser "export PS1='GC\\$ ' TERM=dumb; stty cols 200"
  ser "export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/\$(id -u)/bus"
  # pas de verrouillage d'écran pendant la mise à jour
  ser "gsettings set org.gnome.desktop.session idle-delay 0; gsettings set org.gnome.desktop.screensaver lock-enabled false"
  ser "echo AVANT; pacman -Q ghostcat-hub"
  ser "sudo -v"; serwait "sudo\\] " 20 && ser "$P"; sleep 3
  # machine de test : sudo sans mot de passe, pour que les étapes ne restent pas bloquées
  ser "echo '$U ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/99-vm-test >/dev/null"
  ser "P0=\$(pgrep -u $U -x gnome-shell | head -1); echo SHELL-\$P0"
  # la mise à jour telle que l'utilisateur la lance (pacman est en français : « O » pour oui)
  etape 01 "yes o | ghostcat-update 2>&1 | tail -n 40"
  if grep -aq "ETAPE-01-TOMBE" "$SHOTS/serial-disk.log"; then
    ser "sudo journalctl -b --no-pager -o short-precise --since '-6 min' _COMM=gnome-shell | grep -v MESA | tail -n 80; echo JSHELL-''OK"
    serwait "JSHELL-OK" 60 || true
    ser "sudo pacman -S --noconfirm --needed gdb >/dev/null 2>&1; sudo DEBUGINFOD_URLS=https://debuginfod.archlinux.org coredumpctl debug --no-pager --debugger-arguments='-batch -iex \"set debuginfod enabled on\" -ex bt' /usr/bin/gnome-shell 2>&1 | grep -a '^#' | head -n 60; echo GDB-''OK"
    serwait "GDB-OK" 900 || true
  fi
  ser "echo APRES; pacman -Q ghostcat-hub; ls -la /usr/lib/ghostcat/hub/dev; echo LISTE-''OK"
  serwait "LISTE-OK" 30 || true

  # le nouveau Hub (l'ancien, s'il tourne encore, est fermé : une seule instance)
  hub() {  # hub <unité> [--view=…]
    ser "pkill -f ghostcat_hub.py; sleep 2; systemd-run --user --unit=$1 /usr/bin/ghostcat-hub ${2:-}; echo HUB-''LANCE-$1"
    serwait "HUB-LANCE-$1" 30 || true; sleep 12; focus_max
  }
  hub hub1;          shot 09-hub-accueil;      point 1000 600; wheel down 8;  shot 10-hub-molette-bas; wheel up 8; shot 11-hub-molette-haut
  hub hub2 --view=red; point 1000 600;         shot 12-red; wheel down 10; shot 13-red-molette
  hub hub3 --view=dev; shot 14-developpeur;    point 1000 600; wheel down 6;  shot 15-developpeur-bas
  # bouton « Copier » du pseudo Discord, puis lecture du presse-papiers depuis la session
  ser "journalctl --user -u hub1 -u hub2 -u hub3 --no-pager | grep -v MESA | tail -n 30; echo JOURNAL-''OK"
  serwait "JOURNAL-OK" 30 || true
else
  echo "pas de console série : passe de mise à jour sautée"
fi
stop
rm -rf "$RUN"
ls -1 "$SHOTS"
