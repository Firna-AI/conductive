# Mac app downloads

Status: Active. On branch `calummoore/desktop-app-website-mention`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The marketing site at `conductive.build` does not mention the Mac app, and
no public place serves its builds. The site spec still says that the page
shows no desktop app. That rule came from Milestone 1c of
[the earlier plan](boat-native-remote-workspaces.md) on 5 November 2026,
which left out each claim that no decision covered. Decision 62 of that
plan chose the Mac app one day later. Pull request #69 added signed and
notarized release packages on 8 November 2026. Its release job keeps them
only as Actions artifacts of the private repository, for 14 days.

This change adds a Mac app section with a real picture to the home page.
The section links a notarized download for Apple silicon and for Intel.
The release job publishes each version tag to the GitHub releases of the
public repository `Firna-AI/conductive-desktop`, and release builds turn
on the updater. The change does not cover builds for other systems. It
also does not cover a link to the Mac app in the web app, which
[a follow-up item](follow-ups/mac-app-link-in-web-app.md) records. Two
more follow-up items record old copies that call a changed Worker API,
[in this item](follow-ups/old-mac-app-copies-and-api-changes.md), and the
missing result of Check for updates in the menu,
[in this item](follow-ups/update-check-menu-result.md).

Contract owners:

- [Mac app](../docs/protocol/desktop-app.md), section "Packages and updates".
- [The marketing site mockups](../docs/mockups/marketing-site.md).
- The [marketing site README](../src/marketing/README.md).
- The [desktop README](../desktop/README.md).
- The [architecture doc](../docs/architecture.md).

## Decisions

### 1. How visitors learn about the Mac app and get it

- **Chosen by the user on 8 November 2026:** C.
- **Severity:** Medium. **Effort:** Large.
- **Source:** Design, from the user's message on 8 November 2026: "website does not mention the desktop app".
- **Category:** Docs or spec.
- **Location:** `docs/mockups/marketing-site.md:39`, the rationale of `docs/mockups/src/entries/marketing/index.mockup.tsx`, `src/marketing/features.ts:25`, `src/marketing/home.ts:21`, and `desktop/electron-builder.yml:26`.
- **Terms:**
  - **Release repository:** the public repository `Firna-AI/conductive-desktop`. The updater reads new versions from its GitHub releases. It does not exist yet.
  - **Actions artifact:** a file that a GitHub Actions run keeps for 14 days. Only people with access to the private repository can download it.
  - **Notarization:** Apple's check of an app with a Developer ID signature. A notarized download opens without the macOS warning.
  - **Universal package:** one app that runs on Apple silicon and on Intel, about twice the size of a package for one chip.
