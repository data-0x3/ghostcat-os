# GhostCat OS

Distribution Linux de cybersécurité, dérivée d'Arch Linux, avec son propre dépôt
de paquets, son installeur, son bureau et ses mises à jour.
**developed by 0x3** · https://t.me/data0x3

Site officiel : **https://data-0x3.github.io/ghostcat-os** (téléchargement en une commande, guide, FAQ).

## Ce qui fait de GhostCat une distribution

| | |
|---|---|
| **Dépôt `[ghostcat]`** | Tous les composants sont des paquets signés, mis à jour par `pacman` : `https://data-0x3.github.io/ghostcat-os/repo/x86_64`. Le dépôt passe avant ceux d'Arch. |
| **Identité** | `os-release` (`ID=ghostcat`, `ID_LIKE=arch`), menu de démarrage, écran de chargement, police et thème propres. Un hook pacman repose l'identité après chaque mise à jour d'Arch. |
| **Installeur maison** | GhostCat Installer : disque, chiffrement LUKS2, compte, en quelques écrans. Copie le système live (pas de téléchargement), btrfs avec sous-volumes, GRUB GhostCat, démarre aussi un disque externe sur un autre PC. |
| **Retour en arrière** | snapper + snap-pac : un instantané avant et après chaque mise à jour, choisissable dans le menu de démarrage (grub-btrfs). |
| **Mises à jour** | `ghostcat-update` : lit les annonces d'Arch, met d'abord à jour les trousseaux, puis tout le reste. |
| **Bureau** | GNOME Shell redessiné par l'extension GhostCat Shell : menu fantôme, bouclier de protection, mode fantôme (Tor + nouvelle MAC), apparition animée du bureau, thème noir à sélection inversée. |

## Les paquets (`pkgs/`)

Chaque dossier contient un `PKGBUILD` et un dossier `root/` rangé comme le système final.

| Paquet | Contenu |
|---|---|
| `ghostcat-desktop` | paquet méta : installe tout GhostCat OS |
| `ghostcat-release` | identité du système, fastfetch, hook pacman |
| `ghostcat-keyring` | clé de signature du dépôt (générée au build depuis le secret `GHOSTCAT_SIGNING_KEY`) |
| `ghostcat-mirrorlist` | adresse du dépôt `[ghostcat]` |
| `ghostcat-privacy` | MAC aléatoire, DNS chiffré, Firefox durci, VPN, `ghostcat-status`, mode fantôme |
| `ghostcat-theme` | polices GhostCat Pixel / GhostCat Sans, icônes, fonds, Plymouth, GRUB, réglages GNOME |
| `ghostcat-shell` | l'extension GNOME Shell GhostCat (interface et animations) |
| `ghostcat-shell-extras` | Dash to Dock, Blur my Shell, Burn My Windows, figés pour la version de GNOME |
| `ghostcat-hub` | GhostCat Hub : 69 outils Red, Blue et Purple Team |
| `ghostcat-setup` | GhostCat Setup : langue, clavier, fuseau, vie privée |
| `ghostcat-installer` | GhostCat Installer |
| `ghostcat-update` | mises à jour sûres |

`airootfs/` ne contient plus que ce qui est propre au live (utilisateur `ghost`, connexion
automatique, service qui ouvre Setup avant le bureau).

## Construire

Tout se fait sur GitHub Actions :

- **Site et dépôt GhostCat** (`site.yml`) : à chaque changement de `pkgs/` ou `site/`,
  construit les paquets, le dépôt, et publie le tout sur GitHub Pages.
- **Build GhostCat ISO** (`build-iso.yml`) : construit l'ISO (édition `lite` < 2 Go ou `full`)
  et la publie en Release.
- **Test GhostCat en VM** (`vm-test.yml`) : après chaque ISO, la démarre dans QEMU,
  l'installe toute seule sur un disque virtuel, redémarre dessus et pousse les captures
  d'écran sur la branche `vm-shots`.

En local, sur une machine Arch : `sudo ./build.sh` (dépôt dans `repo-out/`, ISO dans `out/`).

### Signature des paquets

Le dépôt est signé si le secret `GHOSTCAT_SIGNING_KEY` existe (clé OpenPGP privée en armure ASCII).
Pour la créer : `tools/new-signing-key.sh`, puis colle le bloc affiché dans
*Settings → Secrets and variables → Actions → New repository secret*.

## Ajouter un outil au Hub

Ajoute une ligne dans `pkgs/ghostcat-hub/root/usr/lib/ghostcat/hub/tools.js`, puis
`python3 tools/make-assets.py` pour générer son lanceur et son icône :

```js
{"id":"monoutil","name":"Mon Outil","team":"red","cat":"Web","desc":"Ce qu'il fait.",
 "check":["monoutil"],"pkg":"monoutil","run":"monoutil -h","docs":"https://..."}
```

Le Hub n'exécute que les commandes de ce fichier : la page envoie un identifiant, jamais une commande.
