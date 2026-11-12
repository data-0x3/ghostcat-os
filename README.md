# GhostCat OS 👻🐱

Distribution complète basée sur Arch Linux, orientée cybersécurité.
Bureau GNOME, thème noir & blanc, tout inclus.
**developed by 0x3** · https://t.me/data0x3

## ⬇ Télécharger

Va dans **[Releases](../../releases)** et prends le dernier `ghostcat-lite-….iso`
(+ le `.sha256`). Si l'ISO est en plusieurs `.part`, les notes de version expliquent comment les recoller.

Ensuite, comme n'importe quelle distro : **Rufus** (GPT, mode *Image DD*) → redémarrage sur la clé → `ghostcat-install`.

### Construire une nouvelle ISO (sans Linux)

L'ISO est construite automatiquement par GitHub Actions :
**Actions → Build GhostCat ISO → Run workflow** (≈ 40 min), ou pousse un tag `v…`.

- **lite** (par défaut) : ISO < 2 Go ; les outils lourds (Ghidra, Metasploit, Burp, LibreOffice…) sont installés sur le disque par `ghostcat-install`.
- **full** : tout dans l'ISO (peut dépasser 2 Go → publiée en morceaux).

## Ce que tu obtiens

- **GhostCat Hub** : l'app centrale en Liquid Glass. Red / Blue / Purple Team, recherche (Ctrl K), favoris, statut de chaque outil, installation et lancement en un clic. S'ouvre toute seule au premier login.
- **Bureau en verre** : panneau, vue d'ensemble et dock flous et translucides (Blur my Shell + Dash to Dock, récupérés au build)
- **Boot animé** : ton fantôme-chat qui flotte et glitche (120 images) pendant le démarrage
- **Live** : tu bootes la clé → splash fantôme-chat → GNOME direct (utilisateur `ghost`, connexion auto)
- **Installé** : `ghostcat-install` pose GhostCat sur le disque **avec** tous les outils et le look
- **Outils** : nmap, wireshark, metasploit, sqlmap, hashcat, hydra, aircrack-ng, bettercap, radare2… (+ dépôt BlackArch pour le reste)
- **Quotidien** : Firefox, VS Code, LibreOffice, VLC, GIMP, zsh, btop, Docker, Python, Go, Rust
- **Look** : Plymouth animé, fond d'écran, logo GDM, thème sombre, icônes Papirus, JetBrains Mono, fastfetch avec le fantôme

## Structure

| Élément | Rôle |
|---|---|
| `build.sh` | assemble releng (base officielle) + surcouche GhostCat, puis lance `mkarchiso` |
| `ghostcat.profiledef.sh` | nom, label, permissions de l'ISO |
| `packages.x86_64` | tous les paquets |
| `pacman.conf` | dépôts officiels + BlackArch |
| `airootfs/usr/share/plymouth/themes/ghostcat/` | écran de boot (logo qui « respire » + barre) |
| `airootfs/etc/dconf/` | réglages GNOME forcés (thème, fond, favoris) |
| `airootfs/usr/local/bin/ghostcat-install` | installeur sur disque |
| `airootfs/opt/ghostcat-hub/` | le Hub : `index.html` (interface), `tools.js` (catalogue), `ghostcat_hub.py` (fenêtre GTK4/WebKit) |

## Ajouter un outil au Hub

Ajoute une ligne dans `airootfs/opt/ghostcat-hub/tools.js` :

```js
{"id":"monoutil","name":"Mon Outil","team":"red","cat":"Web","desc":"Ce qu'il fait.",
 "check":["monoutil"],"pkg":"monoutil","run":"monoutil -h","docs":"https://..."}
```

`team` = `red`, `blue`, `purple` ou `system`. `gui:true` pour une app graphique, `url` pour un site.
Le Hub n'exécute **que** les commandes de ce fichier : la page envoie un identifiant, jamais une commande.

Tester l'interface sans GhostCat : ouvre `index.html` dans un navigateur (mode aperçu).

## 1. Construire l'ISO (sur ton PC Arch)

```bash
sudo pacman -S archiso

# clé BlackArch (une seule fois) — vérifie le sha1 sur blackarch.org/downloads.html
curl -O https://blackarch.org/strap.sh
sha1sum strap.sh
chmod +x strap.sh && sudo ./strap.sh

cd ghostcat-os
sudo ./build.sh                  # → out/ghostcat-full-AAAA.MM.JJ-x86_64.iso
sudo EDITION=lite ./build.sh     # version allégée
```

Le build vérifie chaque nom de paquet : ceux introuvables sont listés dans `packages.missing`
et retirés (ils restent installables depuis le Hub). Compte 20–40 min et ~15 Go libres dans `/tmp` (ou `sudo WORK=/autre/dossier ./build.sh`).

## 2. Tester sans graver

```bash
sudo pacman -S qemu-full edk2-ovmf
qemu-system-x86_64 -enable-kvm -m 6G -smp 4 -cdrom out/ghostcat-*.iso
```

## 3. Clé USB

```bash
sudo dd if=out/ghostcat-*.iso of=/dev/sdX bs=4M status=progress oflag=sync
```
(Sous Windows : Rufus en mode « DD ».)

## 4. Installer sur un disque

Depuis le live, ouvre un terminal :

```bash
ghostcat-install
```

1. archinstall se lance : choisis **Desktop → GNOME**, crée ton utilisateur, réponds **non** au chroot final.
2. Le script reprend la main : BlackArch, tous les paquets, branding, Plymouth, GNOME.
3. Redémarre → GhostCat OS. Rien d'autre à installer.

## Prochaines étapes

- [ ] Installeur graphique (Calamares) via un dépôt GhostCat perso
- [ ] Dépôt GhostCat pour packager **0xFLUX**, **GHOST WEB AUDITOR**, **0xData**, burpsuite
- [ ] Thème GRUB du live (menu de boot noir + fantôme)
- [ ] Icônes dédiées par outil dans le Hub
