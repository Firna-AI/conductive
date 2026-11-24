# One Expo app for web, phones, and the Mac app

Status: Active. On branch `calummoore/expo-mobile-version-4fjt`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive runs in the browser and in the Mac app, which shows the web app.
Phone users have only the web app in a phone browser, or on the Home
Screen. It gives no push notices and no store listing. This change makes one
Expo app that builds the web app, an iOS app, and an Android app from one
set of views. The Mac app keeps its Electron main process and shows the web
build of the same Expo app. The marketing site stays Astro.

The brainstorm notes are in `.context/expo-mobile/notes.md`. The change does
not cover a native Mac app, tablets as their own layout, or a second sign-in
method. Tablets follow the phone or the desktop layout by width, as the web
app does.

Contract owners:

- [Architecture](../docs/architecture.md).
- The new phone app doc, `docs/protocol/phone-app.md`, from Milestone 2.
- The new phone sign-in doc, `docs/protocol/phone-sign-in.md`, from
  Milestone 2.
- The new notifications doc, `docs/protocol/notifications.md`, from
  Milestone 2.
- [Waitlist](../docs/protocol/waitlist.md) and
  [Access and security](../docs/protocol/access-and-security.md), for
  account deletion.
- [Operator section](../docs/protocol/operator-section.md), for the list
  of deletion requests.
- [Secret requests](../docs/protocol/secret-requests.md), for notices.
- The [UI README](../src/ui/README.md).

Replaced ways:

- Views with HTML elements and CSS Modules → React Native views that
  React Native Web draws on the web. Consumers: each view under `src/`, each
  shared part under `src/ui/`, and each mockup screen under
  `docs/mockups/src/` that draws them. Moved in Milestones 9 to 20. Deleted
  in Milestone 25.
- The browser `Navigation` of `src/app/navigation.ts` → a `Navigation`
  over Expo Router, with one catch-all route. Consumers:
  `src/main.tsx` and `desktop/renderer/main.tsx`. Moved in Milestone 23.
  Deleted in Milestone 25. `parseRoute` and the `routes.*` builders stay,
  as decision 7 E says.
- The Vite build of the web app → the Expo web export. Consumers: the
  `dev`, `build`, `build:bundle`, and `preview` scripts,
  `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`,
  `desktop/vite.config.ts`, and `tools/marketing-pictures/`. Moved in
  Milestone 24. Deleted in Milestone 25.

## Decisions

### 1. Choose how phones get the app

- **Chosen:** F, by the user on 23 November 2026. One Expo app builds web,
  iOS, and Android. The web build moves from Vite to Metro, and the Mac app
  shows the Expo web build.
- **Other options:** A, change nothing and use the Home Screen web app. B,
  Web Push for the web app. C, an Expo shell around the live web app, which
  was the recommendation. D, C plus native screens for the core. E, C first,
  then shared views one part at a time.
- **Left out:** Native Swift or Kotlin apps share no TypeScript. A separate
  light phone site loses to A on every point. A bundled web build in a shell
  fails on iOS, which blocks the session cookie of another site.
- **Reason of the user:** none given. The user asked on 23 November 2026
  whether F also works with the Mac app. It does: the Electron main process
  stays, and only the page changes.

### 2. Choose which events send a notice

- **Chosen:** A, by the user on 23 November 2026. A notice goes out only
  when work waits for a person: an approval, a secret request, or a
  question from the agent. A notice also goes out when a turn that the
  member started ends or fails.
- **Other options:** B, also every turn end and failure in each workspace
  that the member owns. C, A as the default, with a choice of events in
  Settings.
- **Replaces:** Secrets decision 13 A of `plans/agent-secrets.md`, "no
  notice, for now", for secret requests.

### 3. Limit what the lock screen shows

- **Chosen:** A, by the user on 23 November 2026. A notice shows only the
  workspace name and the kind of event, such as "Needs approval". It holds
  no agent text.
- **Other options:** B, A plus the first line of the agent's question. C, a
  notice with no text.

