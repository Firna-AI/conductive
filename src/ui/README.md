# Shared UI

`src/ui/` holds the UI that the app shares with the
[mockups](../../docs/mockups/README.md). It holds the parts, their CSS
Modules, their words, the design tokens, the theme, the global
stylesheet, and the fonts. The web app imports these modules at run time,
and the Mac app bundles the web app. The Worker imports some words, such
as those of the ChatGPT sign-in. The marketing site imports the palette,
the font, some words, and the lists of the marketing pictures. The mockup
catalogue imports these modules too, so the app and the mockups draw the
same parts.

## What lives here

The folders match the folders of `docs/mockups/src/`. Each folder holds
only the modules that the app uses. The rest of the folder stays in the
mockups.

| Folder or file         | Contents |
| ---------------------- | -------- |
| `components/<folder>/` | The parts that the app uses, with their CSS Modules, their words in `*Copy.ts` modules, and the domain types that they read |
| `screens/`             | The CSS Modules and the words of the screens that the app also draws, such as sign-in, the waitlist, and Get started, and the lists of the marketing pictures. The screen components stay in the mockups |
| `design/`              | The design tokens: the colours of each scheme in `palette.ts`, the type, density, sizes, radii, and fonts in `metrics.ts`, and the colours of the org tiles in `orgColors.ts` |
| `theme.ts`             | `themeFor`, the Firna theme of each colour scheme, and `tokensCss`, the tokens as CSS custom properties |
| `render.css`           | The global stylesheet of the app and of the catalogue |
| `fonts/`               | Inter, which the Firna theme names first, with its licence |
| `noop.ts`              | A handler that does nothing. A Firna control without a handler renders as disabled, so a part passes `noop` when it gets no handler |

The product name, its domains, and its repository live in
[`src/shared/brand.ts`](../shared/brand.ts).

The mockup screens, the Mokly entries, the fixtures, the catalogue paths,
`ScreenLink`, the renderer, and the parts that only the mockups use stay
in `docs/mockups/src/`. The
[folder layout of the mockups](../../docs/mockups/README.md#folder-layout)
gives them.

## A new shared part

- A module lives here when production code of the web app, the Mac app,
  the Worker, or the marketing site imports it, directly or through
  another module here. An import from development code in a `dev/`
  folder or from a test does not count.
- A part that only the mockups use lives in
  `docs/mockups/src/components/<folder>/`. When the app starts to use the
  part, move the part here, into `components/<folder>/`. Also move each
  part, style, or words module that it imports from the mockups.
- A fixture never moves. A part here takes its data as props. A domain
  type that the part read from a fixture moves here, beside the part.
- A new part that the app uses starts here. A new part that only the
  mockups draw starts in the mockups.
- The Mokly registration of a part stays under
  `docs/mockups/src/entries/components/<folder>/`, also when the part
  moves here. So the catalogue path of the part does not change.
- Check `@firna/ui` first, then this folder, before you create a part.

## Imports go one way

- Nothing here imports `docs/mockups/`, also not a type. A domain type
  that a part here reads lives here, beside its users, such as
  `BannerState` in `components/workspace/barModel.ts`. A mockup part that
  needs the same type imports it from here.
- The mockups import the shared modules from here. A mockup screen
  renders the Mokly wrapper of a registered part. A file here renders
  only plain parts, because a wrapper throws outside a Mokly render.
  [Registered parts](../../docs/mockups/registered-parts.md) gives the
  rules.
- The ESLint rule `no-restricted-imports` keeps this direction. It
  rejects an import of `docs/mockups/` in each TypeScript file of `src/`,
  `worker/`, and `desktop/`, so also here. It does not check CSS or Astro
  files.
- The rule skips development code in `dev/` folders, tests, and
  test-support files, because they import the fixtures. The rule checks
  each import alone. It does not follow a chain of imports through such a
  file.

## Styles and tokens

- Layout styles are CSS Modules beside their component. They read the
  design tokens through the `--ui-*` custom properties.
- `tokensCss` in `theme.ts` gives these properties of a colour scheme as
  CSS. The app writes them in `src/shell/ui/ThemeRoot.tsx`, and the catalogue
  in its renderer, `docs/mockups/src/render.tsx`. Both give the theme of
  `themeFor` to `@firna/ui`.
- `render.css` is the global stylesheet of the app and of the catalogue.
  It loads Inter from `fonts/`. It sets the background, the text colour,
  and the font of the page from the tokens.
- The marketing site reads the palette of `design/` and the font of
  `fonts/`. Its own styles live in `src/marketing/styles/`.
- `fonts/` holds `InterVariable.woff2` and its SIL Open Font License in
  `Inter-OFL.txt`. The [third-party notices](../../THIRD_PARTY_NOTICES.md)
  name the font.

## Related docs

- [Mockups](../../docs/mockups/README.md): the visual spec, the
  catalogue, and how a screen is built.
- [Registered parts](../../docs/mockups/registered-parts.md): the Mokly
  registrations of the shared parts, and how a screen uses a part.
- [The shared UI move](../../tools/ui-move/README.md): the old path of
  each moved file, and the steps for a branch that started before the
  move.
- [Web app](../app/README.md): the rules of the app shell.
