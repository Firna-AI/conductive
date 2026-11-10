# Error reporting in the browser

This page is part of the [web app README](README.md#error-reporting).
[Error reporting](../../docs/protocol/error-reporting.md) states the rules
that it follows.

The production web app and the Mac app window share one browser error
reporter. `src/main.tsx` and `desktop/renderer/main.tsx` start it before the
services start and before the first render. It reports the three React root
callbacks, the uncaught errors of the page, and the unhandled promise
rejections. It adds no error screen.

## When it runs

- It starts only in a production build with a generated release, a valid
  public DSN, and the configured production app origin.
- The public DSN is empty, so the normal build sends no browser reports yet.
- Local origins, development builds, a missing release, and an invalid DSN
  keep it off. It then passes no root callbacks, and React handles errors
  as usual.
- In the Mac app window, the configured app origin of the build decides, as
  the [Mac app README](../../desktop/README.md) says.

## What it keeps and sends

- It keeps the user ID and the screen in memory only.
- App services give it only a Conductive account ID or `null`. It never
  gets a full `User` record.
- The screen is the `screen` field of the route. It holds no address,
  query, ID, join code, or file view path.
- Two rebuilds guard each report. Its policy rebuilds each allowed event
  before the SDK sends it. Its transport rebuilds the complete envelope
  again.
- The SDK uses no browser storage, sessions, tracing, replay, logs,
  metrics, client reports, or breadcrumbs.

## Key code

- `error-reporting.ts`: `startBrowserErrorReporting(options)` returns
  `rootOptions`, `identity.setUser(id)`, and `close()`.
- `services.ts`: the optional `AppServices.errorReporting` receives only a
  Conductive account ID or `null`.
- `app-model.ts`: its synchronous `AppModel.boot` subscription sets the
  user ID for `ready` and `waiting`, and clears it for every other state.
- `error-reporting-runtime.ts` reads only `parseRoute(...).screen`, through
  the same `Navigation` instance that the app uses.
- `error-reporting-bundles.ts` parses verified original stacks, and admits
  only the bundle and debug-ID pairs that the page actually loaded.
- `error-reporting-policy.ts` and `error-reporting-transport.ts` rebuild
  each allowed event before the SDK sends it, and the complete envelope
  again at the transport.

## Checks

Run each command from the repository root with Node 24. The first two check
the policy, the startup, the capture, the user ID, the route, and the
content security policy of the reporter:

```sh
npm run test -- src/app/error-reporting-policy.test.ts src/app/error-reporting-lifecycle.test.ts src/app/error-reporting.test.ts src/app/error-reporting-boundary.test.ts src/app/error-reporting-stacks.test.ts
npm run test -- worker/security/content-security.test.ts worker/security/desktop-assets.test.ts
```

The last one checks the app behavior around it and the credentialed
desktop API and file transport:

```sh
npm run test -- src/app/app-model.test.ts src/app/account-model.test.ts desktop/renderer/services.test.ts
```