### 4. Add account deletion inside the app

- **Chosen:** A, by the user on 23 November 2026. The Account page gets
  "Request account deletion", and operators complete each request.
- **Other options:** B, full self-service deletion.
- **Open check:** Apple's text must accept a request flow that the app
  starts. Milestone 2 checks it.

### 5. Choose the push delivery service

- **Chosen:** B, by the user on 23 November 2026. The Worker sends notices
  through Expo's push service. The Privacy page names Expo as a processor.
- **Other options:** A, FCM for both platforms. C, APNs and FCM directly
  from the Worker.

### 6. Start shared components now or later

- **Closed** by the user on 23 November 2026: "already done on main".
  Pull request #661 moved the shared UI into `src/ui/`. The port of the
  views in this plan covers the views that still redraw the markup of a
  mockup part, such as `src/shell/settings/SecretRow.tsx`.

### 7. Choose the order of the migration

- **Chosen:** E, by the user on 23 November 2026. The views move first,
  area by area, inside the Vite build. The phone apps start when the core
  areas are ported. The build moves to Expo last. The app keeps its own
  router: `parseRoute`, the `routes.*` builders, and the `Navigation`
  interface. Expo Router gets one catch-all route.
- **Other options:** A, the same order with a move of every route to Expo
  Router. B, the build and the router first. C, the phone apps first, with
  Expo DOM components for the views that are not ported. D, A with a switch
  of the web build by group of users. F, the core areas for the phones
  first.
- **Recommendation:** E, after the options check. The first one was A.

### 8. Choose how the phone apps sign in

- **Chosen:** C, by the user on 23 November 2026. GitHub sign-in runs in
  the system browser with a one-use handoff and a verifier. The exchange
  gives a bearer token and a refresh token, which the phone keeps in secure
  storage. A refresh keeps the phone signed in for up to 30 days. Each
  refresh checks the revision of the Terms.
- **Other options:** A, a bearer token with a 7-day session, which was the
  recommendation. B, a phone cookie with a fixed `Origin`. D, A with a
  token bound to a device key.
- **Changes:** the 7-day limit of `docs/protocol/access-and-security.md`
  stays for the browser and the Mac app. Phones get 30 days.

### 9. Choose the style layer of the shared views

- **Chosen:** D, by the user on 23 November 2026. The shared views use the
  primitives seam of `@firna/ui`, which `futex-ai/ui` exports as a public
  entry. They use React Native styles with the tokens of `src/ui/design/`.
  On the web they draw through the DOM backend of `@firna/ui`. The web app,
  Vitest, and Mokly need no React Native Web.
- **Other options:** A, React Native Web. B, a style library that writes
  CSS. C, CSS Modules on the web and native styles on the phones. E, React
  Strict DOM.
- **Recommendation:** D, after the options check. The first one was A.
- **Asked again** on 23 November 2026, when the user asked whether a tool
  converts CSS to React Native. The options check added F, G, H, and I.
- **Chosen:** H, by the user on 23 November 2026. D stays, with a
  converter script under `tools/`. In each port milestone, the script
  writes a first draft of the React Native styles of the area from its CSS
  Modules, with theme lookups for the tokens. It lists each rule that it
  cannot convert, and a person ports those rules by hand.
- **Other options of the second round:** F, the CSS Modules compiled for the
  phones with `react-native-css`. G, our own converter at build time. I,
  phone screens only at first.
- **Risks that the user accepted:** the output can differ from the mockup
  in layout, text styles, and class order. Screenshot comparisons of the
  mockups find this. Layout rules, hover, focus, and container widths stay
  work by hand.

### 10. Choose where the phone apps build

- **Chosen** by the user on 23 November 2026: "release mobile with
  desktop". The release workflow `.github/workflows/release.yml` builds,
  signs, and uploads the phone apps at each release-please release, beside
  the Mac app. This is my reading of the answer: the builds run in GitHub
  Actions, and a GitHub environment holds the keys, as option B says.
