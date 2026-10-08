# Fonts for the social image

`src/app/opengraph-image.tsx` renders with `ImageResponse`, which needs TTF, OTF or WOFF files on disk and ignores variable-font axes. The page itself loads its fonts through `next/font/google` in `src/app/layout.tsx`; these files are only for the social image.

| File | Weight |
|---|---|
| `AtkinsonHyperlegibleNext-Regular.ttf` | 400 |
| `AtkinsonHyperlegibleNext-ExtraBold.ttf` | 800 |

Source: `ofl/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf` in [google/fonts](https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext) at commit `95f4904fc8bcf26d3420fe315560c96417c6dec7` (SHA-256 of the variable file: `5a455d1cfa099b601ab70751bb9673e8fe1854dc4500c80e1a220d0d75e31745`).

Each static file was cut from the variable font with fontTools 4.63.0:

```sh
fonttools varLib.instancer "AtkinsonHyperlegibleNext[wght].ttf" wght=400 --static --update-name-table -o AtkinsonHyperlegibleNext-Regular.ttf
fonttools varLib.instancer "AtkinsonHyperlegibleNext[wght].ttf" wght=800 --static --update-name-table -o AtkinsonHyperlegibleNext-ExtraBold.ttf
```

License: SIL Open Font License 1.1, in `OFL.txt` next to these files. The font declares no Reserved Font Name, so the instanced files keep the family name.