- **Background:** The home page has a hero, six feature sections with real screens, a grid of smaller features, and a footer. Each claim on the page must be one that a plan decides. The Mac app is built, with its window, its sign-in, and Mac commands. Each copy bundles the web app, so it must also get new versions. The run for the tag `v0.1.0-alpha.1` made notarized DMG and ZIP files for both chips, which expire on 22 November 2026.
- **Problem:** The site does not name the Mac app, and its spec still forbids that claim. Visitors have no public place to download the notarized files. The release repository does not exist, so the updater stays off.
- **Impact if no action:** Visitors do not learn that a Mac app exists, and nobody outside the team can install it. This includes users who leave Conductor Cloud before it shuts down on 20 November 2026.
- **Root question:** How do visitors of `conductive.build` learn about the Mac app, and how do they get it and its new versions? The options check added "and its new versions", because each copy bundles the web app.
- **Options:**
  - **A.** Mention the app now, and add the download later. A Mac app section with a real picture says that the Mac app is coming soon. Cost: visitors cannot get the app, but a notarized build exists. Effort: Medium.
  - **B.** Do A, and offer the current ad-hoc build for download. Cost: macOS warns on the first open, and the build cannot update itself. Left out on 8 November 2026, after pull request #69: C is better on every point, because notarized builds exist. Effort: Large.
  - **C.** Do A, and offer the notarized download. Create the release repository. The release job attaches the signed files to a GitHub release there for each version tag. The site links "Download for Mac" for Apple silicon and for Intel. The updater turns on, so each copy updates itself. The user creates the public repository and a publish token. Effort: Large.
  - **D.** Do C, but the user uploads the first version by hand, from the files of one tag run. A later change moves the upload into the release job. Gain: the first download does not wait for the publish step and its tests. Cost: each release needs the user until that change, and one wrong file in a hand-made release can break the updates of every copy. Effort: Large.
  - **E.** Do C, and stop the class. Reword the claim rule of `docs/mockups/marketing-site.md` and of the rationale of the marketing mockup entry: the page claims a feature only when a protocol doc states it, and it shows no customer logos, testimonials, user counts, or certifications. Extend the rule of `AGENTS.md` that sends each changed protocol fact to the legal pages, so that it also names the claims of the home page. Cost: the rule loses its named warnings against an API, a native phone app, other agents, and a changelog, and the general rule must cover them. Effort: Large, as for C. The rewording and the rule add less than an hour.
  - **F.** Do C, but with one universal package and one "Download for Mac" button. Gain: the visitor does not choose a chip, and the release job notarizes one app and one DMG. Cost: each download and each full update is about twice the size, about 260 MB. The protocol line about one package for each chip changes. Effort: Large.
  - **G.** Serve the downloads and the update feed from a public Cloudflare R2 bucket on a product domain, such as `download.conductive.build`. The updater reads it through its generic provider. Gain: no public repository, and the downloads use the product's domain. Cost: a new bucket, a Cloudflare token in the `desktop-release` environment, a file or a redirect for the fixed addresses, and a change of the feed in the protocol. Effort: Large.
  - **H.** Keep the releases in `Firna-AI/remote-code`, and let the Worker send each download and update check to a short-lived GitHub file address. Gain: no public repository, and no publish token in CI. Cost: the production Worker holds a token that can read the private source code, and each download costs a GitHub API call against its rate limit. Effort: Large.
- **Left out:**
  - Change nothing: the gap that the user reported stays.
  - Link the Actions artifacts: only members of the private repository can download them, and they expire after 14 days.
  - GitHub releases in the private repository without a Worker route: visitors cannot download them.
  - The Mac App Store: its app sandbox blocks Mac commands, which run shell commands.
  - A script that detects the chip: the site runs no script, and Safari does not report the chip.
  - The `Sec-CH-UA-Arch` header, in which a browser can name the chip: Safari and Firefox do not send it, so it cannot replace the two buttons.
  - Notarized downloads with the updater off: each copy keeps its old bundled web app when the Worker API changes.
  - Static files of the Worker: each package is about 130 MB, and a static file of a Worker can be at most 25 MiB.
  - A Homebrew cask: it fails the goal for visitors who do not use Homebrew. Next to C, it answers another question.
- **Wider fix:** E. In this class of problem, a decision adds or changes a feature, and a public text keeps the old claim. The class came back four times: the Boat account claim, two legal page findings, and this rule.
- **Previous examples:** Milestone 4f of the earlier plan removed the Boat account claim from the site after decision 80. Finding 6 of pull request #46 and finding 8 of pull request #45 found stale legal pages. Mokly publishes its desktop pre-releases in the public repository `mokly-ai/mokly-desktop`, with a fine-grained token, but its site does not link them.
- **Recommendation:** E, from the options check on 8 November 2026. It keeps all of C and adds less than an hour of text against a class that keeps coming back. The first recommendation was A, and the second was C, after pull request #69 added notarization.
- **Action:** the user chose C on 8 November 2026. The options check then recommended E, which waits for the user, because it deletes named rules of the site spec.

