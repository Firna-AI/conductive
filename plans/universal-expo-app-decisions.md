# Open decisions of the universal Expo app

This file holds the open decisions of
[One Expo app for web, phones, and the Mac app](universal-expo-app.md).
The plan deletes this file with itself. Each decision was added on
23 November 2026, after the user chose decision 1 F. The options check ran
on the same day. Its report is in
`.context/universal-expo-app/options-check.md`. It added options 7 D, 7 E,
7 F, 8 D, 9 D, 9 E, 10 D, 10 E, and 11 C, and it moved the recommendations
of decisions 7, 9, 10, and 11.

Terms:

- **React Native Web:** a library that draws React Native views as HTML
  on the web.
- **DOM backend:** the renderer of `@firna/ui` that draws each part as
  plain HTML with inline styles on the web, in
  `futex-ai/ui/src/primitives/dom/`. It replaced React Native Web in
  `futex-ai/ui` #168.
- **Primitives seam:** the private modules in `futex-ai/ui/src/primitives/`.
  Through them each `@firna/ui` part reaches React Native on the phones and
  the DOM backend on the web.
- **Expo DOM component:** a web component that an Expo native app shows in
  a web view inside a native screen.
- **Bearer token:** a credential that a client sends in the
  `Authorization` header. A browser never adds it on its own.
- **EAS:** Expo Application Services, Expo's hosted service that builds,
  signs, and submits native apps.
- **Primary branch:** the integration branch of a plan. Workspace branches
  merge into it, and only it merges into `main`.

## 7. Choose the order of the migration

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `vite.config.ts`, `desktop/vite.config.ts`, `src/App.tsx`,
  `src/app/router.ts`.
- **Background:** Decision 1 F moves the views to React Native and the web
  build to Metro. Vite builds the web app and the Worker together today,
  with the Cloudflare plugin. The app has its own router: `parseRoute` in
  `src/app/router.ts`, behind the `Navigation` interface in
  `src/app/navigation.ts`. Production deploys each push to `main`.
- **Problem:** The moves can run in different orders. The order sets the
  risk to the production web app and the date of the first phone app.
- **Impact if no action:** The port milestones cannot start.
- **Root question:** How does the code move to the one Expo app, so that
  production stays safe at each step and the phone apps ship early?
- **Options:**
  - **A.** Port the views first, area by area, inside the Vite build.
    Start the phone apps when the core areas are ported. Move the router
    and the build to Expo last. The production build stays the same until
    the end. Effort: Large.
  - **B.** Move the web build and the router to Expo first, with the HTML
    views as they are. Then port the views. Then ship the phone apps. One
    early, large build change reaches production. Effort: Large.
  - **C.** Start the phone apps first. Show each view that is not ported as
    an Expo DOM component, with its data from native code. Then port the
    views, and move the web build last. Each DOM component needs props that
    cross the bridge, and its own fetch path. Effort: Large.
  - **D.** Added by the options check. Do A, but switch the web build one
    group of users at a time. CI builds the Expo web export beside the
    Vite build. The Worker runs before the assets, so it serves the Expo
    build to operators first, then to people who opt in. Cost: two web
    builds in CI and in each deploy, and a switch in the Worker. Effort:
    Large.
  - **E.** Added by the options check. Do A, but keep the app's own router
    on every platform. `parseRoute`, the `routes.*` builders, and the
    `Navigation` interface stay. Expo Router gets one catch-all route, and
    a `Navigation` over Expo Router serves the phones. The 806 `routes.`
    calls in 243 files do not move. Cost: no file routes, typed routes, or
    route-level code splitting from Expo Router. Effort: Large.
  - **F.** Added by the options check. Port the core areas for the phones
    first. At first only the phone apps draw the ported views. The web
    keeps its HTML views until a later milestone switches each area. Cost:
    each core area has two view sets until its switch, and they drift.
    Effort: Large.
- **Left out:** A move of all views at once, because each milestone must
  keep the product working. An Expo shell around the live web app first,
  because the user chose F over options C and E of decision 1. A separate
  step to split the Worker build, because every option needs it.
