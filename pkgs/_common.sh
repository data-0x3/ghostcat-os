# GhostCat OS — fonctions partagées par les PKGBUILD (sourcé par makepkg).
# Les fichiers du paquet sont rangés dans root/ avec leur arborescence finale.
_ghostcat_install() {
  cp -r --preserve=mode,links "$startdir/root/." "$pkgdir/"
  find "$pkgdir" -name .gitkeep -delete
}