### 2. How a copy that cannot install updates gets new versions

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Design, from the options check of decision 1 on 8 November 2026.
- **Category:** Product bug.
- **Location:** `desktop/src/updates.ts:54`, `desktop/src/main.ts:150`, and the section "Packages and updates" of `docs/protocol/desktop-app.md`.
- **Terms:**
  - **Disk image:** the DMG file that a visitor downloads. macOS opens it as a read-only volume, with the app and a link to the Applications folder.
  - **Squirrel.Mac:** the installer that electron-updater uses on a Mac. It replaces the app with the downloaded version. It refuses a copy on a read-only volume.
- **Background:** The updater downloads each new version, and Squirrel.Mac installs it when the app quits. A copy that runs from the open disk image cannot update. macOS also runs an unzipped app from a random read-only path until the user moves it. The protocol says that a failed update check shows no error. electron-updater 6.8.9 reports a download before Squirrel.Mac takes the file, and the app then offers "The update is ready." with Restart now.
- **Problem:** Nothing tells a user whose copy cannot install updates. On such a copy, the app says that the update is ready, but Restart now does nothing.
- **Impact if no action:** That user stays on an old version, with a false message at each launch, and the old copy can break when the Worker API changes.
- **Root question:** How does a copy that cannot install updates where it runs get new versions? The options check changed the first question, which named the Applications folder, because a copy on the Desktop can update.
- **Options:**
  - **A.** Change nothing. The disk image shows the app beside a link to the Applications folder, which tells most users to drag the app there. Effort: Small.
  - **B.** When a packaged copy starts outside the Applications folder, offer Move to Applications and Not now, once for each launch. Move uses Electron's `app.moveToApplicationsFolder()`, which moves the app and starts it again. Cost: it also asks a copy on the Desktop, which can update, and the packaged smoke tests. The false message stays after Not now. Effort: Small.
  - **C.** Do B, and when the user picks Not now, show in the app menu that updates need the app in the Applications folder. Effort: Medium.
  - **D.** Fix the update step, and ask only when an update cannot install. Offer Restart now only after Squirrel.Mac has the update. When the install fails, tell the user once for each version: outside an Applications folder, offer Move to Applications and Not now. Elsewhere, offer Download, which opens the Mac app section of the site. A failed update check stays silent. Cost: a copy on the disk image learns of the problem only when the first new version comes. Effort: Medium.
  - **E.** Do D, and also ask at launch when a packaged copy starts from a read-only volume: Move to Applications and Not now, once for each launch. A copy on the Desktop gets no prompt. Effort: Medium.
  - **F.** Do D, and require a writable place at launch. A copy on a read-only volume offers only Move to Applications and Quit. Cost: nobody can try the app from the disk image, and Move can need an admin password that the user does not have. Effort: Medium.
  - **G.** Do D, and move a copy on a read-only volume without a prompt. Cost: the app changes the user's files without asking, and Electron moves an older or newer copy with the same name to the Trash. Effort: Medium.
- **Left out:**
  - An installer package: it needs another Apple certificate, and a copy that it installs as root asks for an admin password at each update.
  - A custom updater that installs into the Applications folder: a move and then the normal update give the same result, and they keep the signature check of Squirrel.Mac.
  - A notice in the page of the web app: the page has no bridge to the main process, by decision 62, so it cannot know where the copy runs.
  - Hints only, on the site, on the release page, or in the disk image: a copy can still run from the disk image.
  - A rule in the Worker: it cannot move or update a copy. [The follow-up item for old copies](follow-ups/old-mac-app-copies-and-api-changes.md) holds the version rule.
- **Wider fix:** D. It acts on the result of the install, so it still works when the cause changes, for example a folder without write access. E, F, and G contain it.
- **Previous examples:** None found in this repository or in Mokly's desktop app. Electron Fiddle asks to move to the Applications folder at its first run.
- **Related:** The option A of [the follow-up item for old copies](follow-ups/old-mac-app-copies-and-api-changes.md) offers Restart now. It needs the working install step of D.
- **Recommendation:** E, from the options check on 9 November 2026. It removes the false message, and it asks only a copy that cannot update, at launch and with each new version. The first recommendation was B.
- **Action:** ask the user, because the prompts add user-visible behaviour that no requirement covers.

