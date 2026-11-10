# Mac app downloads

Status: Active. [PR #128](https://github.com/Firna-AI/remote-code/pull/128) and the stacked draft [PR #130](https://github.com/Firna-AI/remote-code/pull/130) are open. Both keep this plan until Milestone 4 ends. The pull request that completes the work deletes this plan, as the `plans` skill says.

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
home page, and links the DMG of each chip. It also adds the data of Mac
commands to the Privacy page, and the Mac app and its commands to the
Terms. It does not cover builds for other systems.
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

### 3. What the Terms say about the Mac app

- **Chosen by the user on 9 November 2026:** B.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation, from Milestone 6.
- **Category:** Docs or spec.
- **Location:** the lead, the section "The service", and a new section of `src/marketing/terms.ts`, and `TERMS_VERSION` in `src/shared/terms.ts`.
- **Background:** Since pull request #97, the Terms are final legal text. They covered the product domain and the app domain, and they called the product "a coding tool in the browser". Each sign-in accepts the current revision of the Terms, and a new revision applies at each user's next sign-in.
- **Problem:** The Terms named neither the Mac app nor the commands that it runs on a user's Mac with the user's permission.
- **Impact if no action:** A user of the Mac app can read the Terms as covering only the browser, and the Terms do not say who answers for a command that the user allows.
- **Root question:** What do the Terms say about the Mac app and the commands that it runs on a user's Mac?
- **Options:**
  - **A.** Name the Mac app in the lead and in "The service", and change the revision. Effort: Small.
  - **B.** Do A, and add a clause: the user decides which commands run on their Mac, and answers for what they allow. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A visible draft field on the live page, because the Terms are final.
- **Wider fix:** None. The rule of `AGENTS.md` already sends each changed protocol fact to the legal pages.
- **Previous examples:** Pull request #110 changed the Terms and the revision for the GitHub CLI.
- **Recommendation:** B. A command that runs on the user's own computer is the main new risk of the Mac app.
- **Action:** the user chose B on 9 November 2026. Milestone 8 applies it.

### 4. The actions of the site

- **Chosen by the user on 10 November 2026:** "this should be sign up (primary) and download (for mac os download) - we shouldn't mention the waitlist on the static site buttons", about the two actions under the hero.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design, from the user's message on 10 November 2026.
- **Category:** UX wording.
- **Location:** `startLabel` in `docs/mockups/src/components/marketing/SiteActions.tsx`, `src/marketing/components/StartButton.astro`, `src/marketing/components/SiteActions.astro`, and the Account column of the footer.
- **Background:** The main action of each page of the site was "Join the waitlist", from decision 160 of the earlier plan, because a new account waits for app access. The second action was "Sign in". Both start the GitHub sign-in.
- **Choice:** the main action of the site is "Sign up". The second action of the hero and of the last call to action is a download of the Mac app. No button of the static site names the waitlist.
- **Action:** the user chose it. Milestones 9 to 11 apply it.

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
- Legal pages: the Privacy page adds the data of Mac commands. Reason: the
  Privacy page restates the facts of the protocol docs, and since pull
  request #97 it names the update checks of the Mac app, but not its
  commands. The Terms stay unchanged in this plan, as Milestone 6 says.
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
- One source: `docs/mockups/src/brand.ts`, which imports nothing, derives
  the fixed DMG names from the product name. `src/marketing/links.ts`
  builds the download addresses from them, beside `sourceRepositoryHref`,
  for the site and the mockups. `desktop/scripts/release.ts`, which
  already reads `brand.ts`, passes the same names to electron-builder.
  Reason: the links break when two copies of a name differ, and code reads
  the product name only from `brand.ts`. The publish step already finds
  each DMG by its `.dmg` suffix and its chip.
- The words of the Mac app section are their own export of
  `src/marketing/features.ts`, not an entry of `features`. Reason: the
  site renders each entry of `features`, so the section stays off the
  live site until Milestone 5.
- Oldest macOS version: macOS 13, from `LSMinimumSystemVersion` 13.0 in
  the `Info.plist` of the app of release `v0.2.0`, read on 9 November
  2026.
- Two pull requests. The first holds the mockups, the docs, and the fixed
  names. The second holds the site and the Privacy page, and it merges
  only after a release with the fixed names is published. Reason: each
  push to `main` deploys the site, so the links of the site must work at
  its merge.

Agent calls of Milestone 1 on 9 November 2026, from its mockups:

- The Mac app section comes after the Phone section, so that the two
  device sections sit together. Its headline is "Work from the Mac app."
- The buttons are "Download for Mac (Apple silicon)", filled, and
  "Download for Mac (Intel)", outlined. Reason: two links with the same
  name confuse screen readers. They are links styled as buttons.
- The phone header has no Download link, because it fits only three items.
  The footer link reaches the section on a phone.
- The page description of the home page is its hero sentence, as the site
  already does. The page title keeps its words.
- The picture list moved its capture pages, captures, and file names into
  `docs/mockups/src/screens/marketingPictureCaptures.ts`. Reason: the Mac
  picture took the list over the limit of 300 lines.
- The capture command resets only the animations of the document timeline.
  Reason: Chrome refuses a time value for an animation that scrolling
  drives, such as the fade of the waiting requests in the Mac picture.

Agent calls on 10 November 2026, for decision 4:

- The second action reads "Download for Mac", with the download icon, and
  leads to the Mac app section. Reason: the site runs no script, so it
  cannot pick the DMG of the visitor's chip, and the section offers both.
- The hero and the last call to action share the two actions, so the last
  call to action of each page changes too. The header keeps Sign in, and
  its main action becomes Sign up. The footer lists Sign up and Sign in.
- The sentence under the last call to action keeps the fact that a new
  account waits for access, but it starts with "Sign up with GitHub", so it
  matches the button.

Agent calls of Milestones 9 to 11 on 10 November 2026:

- The words of both actions are `siteActionCopy` in
  `src/marketing/access-copy.ts`, which the site and the mockups both read.
  `startLabel` of the mockups is gone. Reason: one source for each shared
  text, as `features.ts` does, and that module already holds the sentence
  under the last call to action. "Sign in" keeps its copies, because the
  decision does not change it.
- `access-copy.ts` changed in Milestone 9, not in Milestone 11. Reason: the
  mockups read it, so they can draw the new words only from it.
- The download icon of the second action is 16 px, as the GitHub mark of
  the main action and the icons of the downloads in the Mac app section.
  Reason: the large Firna button draws its own icon at 18 px, so the
  mockup passes the icon as a node.
- The table notes of the comparison page that name the waitlist stay.
  Reason: they are not buttons.
- The docs cite the choice of 10 November 2026 by its date, not as
  decision 4. Reason: decision 4 of the earlier plan has the same number.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the Mac app on the home page: a feature section with a real picture
of the Mac window and both downloads, links from the header and the
footer, and the Mac app in the hero and the footer.

- [x] Add a Mac app picture to
      `docs/mockups/src/screens/marketingPictureList.ts`, with its capture
      page in `marketingPictures.tsx`. It shows a real screen of
      `MacAppScreen`: the window buttons, the sidebar, and a command
      request that waits for Allow. The phone layout shows the same file,
      because the Mac app has no phone layout.
- [x] Add the words of the Mac app section to `src/marketing/features.ts`,
      and draw the section in `MarketingScreen.tsx`. Show "Download for
      Mac" for Apple silicon and for Intel, and the oldest macOS version.
      Claim only what `docs/protocol/desktop-app.md` states.
- [x] Derive the fixed DMG names from the product name in
      `docs/mockups/src/brand.ts`, and build the two download addresses
      from them in `src/marketing/links.ts`.
- [x] Add a Download link to the header and a Mac app link to the Product
      column of the footer. Both go to the section.
- [x] Name the Mac app in the hero sentence, the page description, and the
      footer tagline.
- [x] Remove the desktop app from the claims that the page leaves out, in
      `docs/mockups/marketing-site.md` and in the rationale of
      `docs/mockups/src/entries/marketing/index.mockup.tsx`.
- [x] Update the description of that entry, which names six features and a
      header without the Mac app.
- [x] Run `npm run mockups:check`. Smoke-test the home page at desktop and
      phone sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the fixed DMG names and the site downloads as requirements, before
the code changes.

- [x] In "Releases" of `docs/protocol/desktop-app.md`, state that each DMG
      name has no version, so that the latest release always gives the
      newest DMG of each chip at one address.
- [x] State there that a release build runs on macOS 13 or later, from
      its `LSMinimumSystemVersion`.
- [x] In `docs/architecture.md`, say that the marketing site links the
      Mac app downloads.
- [x] Check each relative link of the changed Markdown files.

## Milestone 3: Fixed DMG names

Depends on: 2

- [x] Make `desktop/scripts/release.ts` pass the fixed DMG names of the
      shared module to electron-builder. Keep the names of the ZIP files.
- [x] Check that the publish step in `desktop/scripts/publish-assets.ts`
      still selects both DMGs, and add the test that the `testing` skill
      asks for.
- [x] Update `desktop/RELEASES.md`.

## Milestone 4: First pull request and release

Depends on: 1, 2, 3

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report. The first review found no findings.
- [x] Open the first pull request. It keeps this plan. It is
      [PR #128](https://github.com/Firna-AI/remote-code/pull/128).
- [x] The user merges it, and then the next release pull request. At the
      user's request on 10 November 2026, I squash-merged #128 and then the
      release pull request #111. Release `v0.3.0` is the first with the fixed
      DMG names.
- [x] Check that both fixed addresses of the latest release give their DMG.
      Both returned 200 on 10 November 2026.

## Milestone 5: Marketing site

Tags: ui

Depends on: 1, 2

Build the Mac app section and its links on the site, as Milestone 1 draws
them.

- [x] Build the Mac app section, both downloads, the oldest macOS version,
      the header and footer links, and the new copy, in the Astro
      components of `src/marketing/`.
- [x] Move the hero sentence and the footer tagline into one shared export
      that the site and the mockups both read. Today `index.astro` holds
      the hero sentence twice, and `SiteFooter.astro` holds the tagline.
- [x] Keep the header links on one line, as the mockup header does with
      `nowrap`. Without it, "Sign in" wraps between 760 and 776 px.
- [x] Capture the pictures again with `npm run marketing:pictures` when a
      screen of a picture changed after Milestone 1. Pull request #122 on
      `main` removed the branch name from the top bar of the Mac window,
      so both Mac pictures changed. The 26 other pictures kept their bytes.
- [x] Add or change the tests that the `testing` skill asks for.
- [x] Update `src/marketing/README.md`.
- [x] Compare each changed page with its mockup at desktop and phone
      sizes, in light and dark.

## Milestone 6: Legal drafts

Depends on: 2

Since pull request #97, the Terms and Privacy pages are final legal text,
not drafts. Agent call on 9 November 2026: this milestone keeps the
factual Privacy additions, and it leaves the Terms to the user, in
[the item for the Terms](https://github.com/Firna-AI/remote-code/blob/49856b63d5d22e77de40e5c627bc2f7db66203e3/plans/follow-ups/terms-name-the-mac-app.md). Reason: a
change of the Terms changes the contract with each user.

- [x] Read both legal pages in full, as the rule of `AGENTS.md` says,
      because Milestone 2 changes facts of a protocol doc. No sentence
      restates a changed fact.
- [x] In `src/marketing/privacy.ts`, add the data of Mac commands: the
      request, its result, and the name of the Mac, which go to the agent
      and so to Anthropic or OpenAI, and which the members of the org see.
      Add that always-allowed commands stay on the Mac, how long the
      records stay, and the session cookie of the Mac app.
- [x] Leave the Terms unchanged, and record the follow-up item for them.
- [x] Check that the Privacy mockup shows the new text.

## Milestone 7: Second pull request

Depends on: 4, 5, 6, 8, 11

- [x] Merge `main` into the branch, as the `git-merge` skill says.
- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the diff against `origin/main` with the
      `implementation-review` skill after the push, and apply the fix rule
      as in Milestone 4. The branch `calummoore/mac-app-downloads-site` is
      stacked on the first pull request, so the review used that branch as
      its base. It found no findings.
- [x] Open the second pull request as a draft, stacked on the first. It
      keeps this plan until Milestone 4 ends. It is
      [PR #130](https://github.com/Firna-AI/remote-code/pull/130).
- [x] When the merge comes on a later day than 9 November 2026, change the
      effective date of the Terms and of the Privacy page, and the date
      in `TERMS_VERSION`, to that day. They are now 10 November 2026 and
      `2026-11-10-mac-app`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Mark the second pull request ready. Its description gives the decisions
      and the design calls of this plan with their dates, a permalink to
      this plan, and the follow-up items that the change adds.

## Milestone 8: The Terms and the Mac app

Depends on: 6

Apply option B of decision 3. Added on 9 November 2026.

- [x] Name the Mac app in the lead and in "The service" of
      `src/marketing/terms.ts`, and add the section for commands on the
      user's Mac.
- [x] Change `TERMS_VERSION` to `2026-11-09-mac-app`, and update the tests
      that pin it.
- [x] Delete `plans/follow-ups/terms-name-the-mac-app.md` in the same
      commit.
- [x] Run the targeted tests and the complete gate, commit, push, and
      review the change with the `implementation-review` skill. The second
      review of the branch found no findings.

## Milestone 9: Mockups for Sign up and Download for Mac

Tags: mockup

Depends on: none

- [x] Change the main action to "Sign up" and the second action to
      "Download for Mac", in `SiteActions.tsx` and wherever the mockups
      draw the actions of the site.
- [x] Update `docs/mockups/marketing-site.md`, `docs/mockups/catalogue.md`,
      the rationale of the marketing entry, and the comparison page notes.
- [x] Run `npm run mockups:check`, and smoke-test the home page and the
      comparison page at desktop and phone sizes.

Evidence: `.context/mac-app-downloads/actions/` and the screenshots in
`.context/mac-app-downloads/shots-actions/`.

## Milestone 10: Docs for the actions of the site

Depends on: 9

- [x] Change the main action in `docs/protocol/conductor-cloud-comparison.md`
      and `docs/architecture/marketing-site.md`. Read both legal pages in
      full, as the rule of `AGENTS.md` says. No sentence of the legal pages
      restates the actions of the site.

## Milestone 11: Site actions

Tags: ui

Depends on: 9, 10

- [x] Change `StartButton.astro`, `SiteActions.astro`, the footer, and
      `access-copy.ts`, as Milestone 9 draws them.
- [x] Update the tests and `src/marketing/README.md`.
- [x] Run the targeted tests and the complete gate, commit, push, and
      review the change. The review found one Low finding, which commit
      `109b3778` fixed. The re-review found none.

Evidence: `.context/mac-app-downloads/actions/`, with the comparison of the
site and the mockups in `m11-compare.log`.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, check that the live home page shows the Mac app
      section, and that both downloads give a notarized DMG.
