# Fonts for the project share cards

`src/app/projects/_share/card.tsx` renders with `ImageResponse`, which needs TTF, OTF or WOFF files on disk and ignores variable-font axes. The pages load their fonts through `next/font/google` in `src/app/layout.tsx`; these files are only for the share cards.

| File | Weight |
|---|---|
| `AtkinsonHyperlegibleNext-Regular.ttf` | 400 |
| `AtkinsonHyperlegibleNext-ExtraBold.ttf` | 800 |

Source: `ofl/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf` in [google/fonts](https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext) at commit `95f4904fc8bcf26d3420fe315560c96417c6dec7`, cut to one weight each with fontTools `varLib.instancer wght=400 --static` and `wght=800 --static`.

License: SIL Open Font License 1.1, in `OFL.txt` next to these files. The font declares no Reserved Font Name, so the instanced files keep the family name.