## Design calls

Agent calls on 8 November 2026:

- Scope: only the marketing site. Reason: the user named the website.
- Name: "Mac app", as the texts of the app say, for example in
  `src/chat/device/command-text.ts`.
- Placement: one feature section, plus short mentions in the hero, the
  page description, and the footer. The header and the footer link the
  section. Reason: one section can hold the facts and both downloads, and
  the site keeps a few static pages.
- Picture: a real screen of `MacAppScreen` in the mockups, with the window
  buttons and a command request that waits. Reason: each picture of the
  site is a real screen of the catalogue.
- Spec: remove the desktop app from the list of claims that the page
  leaves out. Reason: decision 62 decides the Mac app.
- No early-version label on the section. Reason: the web app shows no such
  label either, the copy rules of the `product-ui` skill keep a limit out
  of headlines, and the release page on GitHub names the version.
- Oldest macOS version: the section and the protocol name the oldest macOS
  version that a release build accepts. Reason: a visitor on an older
  version must not download a DMG that does not open.
- Legal drafts: the Privacy draft adds the data of the Mac app. The Terms
  draft names the Mac app in its description of the service, and adds a
  draft field for Mac commands. Reason: decision 35 makes the drafts
  restate the facts of the protocol docs, and neither page names the Mac
  app.
- Copy: the words of the section go into `src/marketing/features.ts`,
  which the site and the mockups both read. Reason: since pull request
  #72, that module is the one source of the feature texts.
- Download addresses: publish each version as the latest GitHub release,
  with a fixed file name for the DMG of each chip, such as
  `Conductive-mac-arm64.dmg` and `Conductive-mac-x64.dmg`. Then
  `https://github.com/Firna-AI/conductive-desktop/releases/latest/download/<name>`
  always gives the newest build. Reason: the site runs no script,
  GitHub's "latest" address skips pre-releases, and
  `desktop/electron-builder.yml` now marks each release as a pre-release.
- One source: one module under `docs/mockups/src/`, which imports nothing,
  holds the release repository and the fixed file names. The mockups, the
  site, and `desktop/scripts/release.ts` read it. Reason:
  `docs/mockups/src/brand.ts` and `marketingPictureList.ts` already work
  this way, so no copy can go stale.
- Two buttons, with Apple silicon first. Reason: the protocol has one
  package for each chip, and most current Macs have Apple silicon.
- Publish only from a version tag that matches the package version. A
  manual run keeps building Actions artifacts only. Reason: the updater
  finds each release by `v<version>`, and a manual run must not publish by
  accident.
- Publish append-only, and check the final file list, as Mokly's publisher
  does. Reason: a replaced file can break a download or an update that
  already started.
- Publish through a draft. The job creates the release as a draft, uploads
  the files, checks them, and then makes the release public and the
  latest. Reason: otherwise the "latest" address and the update feed can
  point to a release whose files are not there yet.
- Files: the DMGs, the ZIPs, the ZIP block maps, and `latest-mac.yml`. No
  DMG block map. Reason: stapling changes each DMG after electron-builder
  makes its block map, as `desktop/README.md` says.
- Token: a fine-grained token with contents write on the release
  repository only, as the secret `DESKTOP_RELEASES_TOKEN` of the
  `desktop-release` environment. Reason: Mokly uses the same kind of
  token, and the GitHub token of an agent session cannot reach secrets.
  Risk: the token belongs to one person, so publishing stops when it
  expires or its owner leaves the org. The job then fails with a clear
  error, and a new token fixes it. A GitHub App token avoids this risk,
  at a larger setup.
- On a tag run, the release credential check also requires the token,
  before packaging starts. Reason: a release that cannot publish wastes
  its notarization run.
