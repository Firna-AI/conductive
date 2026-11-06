# Marketing site

The marketing site is the public site at the root of the product domain,
`conducting.build`. It has the home page, the Terms page, the Privacy page,
and a page for an unknown address. Visitors need no sign-in. The pages run
no script and set no cookie. Every sign-in link leads to the app, on the
`app.` host.

The marketing mockup is the visual spec:
[`MarketingScreen.tsx`](../../docs/mockups/src/screens/MarketingScreen.tsx)
and the parts in
[`components/marketing/`](../../docs/mockups/src/components/marketing/).
The [brand folder](../../docs/brand/README.md) gives the logo files. The
site uses the lockups and the favicons from it unchanged, in place of the
older mark of the mockup.

## How the Worker serves it

- The Worker sends each request of the root domain to `marketingResponse`
  in `worker/hosts.ts`, which calls `siteResponse` in `routes.ts`.
- `GET` and `HEAD` get a page. Other methods get `405` with
  `Allow: GET, HEAD`.
- The pages are `/`, `/terms`, and `/privacy`. Every other path gets the
  page for an unknown address with `404`. So the app's API and the app's
  own files never answer on the root domain.
- The static assets binding serves only the files that the pages name:
  the pictures, the lockups, the favicons, and the Inter font.
  `/favicon.ico` serves the favicon of the brand.
- Each page carries one inline stylesheet. Its content security policy
  allows that stylesheet by its hash, and files from the site only.
- The phone layout starts below 760 px. CSS media queries and the sources
  of each `<picture>` use that width. The site is dark first, and a visitor
  who prefers light gets the light scheme.

## Pictures

Each product picture is a still image of a real screen of the mockups, as
the marketing mockup shows it. `pictures.ts` names the same screen part,
size, and scale as
[`marketingPictures.tsx`](../../docs/mockups/src/screens/marketingPictures.tsx),
and gives each picture its text for assistive technology. Each picture has
a file for each layout and each colour scheme, in `pictures/`.

The files are captures of the screen inside each frame of the marketing
mockup, without the frame, at two device pixels for each CSS pixel. They
are lossless WebP, so each pixel stays as the mockup draws it. When a
screen of the app or the marketing mockup changes, capture the pictures
again:

1. Run `npm run mockups:build`.
2. Open `mokly-static/static/mokly-generated/marketing/index.desktop.html`
   at 1440 px wide, and `index.mobile.html` at 390 px wide. Use the files
   with `.dark` for the dark scheme.
3. Capture the screen inside each frame, at a device pixel ratio of 2.
   Leave out the border of the frame, and snap the edges inward to whole
   device pixels.
4. Save each capture as lossless WebP in `pictures/`, as
   `<picture>-<layout>-<scheme>.webp`. The phone picture is one file for
   each scheme, `phone-<scheme>.webp`, because both layouts show it.

The app screens of the mockups still draw the older mark of the product in
the org rail, so the pictures show it too. Capture them again when the
mockups take the new logo.

## Legal drafts

The Terms and Privacy pages are drafts for a lawyer, as decision 35 asks.
Each page shows "Draft for lawyer review" at the top. Each fact that the
operator or the lawyer must still give is a marked draft field, such as
the legal name, the address, the contact, the law, the lawful basis, and
how long data stays. The other facts come from the
[architecture doc](../../docs/architecture.md) and the
[protocol docs](../../docs/protocol/).

Sources for the review:

- The ICO guidance on the privacy information to give:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/>.
  It lists the identity and the contact, the purposes and the lawful
  basis, the recipients, transfers to other countries, retention, the
  rights, and complaints. The Privacy page has a section for each.
- Boat's terms: <https://boat.dev/terms>. They cover the allowed use and
  the responsibility for the Boat account. The Terms page links to them
  and copies none of their clauses.
- The suspension of accounts and an address for abuse reports wait for a
  later change. The Terms page marks them as draft fields.

## Development

- Run the tests: `npm run test -- src/marketing/routes.test.ts`.
- Preview the site with `npm run dev`. Set `APP_ORIGIN` to
  `http://127.0.0.1:5173` and `MARKETING_ORIGIN` to
  `http://localhost:5173` in `.dev.vars`. Then open `http://localhost:5173`
  for the site, and `http://127.0.0.1:5173` for the app.

### Key code

- `routes.ts`: `siteResponse`, the response for each request of the root
  domain.
- `site.ts`: the pages of the site and their heads.
- `home.ts`, `features.ts`: the home page and its copy.
- `chrome.ts`, `actions.ts`: the header, the footer, the actions, and the
  Boat account note.
- `legal.ts`, `terms.ts`, `privacy.ts`: the legal pages and their drafts.
- `pictures.ts`, `frames.ts`, `picture-files.ts`: the pictures, their
  frames, and their files.
- `document.ts`, `styles.ts`, `tokens.ts`, `styles/`: the page document,
  the stylesheet, the design tokens from the mockups, and the CSS.
- `assets.ts`: the brand files and the font, and the asset paths that the
  site serves.
- `html.ts`: the `html` template tag, which escapes each value.
