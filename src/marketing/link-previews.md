# Link previews

The public site uses the approved Conductive preview for Open Graph and
Twitter large-image cards. [Public link previews](../../docs/protocol/link-previews.md)
gives the requirements.

`components/ShareMetadata.astro` reads the page title and description from
`layouts/SiteLayout.astro`. It builds the page and image addresses from
Astro's configured public site origin. `layouts/Document.astro` places the
tags in the document head. App-host pages use `Document` directly, and
the not-found page disables the card.

The image is [pictures/link-preview.png](pictures/link-preview.png), a
1200 × 630 PNG. Astro imports it as an asset and publishes a hashed URL
under `/_site/`. The build file list includes it, so the Worker can serve
it without sign-in. The image is not loaded by the visible site layout.

## Image sources

The user approved this image after the X header design work. It uses:

- A blue colour-field painting made with OpenAI imagegen from an earlier
  generated warm painting. [OpenAI's terms](https://openai.com/policies/terms-of-use/)
  govern the generated output. No stock photo appears in the image.
- A real capture of the canonical Conductive workspace mockup, with
  unchanged screen content and a plain frame.
- The approved [light brand lockup](../../docs/brand/conductive-lockup-light.svg)
  without changes.
- The homepage headline in Inter, weight 650, under the font's
  [SIL Open Font License](../../docs/mockups/src/fonts/Inter-OFL.txt).

The image gives the app equal 64-pixel side margins and crops it at the
bottom. The background, brand, and screen are part of the flattened PNG.
The approved PNG is the published source asset. The original scratch
render files are not required by the build.
Make a new card when its brand, headline, or captured workspace changes.

## Verification

Run `npm run test -- worker/marketing/built-site.test.ts`.
The built-site sharing test follows the image URL through the Worker and
checks its type and dimensions. It also checks that public pages keep
their own metadata and that private app-host pages omit sharing tags.

After deployment, share a public page URL to check the service's card.
An existing card can remain cached by that service.