- **Other options:** A, EAS for each pull request and each release. C, B
  with EAS Update. D, Linux checks on each pull request and releases on
  EAS, which was the recommendation. E, Xcode Cloud for iOS.
- **Then asked:** the check of each pull request on the phones, in
  decision 13.

The options checks of decisions 7 to 13 are in
`.context/universal-expo-app/options-check.md` and
`.context/universal-expo-app/options-check-2.md`.

### 11. Choose how the work reaches main

- **Chosen:** A, by the user on 23 November 2026. The branch of this plan
  is its primary branch. Nested workspaces merge into it, and one pull
  request merges it into `main` at the end.
- **Other options:** B, a pull request to `main` for each milestone, which
  was the first recommendation. C, a primary branch that merges into
  `main` after each group of milestones, which was the recommendation after
  the options check.
- **Consequence:** the whole migration reaches production in one deploy.
  Decision 7 E keeps each step working, so the primary branch can merge
  `main` and pass the gate at any time.

### 12. Stop new HTML views during the port

- **Chosen:** A, by the user on 23 November 2026. No new rule. Each port
  milestone also ports the views that other work added to its area.
- **Other options:** B, a lint rule for the folders of each ported area,
  which was the recommendation. C, a written rule in `CLAUDE.md` and the UI
  README.

### 13. Check each pull request on the phones

- **Chosen:** A, by the user on 23 November 2026. No phone check runs on a
  pull request. The release build of decision 10 finds each break.
- **Other options:** B, an export and a type check on Linux. C, B with
  native builds when the native inputs change. D, native builds on each
  pull request. E, C with an Android start-up test, which was the
  recommendation. F, C with native builds that do not block.

## Design calls

Each call is mine, made on 23 November 2026.

- **Expo SDK 58.** It brings React Native 0.88.1, React 19.3.0, and React
  Native Web 0.21.4. Reason: it is the newest SDK, and it keeps React 19.3.
  An older SDK would move the production app back to React 19.2.
- **`@firna/ui` first.** `@firna/ui` 5.1.0 accepts React Native from 0.83
  to below 0.86. A `futex-ai/ui` change widens the range before the native
  apps build. Reason: the library is the base of every view.
- **The Expo app lives in a new package, `expo/`,** beside `desktop/`. It
  imports the shared code from `src/`. Reason: the root package also builds
  the Worker, and a separate package keeps the native dependencies out of
  the Worker build.
- **Addresses stay the same.** Each address that `parseRoute` reads today
  keeps its meaning under Expo Router. Reason: chats, GitHub comments, and
  emails hold these links.
- **The Worker builds on its own** and serves the Expo web export as its
  static assets. Reason: Metro does not build Workers.
- **The composer and the terminal stay web code.** On the phones they run
  as Expo DOM components, with the Lexical composer and xterm. Reason: they
  keep mentions, chips, and the terminal working, and no native editor or
  terminal of equal scope exists.
- **Previews open in the in-app browser** with the 60-second grant, as the
  Mac app opens them in the browser. The desktop stream does the same.
  Reason: code in a preview never runs with the app session. The app
  hides Desktop from every user today, as `app/tools/desktop` says, so the
  stream follows only when Desktop returns. The stream address today is
  an address of the provider with a 10-minute token, from
  `worker/desktop/handler.ts`. The bar of the in-app browser would show
  that host, so the return of the stream on a phone needs a grant on the
  preview domain first.
- **The page gets no bridge to native code on the Mac.** The Mac main
  process does not change.
- **Phones follow the phone mockups.** Reason: decision 15 A of
  `plans/boat-native-remote-workspaces.md` already made them the spec.
- **Old copies keep working.** Store apps follow the same rule as the Mac
  app. An app below the minimum version shows "Update the app".
- **Tests:** Vitest draws the shared views in happy-dom through the DOM
  backend of `@firna/ui`. No phone check runs on a pull request, as
  decision 13 A says. The release builds run the phone code first.
