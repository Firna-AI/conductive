# Turn on Mac app updates

Status: Active. On branch `calummoore/desktop-app-auto-update`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Mac app has an updater, but no installed copy can update itself. Every
build turns the updater off. The signed release job keeps its files only as
Actions artifacts for 14 days. The signed `0.1.0-alpha.1` build, from Actions
run 42519666993, also has the updater off.

The user asked on 8 November 2026 to turn the updater on: "ok, we need to
turn that on!". This replaces the protocol rule "No release is published
yet. Until the first release, each build keeps the updater off." The
approach comes from
[decision 62](boat-native-remote-workspaces.md#62-add-a-mac-app-in-parallel)
and the [protocol](../docs/protocol/desktop-app.md#packages-and-updates):
build the Mac app the way Mokly built its desktop app, and update from the
GitHub releases of a public repository. Mokly's release job publishes to the
public repository `mokly-ai/mokly-desktop`.

On 9 November 2026, the user made `Firna-AI/remote-code` public and asked:
"can we make the desktop app part of releases now?". Decision 1 records the
choice: the feed is the GitHub releases of this repository. The release job
publishes the signed files to a prerelease of this repository, and the
builds that publish turn the updater on. Decisions 2 and 3 choose which runs
publish and where the version comes from.

The change does not cover Linux or Windows apps, a download link on the
website, release notes in the app, or staged rollouts.

Contract owners:

- [Mac app protocol](../docs/protocol/desktop-app.md#packages-and-updates).
- The [desktop README](../desktop/README.md).

## Design

Agent calls on 8 November 2026, updated on 9 November 2026 after decision 1.
The options check of the decisions added the calls that say so:

- Only runs that may publish turn the updater on. Decision 2 chooses those
  runs. Pull request and local builds keep it off. Reason: macOS installs an
  update only into a Developer ID build, and a test build with the updater
  on could install a published version over itself.
- The release job publishes only after `test:packaged` passes.
- The publish step uploads every file to a draft prerelease first. It
  publishes the draft only after GitHub lists every file with its full
  size. Reason: the updater reads only published releases, so a failed run
  never shows users a partial release.
- A failed run leaves its draft. The next run for the same version deletes
  that draft and starts again.
- The publish step never changes or deletes a published release. When the
  feed already has a published release for the version, the step warns and
  publishes nothing.
- The tag of each release points to the released commit of this
  repository. GitHub gives a release the date of that commit, and the
  updater takes the first matching release in GitHub's list. So each release
  comes from a newer commit than the release before it. From the options
  check, updated on 9 November 2026.
- Every published release of this repository carries the Mac app files and
  `latest-mac.yml`. Reason: electron-updater reads the newest release of the
  whole repository, so a release without them stops all updates. Added on 9
  November 2026.
- The publish step marks each release as a prerelease. Reason:
  `releaseType` in `desktop/electron-builder.yml` controls only
  electron-builder's own publisher, and `desktop/src/updates.ts` reads
  prereleases. electron-updater then takes the newest alpha, beta, or stable
  release. From the options check.
- A release holds the two ZIP files, their block maps, the two stapled DMG
  files, and `latest-mac.yml`. Reason: the updater reads the update file and
  the ZIP files, and people install from the DMG files. From the second
  update after a DMG install, the block maps let the updater download only
  the changed blocks.
- electron-builder leaves the DMG files out of `latest-mac.yml`, with
  `dmg.writeUpdateInfo: false`. Reason: stapling changes each DMG after
  electron-builder records its hash and size, and the updater reads only the
  ZIP files. Risk: electron-builder marks this option private, so an upgrade
  can change it.
- The "The update is ready." dialog waits until Squirrel.Mac, the macOS
  update framework inside Electron, accepts the update. The app listens to
  the `update-downloaded` event of Electron's own `autoUpdater`. Reason:
  electron-updater 6.8.9 reports the download before Squirrel.Mac takes it,
  so Restart now waits forever when Squirrel.Mac refuses the update. From
  the options check.
- A separate publish job publishes with the built-in `GITHUB_TOKEN` and
  `contents: write`. It downloads the signed files, and it runs no `npm ci`
  and no build. The signing job keeps a read-only token. Reason: no stored
  credential is necessary, and no dependency script runs beside a token that
  can write releases. Added on 9 November 2026.
- The publish step runs the `gh` command through the existing release
  command runner. GitHub's macOS runners have `gh`, so the change adds no
  dependency.
- The first published version is `0.1.0-alpha.2`. People with the
  `0.1.0-alpha.1` build install it by hand once.
- The change has no mockup work. It adds no screen, and the mockups do not
  draw native dialogs.
- The first public release waits for the merge. Reason: a release reaches
  every installed copy, so it comes from reviewed code on `main`.

## Decisions

The options check ran on 8 November 2026. Its report is
`.context/mac-app-updates/options-check.md`. It added options D to G of the
items, and it changed the recommendations of items 1 to 4.

On 9 November 2026, the user made this repository public and answered
decision 1 with a new option, H. The feed is now the releases of this
repository. Decision 2 got a new option, H, because GitHub allows required
reviewers on the environments of a public repository.

### 1. Choose the credential that publishes releases

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `.github/workflows/desktop-ci.yml`, the `release` job, and `UPDATE_FEED` in `desktop/src/updates.ts:1`.
- **Terms:**
  - **Fine-grained token:** a GitHub personal access token that reaches only the repositories and permissions that its owner picks.
  - **GitHub App token:** a one-hour token that a workflow makes from the private key of a GitHub App, for the repositories where the app is installed.
  - **Conductor app:** the GitHub App `conductor-build-app`. The agents of this workspace use it, and it acts as the user `calummoore`.
- **Background:**
  - The release job runs in `Firna-AI/remote-code`. Its built-in token writes only to that repository. Mokly stores its feed credential as `DESKTOP_RELEASES_TOKEN`.
  - On Firna-AI, the Conductor app reaches all repositories, with write access to contents, workflows, and Actions. So agents could also publish to a feed in Firna-AI by hand.
  - The Conductor app cannot create repositories or set environment secrets. So the user creates the feed repository and stores the credential.
  - macOS installs an update only when its signature matches the Developer ID team of the running app. A feed credential alone cannot ship a working app, but a run that also holds the signing secrets can.
  - Shared assumption: the feed is public, because this repository is private. Source: the protocol. F drops the GitHub host.
- **Problem:** No credential lets the release job publish to the feed, and nothing keeps other writers out of it.
- **Impact if no action:** No release reaches the feed. With a feed in Firna-AI, an agent can also publish a release that nobody reviewed.
- **Root question:** Who may publish to the public update feed, and how are all other writers kept out?
- **Options:**
  - **A.** A fine-grained token, owned by the user, for the feed repository only, with "Contents: Read and write". It expires, so someone renews it at least once a year. Agents can still write to a feed in Firna-AI. Effort: Small.
  - **B.** Publish by hand. The release job keeps every file. The user downloads them and runs one documented `gh release create` command. CI holds no feed credential. Each release needs the user's time and can miss a file. Effort: Small.
  - **C.** A GitHub App, installed only on the feed repository, with "Contents: Read and write". The job makes a one-hour token with `actions/create-github-app-token`. No person owns it, and it does not expire. Effort: Medium.
  - **D.** A, and the user limits the Conductor app on Firna-AI to selected repositories, without the feed. Agents then cannot write to the feed. The user must add each new repository to the Conductor app by hand. Effort: Small.
  - **E.** C, plus two settings on the feed repository: a tag rule that only the publishing app can bypass, and GitHub's immutable releases. Other identities then cannot create a release tag or change a published file. Effort: Medium.
  - **F.** Serve the feed from a Cloudflare R2 bucket on a `conductive.build` address, through the generic provider of electron-updater. A token for that bucket only writes it, and the Conductor app does not reach it. It needs new storage, a new credential, and a protocol change. Effort: Medium.
  - **G.** A, with the feed repository in a new GitHub organization, such as `conductive-build`, where the Conductor app is not installed. Agents then cannot write to the feed, and the Firna-AI setup stays as it is. The code and the docs change to the new feed name. Effort: Small.
  - **H.** Publish to the releases of `Firna-AI/remote-code` itself, which the user made public on 9 November 2026. The release job publishes with its built-in token, so the change needs no stored credential, repository, or organization. Agents can still write releases here, but only a run with the signing secrets makes an app that can install. Effort: Small.
- **Left out:**
  - A classic personal access token: it can write to every repository that its owner can reach. A is better on every point.
  - A deploy key: it cannot create releases, so it fails the goal.
  - A workflow in the feed repository that fetches the files: it needs a second credential to read this private repository. D and G keep agents out without it, so they are better on every point. Decision 2 uses the approach in its option G, with a required reviewer.
- **Wider fix:** None. This is a design question, not a defect class.
- **Previous examples:** Mokly's `DESKTOP_RELEASES_TOKEN` in `mokly-ai/mokly-cloud/.github/workflows/desktop-release.yml`. The signing secrets of `plans/conductive-desktop-notarization.md`.
- **Related:** Item 2: its options decide which runs get this credential. B of this item makes item 2 unnecessary. Item 2's G needs D or G of this item.
- **Recommendation:** G. Agents cannot write to the feed, the setup takes minutes, and the Conductor setup of Firna-AI stays as it is. The first recommendation was A, and the options check recommended D. E best protects the feed over time, because a separate publishing app owns it and nothing expires.
- **Action:** ask the user, because every option needs a credential, an organization, or a setting that only the user can create.
- **Chosen:** H, by the user on 9 November 2026: "I made the repo public, does that change things, can we make the desktop app part of releases now?". The agent had recommended G. Decision 2 now decides which runs get the signing secrets.

### 2. Stop branch tags from publishing unreviewed code

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `.github/workflows/desktop-ci.yml`, the `release` job.
- **Background:**
  - The release job runs for every tag that starts with `v`, on any commit. It runs the workflow and the scripts of that commit.
  - The `desktop-release` environment holds the signing secrets. It admits `main` and every `v*` tag. It cannot check that the commit of a tag is on `main`.
  - The tag `v0.1.0-alpha.1` points to a commit of the notarization branch. It was pushed before that branch merged.
  - Agents push and tag with the user's account. `main` has no branch protection and no rules. "Agent merges: off" is a rule of `CLAUDE.md`, not a GitHub setting.
  - This repository is public since 9 November 2026. GitHub's Team plan allows required reviewers on the environments of a public repository.
  - Approving a waiting run needs the GitHub permission "Deployments: write". The Conductor app has only read access to deployments, so agents cannot approve a run.
  - With the feed in this repository, any run can create a release with its built-in token. So the signing secrets are the real guard: only a Developer ID build can install as an update.
- **Problem:** When tags publish, a tag on an unmerged branch sends unreviewed code to every installed copy. A check inside the job does not stop it, because the branch can change the check.
- **Impact if no action:** One tag from a person or an agent can sign and ship unreviewed code to every user.
- **Root question:** Which commits may become a release that installed copies receive?
- **Options:**
  - **A.** Any `v*` tag publishes, as the release job runs now. People and agents must tag only commits on `main`. Effort: Small.
  - **B.** The release job publishes only when the commit of the tag is on `main`. Other tags still sign, with the updater off. A branch can change this check, because the job runs the workflow of the tagged commit. Effort: Small.
  - **C.** A GitHub tag rule lets only the user create `v*` tags. Agents push with the user's account, so the rule may not stop them. Effort: Small.
  - **D.** Sign and publish only from runs on `main`. The `desktop-release` environment admits only `main`, so no tag or branch run gets the signing secrets, also when it edits the workflow. A run on `main` publishes when the feed lacks its version. The release trigger moves from a tag to `main`, so the best option of item 3 changes. Updated on 9 November 2026, because the built-in token of any run can now publish. Effort: Medium.
  - **E.** Add a rule on `main` that blocks direct pushes and force pushes. Code then reaches `main` only through a pull request. Agents act as the user, so the rule stops a mistaken push, but not a merge through the API. It works together with B, D, or H. Effort: Small.
  - **H.** Require the user's approval for each run that uses `desktop-release`, and turn off the administrator bypass of that environment. GitHub then pauses each run that signs, shows its branch or tag, and waits for the user. The Conductor app cannot approve. Tags stay the release trigger. A branch tag signs only when the user approves it. Cost: one click for each release and each signing test. Effort: Small.
- **Left out:**
  - F, a second workflow from `main` that checks the tag and publishes: with the feed in this repository, a tag run can sign and publish by itself with its built-in token. So the check does not stop it, and F fails the goal.
  - G, a publish workflow in a separate feed repository behind an approval: decision 1 chose this repository as the feed. H gives the same approval here, without a second repository or credential, so H is better on every point.
- **Wider fix:** H. GitHub's settings keep the signing secrets from every run that the user did not approve, whoever pushes and whatever the branch changes.
- **Previous examples:** The tag `v0.1.0-alpha.1` on the notarization branch, Actions run 42519666993.
- **Related:**
  - Item 1: its chosen H puts the feed in this repository, so the signing secrets guard the release.
  - Item 3: D of this item moves releases to `main`, so E of item 3 fits. H keeps tags, so C of item 3 fits.
  - `plans/follow-ups/branch-tags-get-signing-secrets.md`: the same tag path gives branch code the signing secrets. H of this item fixes that item too.
- **Recommendation:** H. One setting keeps unreviewed code from the Developer ID signature, and tags stay the release trigger. The first recommendation was B, and the options check recommended D. E can join H at small cost. D best avoids a manual step for each release.
- **Action:** ask the user, because each option except A adds a rule or a gate to the release path, and the options trade safety against the steps of a release.

### 3. Choose where the release version comes from

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `desktop/package.json:4`, and the `release` job of `.github/workflows/desktop-ci.yml`.
- **Background:**
  - electron-builder names the files and writes `latest-mac.yml` with the version in `desktop/package.json`, now `0.1.0-alpha.1`.
  - The updater installs a release only when its version is newer than the running app. It reads the first matching release in GitHub's list.
  - The tag only starts the release job now. Nothing compares the tag with the package version.
  - Mokly stops its release job when the tag does not equal the package version.
  - Agent merges are off, so a version change on `main` needs the user's merge.
- **Problem:** A release can carry an old or wrong version number.
- **Impact if no action:** The publish stops after about 30 minutes of checks and signing, or it publishes a version that installed copies do not take.
- **Root question:** How does each release get a new, correct version number?
- **Options:**
  - **A.** Change nothing. The version stays in `desktop/package.json`, and the tag only starts the job. Effort: Small.
  - **B.** Keep the version in `desktop/package.json`. The release job stops before signing when the tag is not `v` plus that version. Each release needs a merged version change, then the tag. Effort: Small.
  - **C.** Take the version from the tag. The job gives it to electron-builder with `-c.extraMetadata.version`, so the app, the files, and `latest-mac.yml` use it. A release needs only the tag. `desktop/package.json` keeps a fixed `0.0.0` for local and test builds. Effort: Small.
  - **D.** A release tool, such as release-please, opens a pull request that sets the version and writes release notes. Its merge creates the tag, and a later job of the same workflow releases, so it needs no extra token. Effort: Medium.
  - **E.** Release from `main` without a tag. The version stays in `desktop/package.json`. A run on `main` publishes when the feed has no release for that version, and the publish step makes the tag in the feed. It skips, with a warning, a version that is not higher than the newest release in the feed. The user's merge of a version change is the release. Effort: Small with item 2's D, Medium without it.
  - **F.** The release job picks the version. It takes the newest version in the feed, raises its last number by one, and gives it with `-c.extraMetadata.version`. Nobody chooses the number, and the repository does not show it. A move from alpha to beta needs a manual base version. Effort: Medium.
- **Left out:** None.
- **Wider fix:** F. Only F keeps each version higher than the newest release in the feed without a check.
- **Previous examples:** Mokly's tag check in `mokly-ai/mokly-cloud/ts/desktop/scripts/release-environment.py`. release-please in `futex-ai/ui`, decision 122 of the main plan.
- **Related:** Item 2: its D removes the tag trigger, and then E fits. Its H keeps tags, and then C fits.
- **Recommendation:** C, with item 2's H. A release needs only a tag, and the tag and the app cannot disagree. The options check recommended E, which fits when item 2 takes D.
- **Action:** ask the user, because the best option depends on the open answer to item 2.

### 4. Reach copies that run from a read-only volume

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `desktop/src/main.ts:150`, where the updater starts.
- **Terms:**
  - **App Translocation:** macOS runs a downloaded app from a hidden read-only copy until the user moves it.
- **Background:**
  - Squirrel.Mac cannot replace an app on a read-only volume. A copy in another writable folder updates.
  - An app that runs from its mounted DMG is on a read-only volume. A translocated app is too.
  - After the design call above, such a copy gets no "The update is ready." dialog. The log alone shows the refusal, because the protocol says a failed update shows no error.
  - Electron 44 has `app.isInApplicationsFolder()` and `app.moveToApplicationsFolder()` for macOS.
- **Problem:** A copy on a read-only volume downloads each update but never installs it, and the user does not learn why.
- **Impact if no action:** Some users stay on old versions without knowing it, also after a security fix.
- **Root question:** How does a copy that cannot replace itself still reach the new version?
- **Options:**
  - **A.** Change nothing more. The DMG window already shows the Applications folder to drag the app to. Effort: Small.
  - **B.** At launch, a release build outside an Applications folder offers to move itself: "Move Conductive to Applications to get updates." with "Move to Applications" and "Not now". The move restarts the app. The offer shows once for each version. A copy in another writable folder also sees it, although it can update. Effort: Small.
  - **D.** At launch, a release build tests whether it can write to its own bundle. It shows B's offer only when the test fails because the volume is read-only. A copy in another writable folder sees no offer. Effort: Small.
  - **E.** When Squirrel.Mac refuses a downloaded update and the app is on a read-only volume, show B's offer. People who never get an update see no offer. Effort: Small.
- **Left out:**
  - C, the first offer after a failed update, which read the error text of Squirrel.Mac: E tests the volume itself, so E is better on every point.
  - A Mac installer package: it installs an app that root owns, so each later update needs an administrator password. It fails the goal.
  - Mokly's "Open release page" offer: it leaves the copy where it cannot update, so each version needs a manual install. D and E fix the cause with the same single dialog, so they are better on every point.
- **Wider fix:** None. The design call that waits for Squirrel.Mac covers every refusal. The options differ only in when they offer the move.
- **Previous examples:** Mokly's `ts/desktop/src/updates.ts` offers "Open release page" for Linux packages that cannot install an update.
- **Recommendation:** D. It asks once, at launch, and only when the copy cannot update, as many Mac apps do. The first recommendation was B, and the options check recommended E. E best avoids a prompt for people who never get an update.
- **Action:** ask the user, because each option except A adds a new dialog that no requirement covers.

### 5. Answer a manual update check

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `desktop/src/menu.ts:31` and `desktop/src/updates.ts:57`.
- **Background:**
  - **Help → Check for updates** starts the same check as the automatic checks. When a check already runs, it returns at once.
  - The protocol says a failed update check shows no error.
  - When no update exists, or the check fails, the menu item shows nothing. When an update downloads, the "The update is ready." dialog follows.
  - After Later, the app does not offer the same version again. A manual check then also shows nothing.
  - Mokly behaves the same.
- **Problem:** A person who asks for a check gets no answer when no update exists, when the check fails, or when an update already waits.
- **Impact if no action:** People can think that the menu item is broken. They cannot tell an up-to-date app from a failed check.
- **Root question:** How does a person who chooses Check for updates learn the result?
- **Options:**
  - **A.** Change nothing. A found update still shows its dialog after the download. Effort: Small.
  - **B.** Answer a manual check with a dialog. When no update exists: "Conductive is up to date." When the check fails: "Conductive could not check for updates. Try again later." When an update waits, it offers Restart now again. A found update downloads, and the existing dialog follows. A manual check during a running check waits for its result. Automatic checks stay silent. Effort: Small.
  - **C.** Answer a manual check with a native notification, with the texts of B. It does not interrupt, but people who turned off notifications see nothing. Effort: Small.
  - **D.** The Help menu item shows the result. After a manual check, it reads "Conductive is up to date" until the next check. While a downloaded update waits, it reads "Restart to update". No dialog opens. The person sees the answer only when they open the menu again. Effort: Small.
- **Left out:** A menu label that shows only "Checking for updates…": it gives no result, so it fails the goal. D shows the result in the menu instead.
- **Wider fix:** None. This is a design question, not a defect class.
- **Previous examples:** None found.
- **Recommendation:** B. A person who asks gets an answer, and the automatic checks stay silent. D's "Restart to update" item can join B at small cost.
- **Action:** ask the user, because B, C, and D change the protocol rule that a failed update check shows no error, or add new user-visible behaviour.

## Milestone 1: Documentation and protocol

Depends on: none

Update the docs so that they state the requirements and the decisions for
the work below.

- [ ] Update "Packages and updates" in `docs/protocol/desktop-app.md`.
  - [ ] Replace the rule that each build keeps the updater off. Builds that
        may publish turn it on. Other builds keep it off.
  - [ ] State that the feed is the GitHub releases of this repository,
        that each release carries the Mac app, which runs publish, and that
        the updater sees a release only after all its files upload.
  - [ ] State that the update dialog shows only after macOS accepts the
        update.
  - [ ] Add the outcomes of decisions 1 to 5.
- [ ] Update `desktop/README.md`: the steps of a release, the feed
      repository, the publish credential, the release files, and the
      one-time manual install for `0.1.0-alpha.1`.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 2: Release environment

Depends on: none

Apply the GitHub setting of decision 2. The Conductor app cannot change
repository settings, so the user does this step.

- [ ] The user changes the `desktop-release` environment as decision 2
      chooses.

## Milestone 3: Publish pipeline

Depends on: 1

Publish each signed release to the feed, and turn the updater on in the
builds that publish.

- [ ] Point the feed at `Firna-AI/remote-code` in `desktop/src/updates.ts`
      and `desktop/electron-builder.yml`.
- [ ] Set `dmg.writeUpdateInfo: false` in `desktop/electron-builder.yml`.
- [ ] Apply decision 3 for the release version.
- [ ] Add the publish script: draft, upload, check, and publish as a
      prerelease.
  - [ ] Add unit tests with a fake command runner: a new release, a
        leftover draft, a published release for the version, a missing
        file, and a failed upload.
- [ ] Update `.github/workflows/desktop-ci.yml`.
  - [ ] Apply decision 2 for the runs that publish.
  - [ ] Turn the updater on only in runs that may publish.
  - [ ] Add the publish job. It needs the signing job, gets
        `contents: write`, and runs no `npm ci` and no build.
  - [ ] Keep `latest-mac.yml` and the ZIP block maps in the
        `desktop-signed-packages` artifact.
- [ ] Run the desktop typecheck, lint, format check, and unit tests.

## Milestone 4: Update dialog, install location, and manual checks

Depends on: 1

Make the in-app update flow work for each copy.

- [ ] Show "The update is ready." only after Squirrel.Mac accepts the
      update.
- [ ] Apply decision 4.
- [ ] Apply decision 5.
- [ ] Add unit tests in `desktop/src/updates.test.ts` for each new outcome.
- [ ] Run the desktop typecheck, lint, format check, and unit tests.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

Check the whole change, review it, and open the pull request.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Publish `0.1.0-alpha.2` in the way that decisions 2 and 3 choose.
      Check that the feed gets a prerelease with the expected files.
- [ ] On a Mac, install `0.1.0-alpha.2` from its DMG into Applications.
      Publish `0.1.0-alpha.3`. Check that the app downloads it, offers
      Restart now, and restarts into the new version. Check that Later
      installs it at the next quit.
- [ ] Tell the people with `0.1.0-alpha.1` to install a new version by hand
      once.
