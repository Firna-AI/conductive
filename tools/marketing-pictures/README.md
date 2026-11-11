# Marketing picture captures

These tools rebuild the product pictures and public share card from the
current Mokly mockups. Run the commands from the repository root with
Node 24 and Google Chrome available as `google-chrome`.

## Commands

```bash
npm run marketing:pictures
```

This command builds the mockups, captures the 28 marketing WebP pictures,
and rebuilds the 1200 × 630 share card at
[`src/marketing/pictures/link-preview.png`](../../src/marketing/pictures/link-preview.png).

To rebuild only the share card:

```bash
npm run marketing:preview
```

Both commands start a temporary server and Chrome.
They close both and remove their temporary files when they finish or fail.
The site build reads the committed picture files and does not run Chrome.

## Share card sources

- [assets/link-preview-background.png](assets/link-preview-background.png):
  the approved blue painting, made with OpenAI imagegen under
  [OpenAI's terms](https://openai.com/policies/terms-of-use/).
  The command reuses this image and makes no AI request.
- [Brand master](../../docs/brand/conductive-lockup-light.svg):
  the unchanged logo and product name.
- [Inter font](../../docs/mockups/src/fonts/InterVariable.woff2):
  the project font under its [SIL Open Font License](../../docs/mockups/src/fonts/Inter-OFL.txt).
- The home page's shared headline in
  [features.ts](../../src/marketing/features.ts).
- The current canonical workspace in its ready state, which the home
  hero also uses. The share capture uses a 1440 × 547 desktop viewport.

The compositor preserves the approved layout: the logo at the top left,
the 64-pixel title at weight 650, equal 64-pixel app margins, a plain frame,
and a crop at the bottom.

Commit the generated card with changes to its screen, title, brand, or
layout. Captures need a system font with the ⌘ glyph for the Search
shortcut. Linux captures can use DejaVu Sans Mono.

## Key code

- [run.ts](run.ts): command selection, mockup build, browser lifecycle,
  and publishing the generated pictures.
- [capture-pictures.ts](capture-pictures.ts): the existing marketing
  captures, from the shared picture list.
- [capture-preview.ts](capture-preview.ts): fresh workspace capture and
  share card output.
- [preview-document.ts](preview-document.ts): the approved card layout.
- [page.ts](page.ts): page loading, resource readiness, animation freeze,
  and screenshots.
- [encode-pictures.ts](encode-pictures.ts): lossless WebP output.

[Marketing pictures](../../src/marketing/pictures.md) gives the source
screen list. [Link previews](../../src/marketing/link-previews.md) gives
the public metadata and share image workflow.
