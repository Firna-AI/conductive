# Mac app downloads

Status: Active. On branch `calummoore/desktop-app-website-mention`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The marketing site at `conductive.build` does not mention the Mac app, and
it links no download. Its spec still says that the page shows no desktop
app. That rule came from Milestone 1c of
[the earlier plan](boat-native-remote-workspaces.md) on 5 November 2026,
one day before decision 62 of that plan chose the Mac app. Since
9 November 2026, each release of the public repository
`Firna-AI/remote-code` holds a notarized DMG for each chip, and the
published copies update themselves. The plan for the Mac app updates, on
the branch `calummoore/desktop-app-auto-update`, built that. But each DMG
name holds its version, such as `Conductive-0.2.0-mac-arm64.dmg`, so no
address always gives the newest DMG.

This change gives each DMG a fixed name, adds a Mac app section to the
home page, and links the DMG of each chip. It also adds the data of the
Mac app to the legal drafts. It does not cover builds for other systems.
It also leaves three things to follow-up items:

- [a link to the Mac app in the web app](follow-ups/mac-app-link-in-web-app.md)
- [old copies that call a changed Worker API](follow-ups/old-mac-app-copies-and-api-changes.md)
- [copies that run from a read-only volume](follow-ups/read-only-copies-never-update.md),
  for which the user chose option D on 9 November 2026

Contract owners:

- [Mac app](../docs/protocol/desktop-app.md), section "Packages and updates".
- [The marketing site mockups](../docs/mockups/marketing-site.md).
- The [marketing site README](../src/marketing/README.md).
- The [Mac app release guide](../desktop/RELEASES.md).
- The [architecture doc](../docs/architecture.md).

## Decisions

### 1. How visitors learn about the Mac app and get it

- **Chosen by the user on 8 November 2026:** C. **Chosen again on 9 November 2026:** C, not E.
- **Changed on 9 November 2026:** the release part of C is done in
  `Firna-AI/remote-code`, not in a separate repository, by the plan for the
  Mac app updates. That plan's protocol text rejects a separate feed
  repository, because releases in the code repository need no stored
  credential. This plan keeps the site part of C.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design, from the user's message on 8 November 2026: "website does not mention the desktop app".
- **Category:** Docs or spec.
- **Location:** `docs/mockups/marketing-site.md:41`, the rationale of `docs/mockups/src/entries/marketing/index.mockup.tsx`, `src/marketing/features.ts`, `src/marketing/pages/index.astro`, and `desktop/electron-builder.yml:3`.
- **Terms:**
  - **Latest release:** the newest published release of `Firna-AI/remote-code` that is not a pre-release. GitHub's address `releases/latest/download/<name>` gives its file with that name.
  - **Universal package:** one app that runs on Apple silicon and on Intel, about twice the size of a package for one chip.
- **Background:** The home page has a hero, six feature sections with real screens, a grid of smaller features, and a footer. Each claim on the page must be one that a plan decides. The header links the public repository on GitHub. Release `v0.2.0` is the latest release, with a stapled DMG and a ZIP for each chip.
- **Problem:** The site does not name the Mac app, and its spec still forbids that claim. A visitor cannot find the download from the site. Each DMG name holds its version, so the site cannot link one address that always gives the newest DMG.
- **Impact if no action:** Visitors do not learn that a Mac app exists. This includes users who leave Conductor Cloud before it shuts down on 20 November 2026.
- **Root question:** How do visitors of `conductive.build` learn about the Mac app, and how do they get it and its new versions?
- **Options:**
  - **A.** Mention the app now, and add the download later. Left out on 9 November 2026: notarized public downloads exist, so C is better on every point. Effort: Medium.
  - **B.** Offer the ad-hoc build. Left out on 8 November 2026: C is better on every point, because notarized builds exist. Effort: Large.
  - **C.** Add a Mac app section to the home page, and link "Download for Mac" for Apple silicon and for Intel, from the latest release. Effort: Medium.
  - **D.** The user uploads the first version by hand. Left out on 9 November 2026: the release workflow already publishes each release. Effort: Large.
  - **E.** Do C, and stop the class of stale claims. Reword the claim rule of `docs/mockups/marketing-site.md` and of the rationale of the marketing mockup entry: the page claims a feature only when a protocol doc states it, and it shows no customer logos, testimonials, user counts, or certifications. Extend the rule of `AGENTS.md` that sends each changed protocol fact to the legal pages, so that it also names the claims of the home page. Cost: the spec loses its named warnings against an API, a native phone app, other agents, and a changelog, and the general rule must cover them. Effort: Medium, less than an hour more than C.
  - **F.** Do C with one universal package and one "Download for Mac" button. Gain: the visitor does not choose a chip. Cost: each download and each full update is about 260 MB, not about 130 MB. The protocol line about one package for each chip changes. Effort: Large.
  - **G.** Serve the files from a Cloudflare R2 bucket. Left out on 9 November 2026: the public releases already serve the files and the update feed. Effort: Large.
  - **H.** Let the Worker serve private releases. Left out on 9 November 2026: the repository is public now. Effort: Large.