- **Wider fix:** None, because this item sets the order itself.
- **Previous examples:** Mokly Cloud builds its web app with Expo Router,
  in `mokly/packages/app/`. It draws HTML views over `@firna/ui`, so it is
  an example of B.
- **Related:** Decision 9 sets the renderer of the ported views. Decision
  11 sets how each step reaches production. Under 11 A, the whole migration
  reaches production in one deploy.
- **Recommendation:** E. It keeps the order of A, and it removes the move
  of every route, which is the largest risk to the addresses in chats,
  GitHub comments, and emails. The first recommendation was A. The switch
  by group of D can join E for its last step.
- **Action:** ask the user, because the options trade production risk
  against the date of the phone apps, and none is clearly best.

## 8. Choose how the phone apps sign in

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/security/gate.ts:45-55`,
  `worker/security/desktop-auth.ts`.
- **Background:** The browser and the Mac app keep the sign-in in an
  HttpOnly cookie. The gate accepts a write or a socket only from a trusted
  `Origin`. The Mac main process sets that `Origin` and its own cookie. A
  native request from a phone has no `Origin`. Sessions last at most
  7 days. So a new revision of the Terms reaches each user within 7 days,
  as decision 126 says in `docs/protocol/access-and-security.md:65-67`.
- **Problem:** No rule says how a phone app proves the sign-in, or how the
  gate accepts its requests.
- **Impact if no action:** The phone apps cannot call the Worker.
- **Root question:** How does a phone app prove the sign-in to the Worker,
  and keep it safe on the phone?
- **Options:**
  - **A.** Sign in with GitHub in the system browser, with a one-use
    handoff and a verifier, as on the Mac. The exchange gives a bearer
    token. The app keeps it in the phone's secure storage. The gate accepts
    a request with that token and no cookie, without the `Origin` rule.
    Sessions last at most 7 days. Effort: Medium.
  - **B.** Use the same handoff. The exchange sets a phone session cookie,
    and native code sends a fixed `Origin` for the phone apps, as the Mac
    main process does. On Android, React Native shares its cookie store
    with the web views, so the cookie also reaches the composer and the
    terminal. Effort: Medium.
  - **C.** Do A, and add a refresh token that keeps a phone signed in for
    up to 30 days of use. The person signs in less often. Each refresh
    must check the revision of the Terms, or decision 126 no longer holds
    for phones. Effort: Large.
  - **D.** Added by the options check. Do A, and bind the session to a key
    in the Secure Enclave or the Android Keystore. Each request carries a
    signature with that key, as in DPoP, RFC 9449. A copied token then
    fails on another device. Cost: a native signing module and a signature
    check on each request. Effort: Large.
- **Left out:**
  - A token that a web view reads, because scripts in the web view could
    read it. The Mac rule forbids that. The web views of the composer and
    the terminal get no credential. Native code makes their requests.
  - A sign-in that a signed-in browser approves, such as a QR code. It
    fails for a person who has only a phone, and for App Review.
  - GitHub sign-in inside a web view of the app. A is better on every
    point, because the system browser holds the GitHub session and the
    passkeys.
  - A short access token with a refresh capped at 7 days. It gives no
    fewer sign-ins than A, and the gate already reads the session on each
    request.
- **Wider fix:** None, because each option is a full sign-in design.
- **Previous examples:** Decision 62, the Mac sign-in, in
  `docs/protocol/desktop-sign-in.md`.
- **Related:** Milestones 6 and 21 wait for the answer.
- **Recommendation:** A. A bearer token is the common pattern for native
  clients, it keeps decision 126, and it stays out of every web view.
- **Action:** ask the user, because it adds a new credential at the
  boundary of the Worker.

## 9. Choose the style layer of the shared views

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `src/ui/`, with 185 CSS Modules. `src/` has 261 in all.
- **Background:** The views use CSS Modules today. The CSS uses hover
  rules, grid, container queries in 12 files, and CSS variables. React
  Native styles have none of these. Every `@firna/ui` part in the app
  already draws on the web through the DOM backend, not React Native Web.
- **Problem:** No rule says what draws a shared view on each platform, or
  how it gets its look, its hover state, and its phone and desktop layouts.
- **Impact if no action:** The port milestones cannot start.
- **Root question:** What draws the shared views on each platform, and how
  do they get their look, hover state, and width layouts from one source?
- **Options:**
  - **A.** Use React Native styles with the tokens of `src/ui/design/`, and
    draw them on the web through React Native Web. Hover comes from the
    hovered state, and layout by width from the window size or `onLayout`.
    It adds `react-native-web` to the web app, and the page then has two
    renderers. Effort: Large.
  - **B.** Add a style library that writes real CSS on the web, such as
    Unistyles, NativeWind, or the Tamagui style core. It gives media
    queries and hover on the web. Every view depends on it. Effort: Large.
  - **C.** Keep CSS Modules in `.web.tsx` files, and write native styles
    in `.native.tsx` files. Each view then has two style sources. Effort:
    Large.
  - **D.** Added by the options check. Write the shared views on the
    primitives seam of `@firna/ui`, which `futex-ai/ui` exports as a public
    entry. Styles are React Native styles with the tokens, as in A. On the
    web the views draw through the DOM backend, as each `@firna/ui` part
    does today. The web app, Vitest, and Mokly need no React Native Web.
    Cost: a new public API in `futex-ai/ui`, inline styles that the chat
    port must measure on long transcripts, and no Reanimated or Gesture
    Handler views on the web. Effort: Large.
  - **E.** Added by the options check. Write the shared views with React
    Strict DOM: HTML-like elements with StyleX styles. On the web it writes
    real CSS with hover, media queries, and variables. Cost: new Babel and
    PostCSS steps in every build, version 0.0.54, and only part of CSS on
    the phones. Effort: Large.
- **Left out:** The Tamagui kit of parts, because `@firna/ui` gives those
  parts.
- **Wider fix:** D. It keeps one style source, and it uses the renderer of
  the base library, so the shared views and the `@firna/ui` parts cannot
  drift apart on the web.
- **Previous examples:** `@firna/ui`, in `futex-ai/ui/src/primitives/`, and
  its move from React Native Web to the DOM backend in `futex-ai/ui` #168.
- **Related:** Decision 7 needs this answer before the port starts.
- **Recommendation:** D. It gives one style source with the renderer that
  the app already uses, and it adds no dependency to the app. The first
  recommendation was A. A stays better if the views need Reanimated or
  Gesture Handler on the web.
- **Action:** ask the user, because the choice shapes every view, and the
  options have real trade-offs.

## 10. Choose where the phone apps build

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/`.
- **Background:** CI already signs the Mac app on Blacksmith Mac runners.
  A store app needs a check of each change, signing keys, a build for each
  platform, and an upload to each store. About 30 to 80 pull requests
  merge on most weekdays, and most change no native code.
