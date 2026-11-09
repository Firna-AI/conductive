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
publishes the signed files to a release of this repository, and the
builds that publish turn the updater on.

On the same day, the user chose the release flow in decision 3: "a PR that
updates on every push to main, and handles the release, merging that PR
creates a release". A release-please pull request on `main` sets each
version, and its merge creates the release. Decision 2 chooses which runs
get the signing secrets.

The change does not cover Linux or Windows apps, a download link on the
website, release notes in the app, or staged rollouts.

Contract owners:

- [Mac app protocol](../docs/protocol/desktop-app.md#packages-and-updates).
- The [desktop README](../desktop/README.md), and its
  [release part](../desktop/RELEASES.md).

## Design

Agent calls on 8 November 2026, updated on 9 November 2026 after decisions 1
and 3. The options check of the decisions added the calls that say so:

- A new workflow, `.github/workflows/release.yml`, runs
  `googleapis/release-please-action` v5.0.0, pinned by commit, on each push
  to `main`. It keeps one release pull request, and its merge creates the
  release. Reason: decision 3, and the release workflow of `mokly-ai/mokly`.
  Added on 9 November 2026.
- One root release-please component covers the whole product, with the
  `node` release type. Its version updates `package.json`,
  `desktop/package.json`, their lockfiles, and the root `CHANGELOG.md`. Tags
  are `vX.Y.Z`, and `bump-minor-pre-major` keeps breaking changes on the
  minor number before 1.0. Reason: the Mac app bundles the web app, so each
  product change is a Mac app change. Mokly also uses one root component.
  Added on 9 November 2026.
- When release-please creates a release, the same workflow runs the Mac
  checks, the signing job in `desktop-release`, and the publish job. Manual
  runs from `main` still sign without publishing. Added on 9 November 2026.
- `.github/workflows/release.yml` holds the whole release: release-please,
  the Mac checks, signing, and publishing. Its manual run from `main`
  replaces the manual run of the old release job. `desktop-ci.yml` keeps the
  pull request and push checks only. Reusable workflows hold the Mac checks
  and the signing steps, so the two workflows share them. The publish job
  runs on Linux, because it only uploads files with `gh`. Added on 9
  November 2026.
- release-please uses `secrets.RELEASE_PLEASE_TOKEN || github.token`, as in
  Mokly. With the built-in token, GitHub runs CI on the release pull request
  only after a person approves it. A stored token runs CI with no approval,
  and needs no code change. Decision 7 chooses. Added on 9 November 2026,
  and corrected on the same day after the options check.
- Only the signing job of a release turns the updater on. Manual, pull
  request, and local builds keep it off. Reason: macOS installs an update
  only into a Developer ID build, and a test build with the updater on could
  install a published version over itself.
- The release job publishes only after `test:packaged` passes.
- release-please creates each GitHub release as a draft with its tag, with
  `draft: true` and `force-tag-creation: true`. The publish job uploads every
  file to the draft. It publishes the draft only after GitHub lists every
  file with its full size. Reason: the updater reads only published
  releases, so users never see a partial release. Updated on 9 November 2026.
- When a run fails, the draft stays. A re-run of the failed jobs replaces the
  files of the draft. Updated on 9 November 2026.
- The publish step never changes or deletes a published release. When the
  feed already has a published release for the version, the step warns and
  publishes nothing.
- The tag of each release points to the merge commit of its release pull
  request. GitHub gives a release the date of that commit, so each release is
  newer than the release before it. From the options check, updated on 9
  November 2026.
- Every published release of this repository carries the Mac app files and
  `latest-mac.yml`. Reason: electron-updater reads the newest release of the
  whole repository, so a release without them stops all updates. Added on 9
  November 2026.
- Releases are full GitHub releases, as in Mokly. The updater reads GitHub's
  latest release, so `allowPrerelease` goes off in `desktop/src/updates.ts`,
  and `releaseType` in `desktop/electron-builder.yml` becomes `release`.
  Replaces the call of 8 November 2026 that kept prereleases.
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
- The first release is `0.1.0`. The manifest starts at `0.0.0` from a
  bootstrap commit, and the first `feat` commit after it gives `0.1.0`.
  People with the `0.1.0-alpha.1` build install it by hand once. Replaces
  the call of 8 November 2026 for `0.1.0-alpha.2`. Updated on 9 November
  2026, because no `Release-As` commit is necessary.
- The change has no mockup work. It adds no screen, and the mockups do not
  draw native dialogs.
- The first public release waits for the merge. Reason: a release reaches
  every installed copy, so it comes from reviewed code on `main`.

Calls of the docs implementor in Milestone 1, accepted on 9 November 2026:

- The new protocol rules carry no decision numbers, because the protocol's
  decision numbers point to the main plan.
- The protocol doc names no tool and no workflow file. The desktop README
  names them.
- The rule that the publishing job installs nothing and the signing job
  cannot write releases is a protocol requirement, because it protects the
  release credentials.
- The rule for failures covers a failed check, download, or install. Only a
  failed manual check shows an error, as decision 5 says.

## Decisions

The options check ran on 8 November 2026. Its report is
`.context/mac-app-updates/options-check.md`. It added options D to G of the
items, and it changed the recommendations of items 1 to 4.

On 9 November 2026, the user made this repository public and answered
decision 1 with a new option, H. The user also chose option D of decision 3,
a release pull request. The feed is now the releases of this
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
- **Location:** `.github/workflows/desktop-ci.yml`, the `release` job, and the deployment rules of `desktop-release`.
- **Background:**
  - Decision 3 chose a release pull request. Releases then start only on `main`, when the user merges that pull request. A tag that release-please creates with the built-in token starts no workflow.
  - The old release job still runs for every tag that starts with `v`, on any commit. It runs the workflow and the scripts of that commit.
  - The `desktop-release` environment holds the signing secrets. It admits `main` and every `v*` tag. It cannot check that the commit of a tag is on `main`.
  - The tag `v0.1.0-alpha.1` points to a commit of the notarization branch. It was pushed before that branch merged.
  - Agents push and tag with the user's account. `main` has no branch protection and no rules. "Agent merges: off" is a rule of `CLAUDE.md`, not a GitHub setting.
  - This repository is public since 9 November 2026. GitHub's Team plan allows required reviewers on the environments of a public repository.
  - Approving a waiting run needs the GitHub permission "Deployments: write". The Conductor app has only read access to deployments, so agents cannot approve a run.
  - With the feed in this repository, any run can create a release with its built-in token. So the signing secrets are the real guard: only a Developer ID build can install as an update.
- **Problem:** `desktop-release` still gives the signing secrets to every `v*` tag. So a tag on an unmerged branch can sign unreviewed code and publish it with its built-in token. A check inside the job does not stop it, because the branch can change the check.
- **Impact if no action:** One tag from a person or an agent can sign and ship unreviewed code to every user.
- **Root question:** Which commits may become a release that installed copies receive?
- **Options:**
  - **A.** Keep `desktop-release` and the old tag-triggered release job as they are. Releases come from the release pull request, but a branch tag can still sign and publish. Effort: Small.
  - **D.** Sign only in runs on `main`. `desktop-release` admits only `main`, and the tag trigger and the old tag release job go away. Manual runs from `main` still test signing. GitHub keeps the secrets from every other run, also when a branch edits the workflow. Updated on 9 November 2026 for the release pull request. Effort: Small.
  - **E.** Add a rule on `main` that blocks direct pushes and force pushes. Code then reaches `main` only through a pull request. Agents act as the user, so the rule stops a mistaken push, but not a merge through the API. It works together with B, D, or H. Effort: Small.
  - **H.** Require the user's approval for each run that uses `desktop-release`, and turn off the administrator bypass of that environment. GitHub then pauses each run that signs, shows its branch or tag, and waits for the user. The Conductor app cannot approve. Cost: one click for each release, after the merge of the release pull request, and one for each signing test. Effort: Small.
- **Left out:**
  - B, a check in the job that the tag is on `main`, and C, a tag rule for the user only: both guard a tag trigger. With the release pull request, D removes that trigger, so D is better on every point.
  - F, a second workflow from `main` that checks the tag and publishes: with the feed in this repository, a tag run can sign and publish by itself with its built-in token. So the check does not stop it, and F fails the goal.
  - G, a publish workflow in a separate feed repository behind an approval: decision 1 chose this repository as the feed. H gives the same approval here, without a second repository or credential, so H is better on every point.
- **Wider fix:** H. GitHub's settings keep the signing secrets from every run that the user did not approve, whoever pushes and whatever the branch changes.
- **Previous examples:** The tag `v0.1.0-alpha.1` on the notarization branch, Actions run 42519666993.
- **Related:**
  - Item 1: its chosen H puts the feed in this repository, so the signing secrets guard the release.
  - Item 3: its chosen release pull request starts each release on `main`.
  - `plans/follow-ups/branch-tags-get-signing-secrets.md`: the same tag path gives branch code the signing secrets. D or H of this item fixes that item too.
- **Recommendation:** D. Releases then come only from the release pull request on `main`, and GitHub enforces it. The merge of that pull request stays the user's single step. The first recommendation was B, the options check recommended D, and H was recommended while tags were the trigger. H best protects the codebase, because it also stops a release that an agent merges. E can join D or H at small cost.
- **Action:** ask the user, because D removes the tag trigger and changes the environment rules that the user approved on 8 November 2026, and H adds a gate.
- **Chosen:** D, by the user on 9 November 2026: "2 = D". This also fixes `plans/follow-ups/branch-tags-get-signing-secrets.md`.

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
- **Chosen:** D, by the user on 9 November 2026: "I was thinking we would have a PR that updates on every push to main, and handles the release, merging that PR creates a release - like we have done in other repos like mokly/mokly-cloud". The agent had recommended C. The precedent is `.github/workflows/release.yml` of `mokly-ai/mokly`, with `googleapis/release-please-action`. `mokly-ai/mokly-cloud` only skips release pull requests in its site workflow.

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
- **Chosen:** A in this change, and D as a follow-up, by the user on 9 November 2026: "4 = A now - D as a follow up". The follow-up item `plans/follow-ups/read-only-copies-never-update.md` holds D.

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
  - **B.** Answer a manual check with a dialog. When no update exists: "Conductive is up to date." When the check fails: "Conductive could not check for updates. Try again later." When an update waits, it offers Restart now again. When a new version is found: "Downloading the new version. Conductive tells you when it is ready." The existing dialog follows when it is ready. A manual check during a running check waits for its result. Automatic checks stay silent. Updated on 9 November 2026 with the text for a found version. Effort: Small.
  - **C.** Answer a manual check with a native notification, with the texts of B. It does not interrupt, but people who turned off notifications see nothing. Effort: Small.
  - **D.** The Help menu item shows the result. After a manual check, it reads "Conductive is up to date" until the next check. While a downloaded update waits, it reads "Restart to update". No dialog opens. The person sees the answer only when they open the menu again. Effort: Small.
- **Left out:** A menu label that shows only "Checking for updates…": it gives no result, so it fails the goal. D shows the result in the menu instead.
- **Wider fix:** None. This is a design question, not a defect class.
- **Previous examples:** None found.
- **Recommendation:** B. A person who asks gets an answer, and the automatic checks stay silent. D's "Restart to update" item can join B at small cost.
- **Action:** ask the user, because B, C, and D change the protocol rule that a failed update check shows no error, or add new user-visible behaviour.
- **Chosen:** B, by the user on 9 November 2026: "5 = B".

### 6. Answer a failed download after a manual check

The options check of 9 November 2026 added options D, E, and F, widened the
root question, and changed the recommendation from B to E. Its report is
`.context/mac-app-updates/options-check-6-7.md`.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation. The docs implementor found it in Milestone 1.
- **Category:** Docs or spec.
- **Location:** "Updates in the app" in `docs/protocol/desktop-app.md`, and the manual check in `desktop/src/updates.ts`.
- **Background:**
  - Decision 5 chose a dialog for each manual check. When a check finds a new version, the app says "Downloading the new version. Conductive tells you when it is ready."
  - The download is about 130 MB. It can fail, for example when the network drops.
  - After the download, macOS can still refuse the version. It always refuses on a read-only copy, such as a copy that runs from its mounted DMG.
  - electron-updater reports a failed download and a refusal by macOS through the same download promise. Its own `update-downloaded` event fires between the download and the handoff to macOS, so the app can tell the two apart.
  - The protocol says that a failed check, download, or install shows no error. Only a failed manual check shows one.
  - After a short failure, the next automatic check, at most 4 hours later, downloads again and shows "The update is ready.".
- **Problem:** After "Downloading the new version.", a failed download or a refusal by macOS leaves the person without an answer.
- **Impact if no action:** The person waits for a message that never comes. When the failure lasts, as on a read-only copy, they never learn why.
- **Root question:** How does a person who chose Check for updates learn the final outcome, also when the new version never becomes ready?
- **Options:**
  - **A.** Change nothing. The person can choose Check for updates again. Effort: Small.
  - **B.** When a download that a manual check started fails, show "Conductive could not download the update. Try again later." A refusal by macOS stays silent. Effort: Small.
  - **C.** Change the found-version text of decision 5 so that it promises nothing, such as "Downloading the new version.". A failure then stays silent. Effort: Small.
  - **D.** Answer a manual check once, with its final outcome. After a found version, no dialog shows until macOS accepts the version or a step fails. The person gets no answer during the download. Effort: Small.
  - **E.** Keep the found-version answer, and follow that version until macOS accepts it. A failed download shows B's text. A refusal by macOS shows "Conductive could not install the update. Try again later." On a read-only copy, it shows "Move Conductive to Applications to install the update." instead. Automatic downloads stay silent. Effort: Small.
  - **F.** Answer a manual check in a small progress window, as the Mac update framework Sparkle does. The window shows the download, then the ready state or the failure. It needs a new window, a mockup, and a protocol change. Effort: Large.
- **Left out:**
  - The text of a failed check: it names the wrong failure, and the copy rules say that an error names what failed. B is better on every point.
  - A notification, a Help menu label, or a Dock progress bar as the answer: decision 5 rejected an answer that the person can miss.
- **Wider fix:** E. It ends each manual check with one true answer, whatever step fails after the promise.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/read-only-copies-never-update.md` adds an offer at launch to move a read-only copy into Applications. E's read-only text only explains a refusal after a manual check.
- **Recommendation:** E. It costs the same as B, and its answer stays true for every failure after the promise, also on a read-only copy, where B's "Try again later." never helps. The first recommendation was B.
- **Action:** ask the user, because B, D, E, and F add or change answers that no requirement covers, and C changes the found-version text of decision 5.

### 7. Give the release pull request a green check

The options check of 9 November 2026 moved D to **Left out**, because GitHub
ignores checks from a `workflow_dispatch` run on a pull request. It added
options E and F and changed the recommendation from D to A.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Process.
- **Location:** The release-please job of `.github/workflows/release.yml`, and the section "CI" of `AGENTS.md`.
- **Terms:**
  - **`Complete gate`:** the job of `.github/workflows/ci.yml` that runs `npm run check`.
  - **Fine-grained token:** a personal access token that reaches only the repositories and permissions that its owner picks.
- **Background:**
  - `AGENTS.md` says that a commit reaches `main` only through a pull request with a green `Complete gate` check. No ruleset enforces it yet, and `main` has no protection.
  - release-please opens the release pull request. The workflow reads `secrets.RELEASE_PLEASE_TOKEN || github.token`, as Mokly's does.
  - With the built-in token, the pull request's author is `github-actions[bot]`. Since 11 June 2026, GitHub runs workflows on such a pull request only after a person with write access approves them.
  - With the built-in token, release-please also needs the repository setting "Allow GitHub Actions to create and approve pull requests".
  - A check from a `workflow_dispatch` run does not show on a pull request, and it does not count as a required check.
  - In `mokly-ai/mokly` and `futex-ai/ui`, the release pull requests have `calummoore` as their author, so a stored token opens them, and CI runs without a click.
  - The release pull request changes only versions and `CHANGELOG.md`. The release workflow runs the Mac checks before it signs. CI on `main` runs beside it and does not block it.
- **Problem:** With the built-in token, the release pull request gets a green `Complete gate` check only after a manual approval for each update.
- **Impact if no action:** Each release needs an approval click and a wait of about 10 to 13 minutes, or a merge without the check that `AGENTS.md` requires.
- **Root question:** How does the release pull request meet the rule that a pull request reaches `main` only with a green check?
- **Options:**
  - **A.** A fine-grained token, owned by the user, for `Firna-AI/remote-code` only, with read and write access to contents, issues, and pull requests. The user stores it as the repository secret `RELEASE_PLEASE_TOKEN`. CI then runs on each update of the release pull request with no click. The token expires at least once a year. Workflows of any branch in this repository can read it, but agents already act as the user. Effort: Small.
  - **B.** A GitHub App for releases, installed only on this repository. The job makes a one-hour token with `actions/create-github-app-token`. No person owns it, and it does not expire. Effort: Medium.
  - **C.** Exempt the release pull request from the rule in `AGENTS.md`. Effort: Small.
  - **E.** Keep the built-in token. Turn on "Allow GitHub Actions to create and approve pull requests". Before each merge, the user selects the approval for the pending runs, and then waits for CI. No code change and no stored token. Effort: Small.
  - **F.** C, and the release workflow runs the complete gate on the release commit before it signs, through a `workflow_call` trigger on `ci.yml`. A failed gate leaves the tag and the draft, so the fix ships as the next version. It adds a gate. Effort: Small.
- **Left out:**
  - D, starting `ci.yml` with `workflow_dispatch` on the release branch: GitHub ignores its checks on the pull request and for required checks, so D fails the goal.
  - Close and reopen the release pull request by hand: E needs one click and keeps the pull request open, so E is better on every point.
- **Wider fix:** F's gate, for the release path. It stops a release whose commit fails the complete gate, whatever the pull request shows.
- **Previous examples:** `.github/workflows/release.yml` of `mokly-ai/mokly` reads `RELEASE_PLEASE_TOKEN`.
- **Recommendation:** A. The user already works this way in `mokly-ai/mokly` and `futex-ai/ui`, and the workflow already reads the secret, so CI runs on every update with no click and no code change. The first recommendation was D, which fails. E is best without a stored token. F best protects the release itself.
- **Action:** ask the user, because A, B, and E need a credential or a setting that only the user can create, C changes a rule of `AGENTS.md`, and F adds a gate.

## Milestone 1: Documentation and protocol

Depends on: none

Update the docs so that they state the requirements and the decisions for
the work below.

- [x] Update "Packages and updates" in `docs/protocol/desktop-app.md`.
  - [x] Replace the rule that each build keeps the updater off. Builds that
        may publish turn it on. Other builds keep it off.
  - [x] State that the feed is the GitHub releases of this repository,
        that each release carries the Mac app, and that the updater sees a
        release only after all its files upload.
  - [x] State the release flow: the release pull request on `main` sets the
        version, and its merge creates the release. State which runs sign.
  - [x] State that the update dialog shows only after macOS accepts the
        update.
  - [x] Add the outcomes of decisions 1 to 5.
- [x] Update `desktop/README.md` and the root `README.md`: the release pull
      request, the release files, CI on the release pull request, and the
      one-time manual install for `0.1.0-alpha.1`.
- [x] Check each relative link of the changed Markdown files.
- [x] Move the release part of `desktop/README.md` into
      `desktop/RELEASES.md`, because the README passed 300 lines.

## Milestone 2: Release environment

Depends on: none

Apply the GitHub setting of decision 2. The Conductor app cannot change
repository settings, so the user does this step.

- [ ] The user changes the deployment rules of the `desktop-release`
      environment to admit only `main`, as decision 2 chose. This can happen
      at once, because no release uses a tag any more.
- [ ] The user applies the setting or the token of decision 7. Without a
      `RELEASE_PLEASE_TOKEN` secret, release-please needs "Allow GitHub
      Actions to create and approve pull requests" in the repository's
      Actions settings.

## Milestone 3: Publish pipeline

Depends on: 1

Publish each signed release to the feed, and turn the updater on in the
builds that publish.

- [x] Point the feed at `Firna-AI/remote-code` in `desktop/src/updates.ts`
      and `desktop/electron-builder.yml`. Turn `allowPrerelease` off, and set
      `releaseType: release`.
- [x] Set `dmg.writeUpdateInfo: false` in `desktop/electron-builder.yml`.
- [x] Add `release-please-config.json` and `.release-please-manifest.json`:
      one root `node` component, extra files for `desktop/package.json` and
      the lockfiles, `draft`, `force-tag-creation`, and a bootstrap commit
      at the current `main`.
- [x] Move the signing steps into a reusable workflow for the release
      workflow and for manual runs.
- [x] Add `.github/workflows/release.yml`: release-please, the Mac checks,
      signing with the updater on, and the publish job.
- [x] Add the publish script: upload to the draft, check, and publish.
  - [x] Add unit tests with a fake command runner: a new release, a
        leftover draft, a published release for the version, a missing
        file, and a failed upload.
- [x] Update `.github/workflows/desktop-ci.yml`.
  - [x] Remove the tag trigger and the old tag release job, as decision 2
        chose. Delete `plans/follow-ups/branch-tags-get-signing-secrets.md`
        in the same commit.
  - [x] Keep `latest-mac.yml` and the ZIP block maps in the signed
        artifacts.
- [x] Run the desktop typecheck, lint, format check, and unit tests.

## Milestone 4: Update dialog and manual checks

Depends on: 1

Show the update dialog only for an update that can install, and answer
each manual check.

- [x] Show "The update is ready." only after Squirrel.Mac accepts the
      update.
- [x] Apply decision 5: the dialogs that answer a manual check. Decision 4
      chose no change in this branch.
- [ ] Apply decision 6, when the user answers it.
- [x] Add unit tests in `desktop/src/updates.test.ts` for each new outcome.
- [x] Run the desktop typecheck, lint, format check, and unit tests.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

Check the whole change, review it, and open the pull request.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
      Evidence: `.context/mac-app-updates/gate.log`.
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

- [ ] Merge the first release pull request. Check that `v0.1.0` becomes a
      published release with the expected files.
- [ ] On a Mac, install `0.1.0` from its DMG into Applications. Merge the
      next release pull request. Check that the app downloads the new
      version, offers Restart now, and restarts into it. Check that Later
      installs it at the next quit.
- [ ] Tell the people with `0.1.0-alpha.1` to install a new version by hand
      once.