- **Mockups:** Mokly draws the shared views through the DOM backend.
- **Google Play:** the app ships from an organization account. Reason: a
  personal account created after 13 November 2023 needs a closed test with
  12 testers for 14 days first.
- **No pricing or checkout** shows in the phone apps.
- **Apple guideline 4.8:** the app submits with GitHub-only sign-in, as a
  client of a third-party service. If Apple refuses, this becomes a
  decision.
- **Phone tokens.** The bearer token lasts 15 minutes. Each refresh gives
  a new refresh token and ends the old one. A second use of an old refresh
  token ends the session. A refresh token ends 30 days after the sign-in.
  A refresh with a new revision of the Terms fails, and the phone shows
  the sign-in with the agreement. A suspension ends the session at once.
  Reason: the common pattern for native apps, and it keeps decision 126.
- **A failed phone build at release skips only the phone upload.** The Mac
  release goes on, and the release reports the failure. Reason: a phone
  problem must not block the Mac app.
- **Phone releases follow the Mac releases.** Each release uploads the
  phone apps to TestFlight and to the internal track of Google Play. A
  person then sends them to the stores, as a person publishes the draft
  release of the Mac app. Reason: one version for every client.
- **Store accounts:** the user gives the Apple and Google developer
  accounts, the publisher name, and a GitHub account with app access for
  App Review. Milestone 22 waits for them.

The mockups of Milestone 1 added these calls, also mine, on 23 November
2026. `docs/mockups/phone-app.md` gives the pages that show them.

- **The phone apps in the mockups.** The catalogue gets a `phone-app`
  folder beside `mac-app`, for the states that only the phone apps have.
  Its desktop views show a tablet, which follows the desktop layout. The
  surfaces of the system follow iOS. Reason: a tablet is the only wide
  screen of a phone app, and Android uses the same words.
- **Sign-in in the auth session of the system.** The phone apps open
  GitHub with ASWebAuthenticationSession on iOS and with Custom Tabs on
  Android. iOS first shows its alert that the app wants to use the domain
  of the app to sign in. A close of the sheet returns to the start with no
  error. The errors of the GitHub step show in the sheet, as the Mac app
  shows them in the browser. Reason: the common pattern for native apps,
  from RFC 8252. The person stays in the app, the session reports a
  cancel, and it shares the sign-in of the system browser.
- **A phone session that ends** shows "Sign in again" with the agreement
  to the current Terms. The words hold for each cause: the end of the 30
  days, a new revision of the Terms, and a suspension.
- **The minimum version.** Each platform has its own minimum version. It
  rises only after the store of that platform offers a newer version. The
  app checks its version at each start, before the sign-in. Reason: a
  minimum above the version in the store locks people out, and a check
  after GitHub wastes the sign-in.
- **Offline.** The offline page shows only when the app starts without a
  connection and has nothing to show. A later drop keeps the open view,
  and each view shows the failure that it shows in a browser.
- **The ask for notices.** The phone app asks once, after the member sends
  the first message of a turn in the app. The ask lies over the workspace.
  Preferences of the phone app gets a Notices section: on, off after Not
  now, or off in the settings of the device. Reason: a notice first helps
  then, and the system lets the app ask only once. Android 12 and older
  have no permission, so there the same ask decides whether the app
  registers for notices.
- **The words of a notice.** Under the workspace name, a notice says
  "Needs approval", "Needs a secret", "Needs an answer", "Turn finished",
  or "Turn failed". A press opens the workspace. Only the Mac app can
  allow a command on the Mac, so the phone shows that request without its
  choices, as the web app does. The phone notice still goes, beside the
  notice of macOS, because the member can be away from the Mac.
- **Who gets a notice.** A notice of work that waits goes to the member
  who sent the turn, as the notice of a turn that ends does. No notice
  shows while the app shows that workspace. Reason: decision 2 A chose
  the fewest notices, and only the sender can allow a command on their
  Mac.