- **Problem:** No rule says how each change is checked on the phones, or
  which service builds, signs, and uploads the releases and holds the keys.
- **Impact if no action:** The phone apps cannot ship.
- **Root question:** How is each change checked on the phones, how is each
  release built, signed, and sent to the stores, and who holds the keys?
- **Options:**
  - **A.** Build each pull request and each release with EAS. Expo holds
    the signing keys and uploads to the stores. It is a new service with a
    cost for each build. Effort: Medium.
  - **B.** Build in GitHub Actions. iOS builds on Mac runners, and Android
    on Linux. GitHub secrets hold the keys. Expo SDK 58 needs Xcode 26.4 or
    newer, so the Mac runner image may change. Effort: Large.
  - **C.** Build in GitHub Actions, as B does, but send fixes to the
    JavaScript through EAS Update only. Effort: Large.
  - **D.** Added by the options check. Each pull request exports the iOS
    and Android bundles on Linux, with no keys. A native build runs only
    when the Expo fingerprint of the native inputs changes. Releases build,
    sign, and upload on EAS, which holds the keys. The team can download
    the keys, so the choice can be undone. Effort: Medium.
  - **E.** Added by the options check. Build iOS in Xcode Cloud, Apple's
    build service, and Android on Linux runners. Cost: two build systems,
    and a script that installs Node in Xcode Cloud. Effort: Large.
