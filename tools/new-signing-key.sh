#!/usr/bin/env bash
# GhostCat OS — crée la clé qui signe les paquets du dépôt [ghostcat].
# À lancer UNE fois, sur ta machine (GhostCat, Arch ou n'importe quel Linux avec gpg).
# developed by 0x3 · https://t.me/data0x3
#
# Affiche la clé privée : copie TOUT le bloc (de -----BEGIN à -----END) dans
# GitHub > ghostcat-os > Settings > Secrets and variables > Actions >
# New repository secret, nom : GHOSTCAT_SIGNING_KEY.
# Garde aussi une copie du fichier ghostcat-signing-key.asc dans un endroit sûr.
set -euo pipefail
export GNUPGHOME="$(mktemp -d)"
trap 'rm -rf "$GNUPGHOME"' EXIT
gpg --batch --quiet --passphrase '' --quick-gen-key "GhostCat OS Build Key <build@ghostcat-os.invalid>" ed25519 sign never
FPR="$(gpg --batch --with-colons --list-secret-keys | awk -F: '/^fpr/{print $10; exit}')"
gpg --batch --armor --export-secret-keys "$FPR" > ghostcat-signing-key.asc
chmod 600 ghostcat-signing-key.asc
echo
echo "Empreinte : $FPR"
echo "Clé enregistrée dans : $PWD/ghostcat-signing-key.asc"
echo "À coller dans le secret GHOSTCAT_SIGNING_KEY :"
echo
cat ghostcat-signing-key.asc