- **Previews in the phone apps.** The Preview tool of a phone app shows no
  page in a frame. Each port and each service opens its preview in the
  in-app browser.
- **Terms and Privacy in the phone apps.** The phone apps open Terms and
  Privacy in the in-app browser, on pages of the app host. These pages
  show the shared legal text with no site header, no site footer, and no
  wordmark link. Reason: the frame of the legal pages of the site links
  Pricing, and no pricing shows in the phone apps.
- **The deletion request in the mockups.** Each General tab of the
  Account ends with Delete account and Request account deletion. A
  question asks first. After the request, the section gives its day. What
  the person may do and learn until the deletion is complete waits for
  the user.
- **The Deletions tab.** The operator section gets a Deletions tab after
  Waitlist. It lists the requests that wait, oldest first, with the person
  and the day. A row opens the page of the user, which shows the request.
  The tab shows no email address, as
  [Operator section](../docs/protocol/operator-section.md) says.

## Milestone 0: The flow to main

Depends on: none

- [x] Add the primary branch, `calummoore/expo-mobile-version-4fjt`, to
      the push trigger of `.github/workflows/ci.yml`, as decision 11 A
      says.
- [ ] Merge `main` into the primary branch before each nested workspace
      starts, with the `git-merge` skill.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The phone mockups already show every screen. This milestone adds the
states that only the native apps and the new decisions have.

- [x] Draw phone sign-in in the system browser: start, wait, failed
      handoff, and signed in. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw the ask for notice permission, and the denied state. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw a notice on the lock screen for each event of decision 2, with
      the text of decision 3. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw "Request account deletion" on the Account page: the button, the
      confirm dialog, and the requested state, on phone and desktop.
      Branch: `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw the list of deletion requests in the operator section. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw the "Update the app" screen and the offline screen. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Draw a preview and the desktop stream in the in-app browser.
      Branch: `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Branch:
      `calummoore/universal-expo-app-milestone-1-mockups-emjd`.