- **Left out:**
  - A, B, D, G, and H, for the reasons in their lines.
  - Change nothing: the gap that the user reported stays.
  - The Mac App Store: its app sandbox blocks Mac commands, which run shell commands.
  - A script or the `Sec-CH-UA-Arch` header that detects the chip: the site runs no script, and Safari and Firefox do not report the chip.
  - Static files of the Worker: each package is about 130 MB, and a static file of a Worker can be at most 25 MiB.
  - A Homebrew cask: it fails the goal for visitors who do not use Homebrew. Next to C, it answers another question.
- **Wider fix:** E. In this class of problem, a decision adds or changes a feature, and a public text keeps the old claim. The class came back four times: the Boat account claim, two legal page findings, and this rule.
- **Previous examples:** Milestone 4f of the earlier plan removed the Boat account claim from the site after decision 80. Finding 6 of pull request #46 and finding 8 of pull request #45 found stale legal pages. Mokly's site does not link its desktop releases.
- **Recommendation:** E, from the options check on 8 November 2026. It keeps all of C and adds less than an hour against a class that keeps coming back. The first recommendation was A, and the second was C.
- **Action:** the user chose C on 8 November 2026. The options check then recommended E. On 9 November 2026 the user kept C, so the claim rule keeps its named list, without the desktop app.

The second decision of this plan, "How a copy that cannot install updates
gets new versions", closed on 9 November 2026. The plan for the Mac app
updates answered it: the app offers Restart now only after Squirrel.Mac
accepts the update, and the user chose option D of
[the item for read-only copies](follow-ups/read-only-copies-never-update.md)
as a follow-up.

## Design calls

Agent calls on 8 November 2026, kept on 9 November 2026:

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
  label either, and the copy rules of the `product-ui` skill keep a limit
  out of headlines.
- Oldest macOS version: the section and the protocol name the oldest macOS
  version that a release build accepts. Reason: a visitor on an older
  version must not download a DMG that does not open.
- Legal drafts: the Privacy draft adds the data of Mac commands. The Terms
  draft names the Mac app in its description of the service, and adds a
  draft field for Mac commands. Reason: decision 35 makes the drafts
  restate the facts of the protocol docs. Since pull request #97, the
  Privacy draft names the update checks of the Mac app, but not its
  commands.
- Copy: the words of the section go into `src/marketing/features.ts`,
  which the site and the mockups both read. Reason: that module is the one
  source of the feature texts.
- Two buttons, with Apple silicon first. Reason: the protocol has one
  package for each chip, and most current Macs have Apple silicon.

Agent calls on 9 November 2026:

- Download addresses: each new release names its DMGs without the version,
  `Conductive-mac-arm64.dmg` and `Conductive-mac-x64.dmg`. The site links
  `https://github.com/Firna-AI/remote-code/releases/latest/download/<name>`.
  The ZIP files keep their names, because `latest-mac.yml` lists them for
  the updater, and it lists no DMG. Reason: the site runs no script, and a
  fixed name gives one address that always serves the newest DMG. A link
  to the release page was rejected, because it shows nine files. A Worker
  route that looks up the newest version was rejected, because it adds a
  GitHub request to each download.
- One source: one module that imports nothing holds the fixed DMG names.
  `src/marketing/links.ts` builds the download addresses from it, beside
  `sourceRepositoryHref`, for the site and the mockups.
  `desktop/scripts/release.ts` passes the same names to electron-builder.
  Reason: the links break when two copies of a name differ, and the
  publish step already finds each DMG by its `.dmg` suffix and its chip.
- Two pull requests. The first holds the mockups, the docs, and the fixed
  names. The second holds the site and the legal drafts, and it merges
  only after a release with the fixed names is published. Reason: each
  push to `main` deploys the site, so the links of the site must work at
  its merge.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the Mac app on the home page: a feature section with a real picture