- **Left out:** Builds on a person's Mac, because each release then needs
  that person.
- **Wider fix:** None, because each option is a full release path.
- **Previous examples:** The Mac signing jobs in `.github/workflows/`.
- **Related:** Milestone 22 waits for the answer.
- **Recommendation:** D. It keeps the small CI work of A for releases, a
  fast check on each pull request, and a low EAS cost. The first
  recommendation was A.
- **Action:** ask the user, because it adds a service that holds the
  signing keys and costs money.

## 11. Choose how the work reaches main

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/ci.yml:6`.
- **Background:** This plan has 26 milestones and takes months. Each merge
  to `main` deploys to production. 176 of the 433 commits on `main` since
  10 November change views or CSS Modules under `src/`.
- **Problem:** One branch for months conflicts with each change on `main`,
  and its review is too large.
- **Impact if no action:** The merge risk grows each day.
- **Root question:** How does each milestone reach `main` and production?
- **Options:**
  - **A.** Keep one primary branch of the plan. Nested workspaces merge
    into it. One pull request merges it to `main` at the end. Effort:
    Small.
  - **B.** Merge this plan to `main` first. Each milestone then gets its
    own nested workspace and pull request to `main`. Effort: Small.
  - **C.** Added by the options check. Keep one primary branch for
    integration, with the combined gate. When a group of milestones is
    ready, a pull request merges the primary branch into `main`. The plan
    stays for the later pull requests. The CI push trigger must name the
    primary branch. Effort: Small.
- **Left out:** A split into several plans, because C can merge any group
  early, and a second plan only adds a second record.
- **Wider fix:** None, because this item sets the process itself.
- **Previous examples:** Decisions 141 and 143 of
  `plans/boat-native-remote-workspaces.md`. On 8 November 2026 the user
  chose 143 A, which is this item's C, over 143 B, which is this item's B.
- **Related:** Every milestone waits for the answer. Decision 7 relies on
  steps that reach production one at a time.
- **Recommendation:** C. You chose it for the same question in decision
  143, and it keeps a combined gate with small batches. The first
  recommendation was B.
- **Action:** ask the user, because it sets how months of work reach
  production.

## 12. Stop new HTML views during the port

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review, from the options check.
- **Category:** Code structure.
- **Location:** `eslint.config.js`.
- **Background:** Each port milestone moves the views of one area to the
  shared views. Other work adds views each day. 176 of the 433 commits on
  `main` since 10 November change views or CSS Modules.
- **Problem:** Nothing stops a new view with HTML elements or a new CSS
  Module in an area that is already ported.
- **Impact if no action:** The port keeps growing, and ported areas fall
  back to HTML views.
- **Root question:** How does a ported area stay ported while other work
  changes it?
- **Options:**
  - **A.** Change nothing. Each port milestone also ports the views that
    other work added. Effort: Small.
  - **B.** Add a lint rule that rejects HTML elements and CSS Module
    imports in the folders of each ported area. Each port milestone adds
    its folders. Effort: Small.
  - **C.** Add a line to `CLAUDE.md` and the UI README that says new views
    in a ported area use the shared views. Reviews check it. Effort:
    Small.
- **Left out:** None.
- **Wider fix:** B. It catches every new HTML view in a ported area.
- **Previous examples:** Decision 3 B of the shared UI move in #661 added
  an ESLint rule that blocks app imports of `docs/mockups/`.
- **Related:** Decision 7 sets when the first area is ported.
- **Recommendation:** B. A rule catches each case, as the rule of #661
  does.
- **Action:** ask the user, because it adds a new lint rule, and the
  always-on rules reserve that choice for the user.