- Release repository: the user creates it with a README that links the
  site. Reason: a GitHub release needs a tag on a commit, and Mokly's
  release repository has such a README.
- Version: the first public release is `0.1.0-alpha.2`. Reason: the tag
  `v0.1.0-alpha.1` already exists, without a public release.
- Order: the first public release runs from the reviewed branch, before
  the merge. Reason: the site links must work when the site deploys.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the Mac app on the home page: a feature section with a real picture
of the Mac window and both downloads, links from the header and the
footer, and the Mac app in the hero and the footer.

- [ ] Add the module of the release repository and the fixed DMG names
      under `docs/mockups/src/`. It imports nothing.
- [ ] Add a Mac app picture to
      `docs/mockups/src/screens/marketingPictureList.ts`, with its capture
      page in `marketingPictures.tsx`. It shows a real screen of
      `MacAppScreen`: the window buttons, the sidebar, and a command
      request that waits for Allow. The phone layout shows the same file,
      because the Mac app has no phone layout.
- [ ] Add the Mac app section to `src/marketing/features.ts`, and draw it in
      `MarketingScreen.tsx`, with "Download for Mac" for Apple silicon and
      for Intel, and the oldest macOS version. Claim only what
      `docs/protocol/desktop-app.md` states.
- [ ] Add a Download link to the header and a Mac app link to the Product
      column of the footer. Both go to the section.
- [ ] Name the Mac app in the hero sentence, the page description, and the
      footer tagline.
- [ ] Remove the desktop app from the claims that the page leaves out, in
      `docs/mockups/marketing-site.md` and in the rationale of
      `docs/mockups/src/entries/marketing/index.mockup.tsx`. Describe the
      section and its downloads there.
- [ ] Update the description of that entry, which names six features and a
      header with only Sign in.
- [ ] Run `npm run mockups:check`. Smoke-test the home page at desktop and
      phone sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the public releases and the site downloads as requirements, before
the code changes.

- [ ] In "Packages and updates" of `docs/protocol/desktop-app.md`, state
      the public releases. Each version tag publishes a GitHub release in
      the release repository. It is the latest release. It has a DMG for
      each chip under a fixed name, and the files that the updater reads.
      Publishing is append-only, through a draft. Release builds turn on
      the updater. Replace "No release is published yet".
- [ ] State there that only a fine-grained token with contents write on
      the release repository publishes the files, from the
      `desktop-release` environment.
- [ ] State there the oldest macOS version that a release build accepts.
      Read it from `LSMinimumSystemVersion` in the `Info.plist` of a
      release build.
- [ ] In `docs/architecture.md`, say that the marketing site links the
      Mac app downloads.
- [ ] In the root `README.md`, replace the stale lines of "Mac app" about
      the ad-hoc signature and the missing release.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Release publishing

Depends on: 2

The release job publishes the verified packages of a version tag to the
release repository, and release builds turn on the updater.

- [ ] Give the DMG of each chip its fixed name from the shared module.
      `desktop/scripts/release.ts` reads the names from that module.
- [ ] Publish normal releases, not pre-releases, so that each new release
      is the latest release.
- [ ] Turn on the updater in the release builds that publish, with
      `CONDUCTIVE_DESKTOP_UPDATES=enabled`. Keep pull request,
      development, and manual-run builds as they are.
- [ ] After the signature and ticket checks of a version tag run, create
      the draft release `v<version>` in the release repository. Upload the
      DMGs, the ZIPs, the ZIP block maps, and `latest-mac.yml`. Check the
      files, then make the release public and the latest. Pass the
      `DESKTOP_RELEASES_TOKEN` secret as `GH_TOKEN`.
- [ ] Fail when the tag does not match the package version, when the
      release or a file already exists, or when the final file list, the
      names, or the sizes differ from the built files.
- [ ] Make `latest-mac.yml` match the published files, because stapling
      changes each DMG after electron-builder hashes it.
