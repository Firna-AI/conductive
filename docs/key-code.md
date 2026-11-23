# Key code

- `docs/mockups/src/entries/`: the Mokly entries of the screens, and the
  user flows.
- `docs/mockups/src/screens/`: one React component for each screen.
- `docs/mockups/src/components/`: the parts that only the mockups use.
- `docs/mockups/src/fixtures/`: the sample data of the screens.
- `src/shared/brand.ts`: the product name, which every screen reads, and the GitHub repository of the releases.
- `mokly.config.json`: the Mokly configuration.

- `worker/app.ts`: the Worker's HTTP entry point.
- `worker/marketing/`: built marketing pages, the agreement page before
  GitHub, the file list, request markers, and the site's security headers.
- `src/marketing/`: Astro pages, layouts, parts, styles, pictures, shared
  legal text, the public guides, and the shared plans and words of the
  pricing page. Its [README](../src/marketing/README.md) gives the build and
  preview steps.
- `src/shared/site-build.ts`: names and types shared by the Astro build
  and the Worker.
- `worker/security/`: GitHub sign-in, signed sessions, the request gate,
  the app origin of each request, the Mac app's sign-in handoff and origin
  rules, and the shared content security policy of the web app and the Mac
  app.
- `worker/data/`: D1 queries for users, orgs, and sessions.
- `worker/sandbox/`: the provider accounts, the lookup of the client of each
  account, and the typed client of each provider kind. The `boat` account
  uses the app's Boat key. Each other account, such as `e2b`, comes from
  `SANDBOX_PROVIDER_ACCOUNTS`.
- `src/app/`: the data of the web app, such as the typed API client, the
  models that the screens read, the router, and the event stream. Its
  [README](../src/app/README.md) gives the rules and the key code of the
  web app.
- `src/shell/`: the screens of the app shell, such as the workspace list,
  the workspace screen, Get started, and the settings. The
  [web app README](../src/app/README.md) also gives their rules and their
  key code.
- `src/ui/`: the UI that the app shares with the mockups: the parts, their
  CSS Modules, the design tokens, the theme, the global stylesheet, and the
  fonts. Its [README](../src/ui/README.md) gives the rules.
- `src/shared/`: the browser API contracts, route paths, and runner message types.
- `src/test-support/`: the fake API, recorded chat and file events, and terminal fake.
- `worker/test-support/`: local D1, fake GitHub, Boat, and E2B servers, and runner fakes.
- `migrations/`: the D1 schema migrations.
- `desktop/`: the Mac app, an Electron package of its own. Its
  [README](../desktop/README.md) gives its key code.

The web app lives under `src/`, and the Cloudflare Worker under `worker/`.