of the Mac window and both downloads, links from the header and the
footer, and the Mac app in the hero and the footer.

- [ ] Add a Mac app picture to
      `docs/mockups/src/screens/marketingPictureList.ts`, with its capture
      page in `marketingPictures.tsx`. It shows a real screen of
      `MacAppScreen`: the window buttons, the sidebar, and a command
      request that waits for Allow. The phone layout shows the same file,
      because the Mac app has no phone layout.
- [ ] Add the words of the Mac app section to `src/marketing/features.ts`,
      and draw the section in `MarketingScreen.tsx`. Show "Download for
      Mac" for Apple silicon and for Intel, and the oldest macOS version.
      Claim only what `docs/protocol/desktop-app.md` states.
- [ ] Add the module of the fixed DMG names, and build the two download
      addresses from it in `src/marketing/links.ts`.
- [ ] Add a Download link to the header and a Mac app link to the Product
      column of the footer. Both go to the section.
- [ ] Name the Mac app in the hero sentence, the page description, and the
      footer tagline.
- [ ] Remove the desktop app from the claims that the page leaves out, in
      `docs/mockups/marketing-site.md` and in the rationale of
      `docs/mockups/src/entries/marketing/index.mockup.tsx`.
- [ ] Update the description of that entry, which names six features and a
      header without the Mac app.
- [ ] Run `npm run mockups:check`. Smoke-test the home page at desktop and
      phone sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the fixed DMG names and the site downloads as requirements, before
the code changes.

- [ ] In "Releases" of `docs/protocol/desktop-app.md`, state that each DMG
      name has no version, so that the latest release always gives the
      newest DMG of each chip at one address.
- [ ] State there the oldest macOS version that a release build accepts.
      Read it from `LSMinimumSystemVersion` in the `Info.plist` of the
      release `v0.2.0`.
- [ ] In `docs/architecture.md`, say that the marketing site links the
      Mac app downloads.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Fixed DMG names

Depends on: 2

- [ ] Make `desktop/scripts/release.ts` pass the fixed DMG names of the
      shared module to electron-builder. Keep the names of the ZIP files.
- [ ] Check that the publish step in `desktop/scripts/publish-assets.ts`
      still selects both DMGs, and add the test that the `testing` skill
      asks for.
- [ ] Update `desktop/RELEASES.md`.

## Milestone 4: First pull request and release

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Open the first pull request. It keeps this plan.
- [ ] The user merges it, and then the next release pull request.
- [ ] Check that both fixed addresses of the latest release give their DMG.

## Milestone 5: Marketing site

Tags: ui

Depends on: 1, 2

Build the Mac app section and its links on the site, as Milestone 1 draws
them.

- [ ] Build the Mac app section, both downloads, the oldest macOS version,
      the header and footer links, and the new copy, in the Astro
      components of `src/marketing/`.
- [ ] Capture the pictures with `npm run marketing:pictures`.
- [ ] Add or change the tests that the `testing` skill asks for.
- [ ] Update `src/marketing/README.md`.
- [ ] Compare each changed page with its mockup at desktop and phone
      sizes, in light and dark.

## Milestone 6: Legal drafts

Depends on: 2

- [ ] Read both legal pages in full, as the rule of `AGENTS.md` says,
      because Milestone 2 changes facts of a protocol doc. Update each
      sentence that restates a changed fact.
- [ ] In `src/marketing/privacy.ts`, add the data of Mac commands: the
      name of the Mac in each command request, the commands and their
      output that go to the agent and so to Anthropic or OpenAI, the
      always-allowed commands that stay on the Mac, and the session cookie
      of the Mac app.
- [ ] In `src/marketing/terms.ts`, name the Mac app in the opening
      paragraph and in "The service". Add a draft field for the commands
      that a user allows on their Mac.
- [ ] Check that the Terms and Privacy mockups show the new text.

## Milestone 7: Second pull request

Depends on: 4, 5, 6

- [ ] Merge `main` into the branch, as the `git-merge` skill says.
- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the diff against `origin/main` with the
      `implementation-review` skill after the push, and apply the fix rule
      as in Milestone 4.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the second pull request. Its description gives the decisions
      and the design calls of this plan with their dates, a permalink to
      this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, check that the live home page shows the Mac app
      section, and that both downloads give a notarized DMG.