- [ ] Require the token with the other release credentials on a tag run,
      before packaging starts.
- [ ] Handle the download promise of each update check in
      `desktop/src/updates.ts`, so that a failed download or install does
      not become an unhandled promise rejection.
- [ ] Test the publish step with fakes, as the `testing` skill says: the
      file list, the tag check, an existing release or file, a wrong final
      list, and a missing token.
- [ ] Update `desktop/README.md`.

## Milestone 4: Updates that cannot install

Depends on: 2, and the user's answer to decision 2.

Apply the answer to decision 2. With option A, delete this milestone.

- [ ] Apply the chosen option in the main process. Test each stream of
      update events and each prompt choice with fakes.
- [ ] Check the move once on a Mac, from the open disk image, and keep the
      evidence under `.context/mac-app-downloads/`.
- [ ] State the prompts in "Packages and updates" of
      `docs/protocol/desktop-app.md`, and update `desktop/README.md`.

## Milestone 5: Marketing site

Tags: ui

Depends on: 1, 2

Build the Mac app section and its links on the site, as Milestone 1 draws
them.

- [ ] Build the Mac app section, both downloads, the oldest macOS version,
      the header and footer links, and the new copy. Read the addresses
      from the shared module.
- [ ] Capture the pictures with `npm run marketing:pictures`, and add the
      new files to `src/marketing/picture-files.ts`.
- [ ] Add or change the tests in `src/marketing/routes.test.ts` that the
      `testing` skill asks for.
- [ ] Update `src/marketing/README.md`.
- [ ] Compare each changed page with its mockup at desktop and phone
      sizes, in light and dark.

## Milestone 6: Legal drafts

Depends on: 2, 4

Add the facts of the Mac app to the Privacy and Terms drafts.

- [ ] Read both legal pages in full, as the rule of `AGENTS.md` says,
      because Milestones 2 and 4 change facts of a protocol doc. Update
      each sentence that restates a changed fact.
- [ ] In `src/marketing/privacy.ts`, add the data of the Mac app: the name
      of the Mac in each command request, the commands and their output
      that go to the agent and so to Anthropic or OpenAI, the
      always-allowed commands that stay on the Mac, the session cookie of
      the Mac app, and GitHub as the host of the downloads and the update
      checks.
- [ ] In `src/marketing/terms.ts`, name the Mac app in the opening
      paragraph and in "The service". Add a draft field for the commands
      that a user allows on their Mac.
- [ ] Check that the Terms and Privacy mockups show the new text.

## Milestone 7: Gate, push, and review

Depends on: 1, 2, 3, 4, 5, 6

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.

## Milestone 8: First public release

Depends on: 7. It also needs the repository and the token from the user.

Publish `0.1.0-alpha.2` from the reviewed branch, and check its downloads.

- [ ] The user creates the public repository `Firna-AI/conductive-desktop`,
      with a README that links the site.
- [ ] The user creates a fine-grained token with contents write on that
      repository only. The user stores it as `DESKTOP_RELEASES_TOKEN` in
      the `desktop-release` environment of `Firna-AI/remote-code`.
- [ ] Set the package version to `0.1.0-alpha.2`. Commit, push, and push
      the tag `v0.1.0-alpha.2`.
- [ ] Check that the release job passes, and that the new release is the
      latest release of the release repository, with the expected files.
- [ ] Check that both fixed download addresses give their DMG. On a Mac,
      check each DMG with `spctl` and `xcrun stapler validate`. Open the
      app, and check that it opens without a warning and signs in.

## Milestone 9: Pull request

Depends on: 8

- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Deploy the Worker. Check that the live home page shows the Mac app
      section, and that both downloads work.
- [ ] Publish the next version. Check that a copy of `0.1.0-alpha.2` in the
      Applications folder finds it, offers Restart now or Later, and
      installs it. Check that a copy that runs from the open disk image
      behaves as the answer to decision 2 says.