The reports, the checks, and the screenshots of this milestone are in
`.context/universal-expo-app/m1/`. Five questions that the mockups found
wait for the user, in the pull request of this branch: deletion on the
waitlist, the question event of decision 2, the time until a deletion,
the orgs of an only admin, and how an operator completes a request.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/phone-app.md`: the platforms, the native parts,
      previews, updates, the minimum version, and old copies. Give each
      platform its own minimum version, which rises only after the store
      of that platform offers a newer version. The app checks its version
      at each start, before the sign-in.
- [ ] Write `docs/protocol/phone-sign-in.md` from decision 8 C. Add the
      30-day phone session to `docs/protocol/access-and-security.md`. The
      auth session opens an address of the app first, so that the alert
      of iOS names the app and not GitHub. Say what the auth session shows
      when the app does not know the current revision of the Terms.
- [ ] Write `docs/protocol/notifications.md` from decisions 2, 3, and 5.
- [ ] Update `docs/protocol/secret-requests.md` for notices, from decision 2.
- [ ] Update `docs/protocol/waitlist.md` and
      `docs/protocol/access-and-security.md` for the deletion request.
      Check Apple's text against a request flow first.
- [ ] Add the Deletions tab to `docs/protocol/operator-section.md`, as
      `app/operator/deletions` shows.
- [ ] Update `docs/architecture.md` and `docs/architecture/` for the new
      clients, the Expo build, and the push sender.
- [ ] Read the Terms and the Privacy page in full. Update each sentence
      that restates a changed fact. Name Expo as a processor. Set the
      effective date when the Terms text changes. The pages tell people to
      write to the legal address for a deletion today. Name the request
      on the Account page, and keep the address for a person who cannot
      sign in.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Add a guide for the phone
      apps.
- [ ] Update each follow-up item that names Secrets decision 13.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Widen the React Native range of `@firna/ui`

Depends on: none

- [ ] In `futex-ai/ui`, accept React Native 0.88 and Gesture Handler 3.3.
      The ranges of React Native SVG and Reanimated already accept Expo
      SDK 58. Run its checks and publish a release. Branch: in a nested
      workspace on `futex-ai/ui`.
- [ ] Export the primitives seam as a public entry in the same release,
      as decision 9 D says.

## Milestone 4: Move Conductive to the new `@firna/ui`

Depends on: 3

- [ ] Move `@firna/ui` from 4.0.0 to the release of Milestone 3. Apply the
      breaking changes of 5.0.0 to the app and the mockups.
- [ ] Check whether `.npmrc` still needs `legacy-peer-deps=true`, and keep
      it while it does.
- [ ] Run the complete gate.

## Milestone 5: Push notices in the Worker

Depends on: 2

- [ ] Add a D1 table of push tokens per user and device, with a
      migration that the previous Worker accepts.
- [ ] Add routes to register and remove a token for the signed-in user.
- [ ] Send notices through Expo's push service for the events of
      decision 2, with the text of decision 3. Remove each token that the
      service refuses.
- [ ] Add tests with a fake push service.

## Milestone 6: Phone sign-in in the Worker

Depends on: 2

- [ ] Add the phone handoff and exchange of decision 8 C, beside
      `worker/security/desktop-auth.ts`.
- [ ] Add the refresh route: rotation, reuse detection, the 30-day limit,
      and the check of the Terms revision.
- [ ] Accept the bearer token in `worker/security/gate.ts` for a request
      with no cookie. Keep the browser and Mac rules as they are.
- [ ] Serve the universal link files for app addresses.
- [ ] Add tests for the exchange, the gate, the refresh, a reused refresh
      token, a new Terms revision, and an expired credential.

## Milestone 7: Deletion requests in the Worker

Depends on: 2

- [ ] Record a deletion request for the signed-in user, with a migration
      that the previous Worker accepts.
- [ ] List the requests in the operator API.
- [ ] Add tests.

## Milestone 8: Deletion requests in the app

Tags: ui

Depends on: 1, 7

- [ ] Add "Request account deletion" to the Account page, as the mockup
      shows.
- [ ] Add the list of requests to the operator section.
- [ ] Add tests.

## Milestone 27: The style converter

Depends on: none

This milestone comes before Milestone 9. It has the number 27, so that the
other numbers stay.

- [ ] Add the converter script of decision 9 H under `tools/`, with
      Lightning CSS and `css-to-react-native` as development dependencies.
- [ ] Write theme lookups for each `var()` token, not fixed values.
- [ ] List each rule that the script cannot convert: grid, pseudo-elements,
      combinators, element selectors, hover, focus, container queries,
      `calc()`, `em`, `rem`, and each view that joins two classes on one
      element.
- [ ] Add tests for the script.

## Milestone 9: The base of the shared views

Tags: ui

Depends on: 4, 27

- [ ] Write the shared views on the primitives seam of `@firna/ui`, as
      decision 9 D says. On the web they draw through its DOM backend.
- [ ] Give the views React Native styles with the tokens of
      `src/ui/design/`. Give hover, width layouts, and container widths a
      rule that every view uses.
- [ ] Port the common parts of `src/ui/components/common/` and their
      mockups. Keep the look of each mockup.
- [ ] Draw the ported parts in Mokly.

## Milestones 10 to 20: Port each area of the app

Tags: ui

Depends on: 9

Each area is its own milestone, so that each one keeps the product working. Each one
ports the views of the area, their shared parts in `src/ui/`, their mockup
screens, and their tests. It also ports each view that other work added to
the area, as decision 12 A says. The look of each mockup stays. Each one
runs the converter of Milestone 27 first, and ports the listed rules by
hand. Each one compares the screenshots of its mockups before and after
the port.

- [ ] Milestone 10: the org rail, the workspace list, and the sections.
- [ ] Milestone 11: the workspace bar, the tab row, and the GitHub banner.
- [ ] Milestone 12: the chat transcript, the markdown, and the tool rows.
- [ ] Milestone 13: the composer frame. The Lexical field stays web code,
      as the design calls say.
- [ ] Milestone 14: Files and the file preview.
- [ ] Milestone 15: Terminal and Preview frames. xterm and the frames stay
      web code.
- [ ] Milestone 16: New workspace, the command palette, and the menus.
- [ ] Milestone 17: Settings and Secrets.
- [ ] Milestone 18: Account, members, invitations, and onboarding.
- [ ] Milestone 19: Automations and capabilities.
- [ ] Milestone 20: Sign-in, the waitlist, Get started, and the operator
      section.

## Milestone 21: The native services

Depends on: 5, 6, 9

- [ ] Create the `expo/` package with Expo SDK 58 and Expo Router.
- [ ] Implement `AppServices` for the phones: requests with the bearer
      token and the refresh of decision 8 C, sockets, secure storage,
      focus, visibility, links, and the clipboard.
- [ ] Register for push notices, and open the workspace of a tapped notice.
- [ ] Open previews in the in-app browser with the grant. Open the
      desktop stream in the same way only when Desktop returns to the app,
      as `phone-app/browser/desktop` shows.
- [ ] Add the minimum version check.

## Milestone 22: The phone apps

Tags: ui

Depends on: 8, 10, 11, 12, 13, 18, 20, 21

The phone apps need the waitlist of Milestone 20 for a new user, and the
deletion request of Milestone 8 for the store rules.

- [ ] Draw the ported areas in the phone apps. Areas that are not ported
      yet stay out of the phone apps until their milestone.
- [ ] Add sign-in, the notice permission, "Update the app", and the
      offline screen, as the mockups show.
- [ ] Show the waitlist and the sign-in of a join link in the frame of a
      phone app, with no link to the home page or the pricing page of the
      site, as `docs/mockups/design.md` says for `SignInFrame`.
- [ ] Build the pages of Terms and Privacy for the phone apps on the app
      host, with no site header and no site footer, and open them in the
      in-app browser, as `phone-app/browser/terms` shows.
- [ ] Give the page after a GitHub App install words that fit a phone
      app. Its words in `src/ui/screens/githubSetupCopy.ts` send the
      person back to the Mac app. The Worker shows the same page to each
      client.
- [ ] Build, sign, and upload both apps in `.github/workflows/release.yml`
      at each release, beside the Mac app, as decision 10 says. Keep the
      keys in a GitHub environment. Check that the Mac runner has Xcode
      26.4 or newer.
- [ ] Test the first release build of both apps on a device before the
      upload. No pull request checks the phones, as decision 13 A says.
- [ ] Submit both apps for review.

## Milestone 23: Expo Router on every platform

Depends on: 10 to 20

- [ ] Give Expo Router one catch-all route, and serve `parseRoute` through
      a `Navigation` over Expo Router, as decision 7 E says.
- [ ] Keep each address. Move each test of the navigation.

## Milestone 24: The Expo web build

Depends on: 23

- [ ] Build the web app with the Expo web export, and the Worker on its
      own.
- [ ] Move `dev`, `build`, `build:bundle`, `preview`, the deploy workflow,
      the CI workflow, and the marketing pictures to the new build.
- [ ] Move the Mac renderer to the Expo web export. Keep the main process.
- [ ] Copy the Astro site in `public/_site/` into the Worker assets, as
      Vite does today. It holds the Terms consent page of sign-in.
- [ ] Check the content security policy, the Mac custom address, and the
      Mac smoke tests.

## Milestone 25: Delete the old ways

Depends on: 24

- [ ] Delete the CSS Modules, the browser `Navigation`, the Vite web
      build, the converter of Milestone 27, and each part that existed only
      for them.
- [ ] Update `CLAUDE.md`, `AGENTS.md`, and each README for the new
      commands.

## Milestone 26: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the complete gate, and the Rust checks named
      in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says,
      under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Send a test notice to a phone from production.
- [ ] Sign in on a phone against production.
