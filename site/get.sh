#!/usr/bin/env bash
# GhostCat OS — téléchargeur Linux / macOS — developed by 0x3 · https://t.me/data0x3
# Usage :  curl -fsSL https://data-0x3.github.io/ghostcat-os/get.sh | bash
# Télécharge la dernière ISO, recolle les morceaux et vérifie l'empreinte SHA256.
set -euo pipefail

API=https://api.github.com/repos/data-0x3/ghostcat-os/releases/latest
W=$'\e[1;37m'; G=$'\e[1;32m'; R=$'\e[1;31m'; D=$'\e[90m'; N=$'\e[0m'
say() { printf '  %s\n' "$*"; }

printf '\n%s      /\\_/\\     GHOSTCAT OS%s\n%s     ( o.o )    the true privacy\n      \\~~~/     developed by 0x3%s\n\n' "$W" "$N" "$D" "$N"

command -v curl >/dev/null || { say "${R}curl est requis${N}"; exit 1; }
JSON="$(curl -fsSL -H 'User-Agent: ghostcat-get' "$API")"

# extraction sans jq : noms + URLs des assets
mapfile -t URLS < <(printf '%s' "$JSON" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/')
NAME="$(printf '%s' "$JSON" | grep -o '"name": *"GhostCat[^"]*"' | head -1 | sed 's/.*: *"\(.*\)"/\1/')"
PARTS=(); SHA=""
for u in "${URLS[@]}"; do
  case "$u" in
    *.iso.part[0-9]*) PARTS+=("$u") ;;
    *.iso.sha256)     SHA="$u" ;;
  esac
done
if [[ ${#PARTS[@]} -eq 0 ]]; then
  for u in "${URLS[@]}"; do [[ $u == *.iso ]] && PARTS+=("$u"); done
fi
[[ ${#PARTS[@]} -gt 0 && -n $SHA ]] || { say "${R}aucune ISO trouvée dans la dernière version${N}"; exit 1; }
IFS=$'\n' PARTS=($(sort <<<"${PARTS[*]}")); unset IFS
ISO="$(basename "${PARTS[0]}")"; ISO="${ISO%.part*}"

DIR="${XDG_DOWNLOAD_DIR:-$HOME/Downloads}"; [[ -d $DIR ]] || DIR="$HOME/Téléchargements"; [[ -d $DIR ]] || DIR="$PWD"
cd "$DIR"
say "Version : ${W}${NAME}${N}"
say "Dossier : $DIR"

i=0
for u in "${PARTS[@]}"; do
  i=$((i+1)); f="$(basename "$u")"
  say "[$i/${#PARTS[@]}] $f"
  for try in $(seq 1 30); do
    curl -fL --retry 5 --retry-delay 3 -C - -o "$f" "$u" && break
    say "connexion coupée, reprise ($try/30)…"; sleep 3
  done
done

if [[ ${#PARTS[@]} -gt 1 ]]; then
  say "Recollage des morceaux…"
  cat $(for u in "${PARTS[@]}"; do basename "$u"; done) > "$ISO"
fi

say "Vérification de l'empreinte SHA256…"
EXPECTED="$(curl -fsSL "$SHA" | awk '{print $1}')"
if command -v sha256sum >/dev/null; then ACTUAL="$(sha256sum "$ISO" | awk '{print $1}')"
else ACTUAL="$(shasum -a 256 "$ISO" | awk '{print $1}')"; fi
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  say "${R}Empreinte différente : téléchargement abîmé.${N} Supprime les .part et relance la commande."
  rm -f "$ISO"; exit 1
fi
[[ ${#PARTS[@]} -gt 1 ]] && rm -f $(for u in "${PARTS[@]}"; do basename "$u"; done)

printf '\n'
say "${G}✓ GhostCat OS est prêt :${N} $DIR/$ISO"
say "${D}SHA256 $ACTUAL${N}"
say "Clé USB : sudo dd if=\"$DIR/$ISO\" of=/dev/sdX bs=4M status=progress oflag=sync"
say "(remplace sdX par ta clé — vérifie avec lsblk, elle sera effacée)"
say "Guide complet : https://data-0x3.github.io/ghostcat-os/#install"
printf '\n'
