# Créditos y licencias de assets

**Decisión del proyecto**: todo el arte del juego se genera por código. No se usa ningún asset gráfico de terceros.

| Asset | Autor | Licencia | Dónde está |
|---|---|---|---|
| ~~Starship Interiors — 16x16 Top-Down Pixel Art Tileset v1.2~~ (comprado, **ya no se usa**) | bubbabba ([itch.io](https://bubbabba.itch.io/starship-interiors-tileset)) | Licencia propia del pack: uso en juegos comerciales y no comerciales, se puede editar y recolorear. **Prohibido** redistribuir los assets como assets, entrenar IA con ellos o hacer NFTs. Crédito no obligatorio, pero agradecido. | `assets-src/starship_interiors_tileset_v1.2/` (original) → copiado a `public/assets/` por `npm run assets` |
| Barlow Condensed | Jeremy Tribby | SIL Open Font License | Google Fonts |
| Logotipo de GitHub (icono del enlace al repositorio en el menú de la portada) | GitHub | [Normas de uso de GitHub](https://github.com/logos): permitido para enlazar a GitHub, sin modificarlo | `packages/client/src/game/ui/landing.ts` (`GITHUB_ICON`) |

## Notas

- La carpeta `assets-src/` (el pack comprado) está fuera de git y ya no la usa el código; se puede conservar o borrar.
