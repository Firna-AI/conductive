# Builds for added repositories

Status: Active. On branch `calummoore/new-repo-build-recreation`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An admin adds a repository on the Repositories tab of the org settings.
Today nothing builds it. The org image gets the repository only at the
next build, which an admin starts with Build computer on the Cloud
computer tab. Until then, New workspace offers the repository, and a
create in it fails with "The repository is not available." The Cloud
computer tab also says "The install script changed" after a repository
change, although the script did not change.

This change starts a build when an admin adds a repository. New
workspace shows a repository that the org image does not hold yet as
off, with a note (decision 240). The Worker lists the saved changes that
the org image does not hold. A repository change gets its own notice on
the Repositories tab and on the Cloud computer tab. The install script
notice shows only for an install script change (decision 241). The
change does not start a build for an install script change or for a
removed repository. It does not fix the lost added build of
[The added build after the first build can be lost](follow-ups/added-build-can-be-lost.md),
or [Build computer during a refresh starts no build](follow-ups/build-during-refresh-starts-nothing.md).

Contract owners:

- [Org image](../docs/protocol/org-image.md).
- [Create a workspace](../docs/protocol/create-a-workspace.md).
- The [lifecycle README](../worker/lifecycle/README.md) and
  [Image builds](../worker/lifecycle/image-builds.md).
- The [app README](../src/app/README.md), the
  [screens](../src/app/screens.md), and the
  [members README](../src/members/README.md).

Replaced ways:

- `OrgSettings.needsBuild`, which is true when the install script or the
  repository choice changed after the reference build →
  `BuildsResponse.changes`, the list of the saved changes that the org
  image does not hold. Consumers:
  `worker/app-api/feature-settings-data.ts`, `src/shared/org-settings.ts`,
  `src/app/api/read-settings.ts`, `src/members/api/parseSettings.ts`,
  `src/app/computer-model.ts`, `src/shell/settings/ComputerTab.tsx`,
  `src/shell/settings/BuildCard.tsx`, `src/members/MemberComputerView.tsx`,
  `src/app/dev/state.ts`, `src/app/dev/seed.ts`,
  `src/members/dev/devComputer.ts`, `src/test-support/fixtures/core.ts`,
  and the tests that assert the field. Moved in Milestone 4. The Worker
  keeps `needsBuild` in its reply for Milestones 3 and 4 only. Deleted in
  Milestone 5.

## Terms

- **Org image:** the saved snapshot that every new cloud computer of an
  org starts from. The last good build or refresh made it.
- **Job:** a build or a refresh of the org image. One job runs at a time
  in each org. A refresh only fetches the new commits of the repositories
  that the org image holds. It runs no install script.
- **Waiting repository:** a chosen repository that the org image does not
  hold yet.
- **Added build:** one more build that the app starts by itself when a
  job ends. Today only the first good build of an org gets one, for a
  change during that build (decision 151).

## Decisions

### Decision 240: New workspace offers repositories before their build

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review. It is the follow-up item
  `plans/follow-ups/new-workspace-offers-unbuilt-repositories.md` of
  2026-11-08. This change fixes it and deletes that item.
- **Category:** Product bug.
- **Location:** `src/shell/new-workspace/useNewWorkspaceForm.ts:67`,
  `worker/lifecycle/published-image-data.ts:90`,
  `worker/app-api/feature-repositories.ts:52`.
- **Background:** The Repositories tab saves each added repository at
  once, and starts no build. A create reads the repositories of the org
  image, not the current choice. New workspace lists every chosen
  repository.
- **Problem:** After an admin adds a repository, New workspace offers it
  before a build has cloned it. The first message then fails, and the
  words do not say why or what to do.
- **Impact if no action:** Each member who picks the new repository before
  the next build gets a failed create. The repository waits until an
  admin finds Build computer.
- **Root question:** How does a member start a workspace in a repository
  that an admin just added, without a failed create? The options check
  replaced "How does a person who starts a workspace know which
  repositories are ready?", because the impact also names the wait for
  Build computer.
- **Options:**
  - **A.** Change only the refusal. It says that the repository is ready
    after the next build, and it links an admin to the Cloud computer
    tab. Effort: Small.
  - **B.** New workspace offers only the repositories of the org image. A
    chosen repository that waits for a build shows as off, with a short
    note. The app must read the repositories of the image. Effort: Medium.
  - **C.** A change of the repositories starts a build by itself. This
    changes decision 12. Effort: Medium.
  - **D.** The image coordinator starts a later build when no job runs and
    the org image lacks a chosen repository. It needs a good newest build
    and an admin who is not suspended. The add still starts its build at
    once. D replaces a new rule at the end of a job, so a lost cleanup
    step or a failed start tries again at the next alarm. A start that
    keeps failing needs a wait. Effort: Medium.
  - **E.** Accept a create in a waiting repository. The workspace keeps its
    first message, and it starts when a build that holds the repository
    succeeds. It changes the start limit and the path that creates every
    workspace, as decision 152 says, and a failed build needs a new state
    for the waiting workspaces. Effort: Large.
  - **F.** A start in a repository that the org image lacks clones that
    repository after the start from the image. The install script never
    prepares that repository. The start needs a folder and a token for
    the clone, and `create-a-workspace.md` and `agent-tools.md` change.
    Effort: Large.
- **Left out:**
  - A refresh that clones an added repository into the org image. The
    image would then hold a copy that the install script never prepared,
    which breaks decision 13.
  - One image for each repository. Decision 13 rejected it, because each
    image costs its own snapshot and starts.
- **Wider fix:** B for the menu, when it reads the same data of the org
  image as the check of the create. D for a chosen repository that never
  reaches the image.
- **Previous examples:** None found.
- **Related:** Decision 241, shared data. Both read the repositories of
  the org image.
- **Recommendation:** B and C, as the user chose, with D for the later
  start of C. The options check changed it from B, because B alone keeps
  the wait for Build computer.
- **Decision:** On 2026-11-10 the user chose B and C together, with C for
  an added repository only: "1 = B - but we should start a new build
  when a repo is added". The design below builds the later start without
  D, as a call of the agent.

### Decision 241: A repository change says "The install script changed"

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review, on 2026-11-10, while the agent answered whether an
  added repository starts a build.
- **Category:** UX wording.
- **Location:** `src/app/first-build.ts:57`,
  `worker/app-api/feature-repositories-data.ts:22`,
  `worker/app-api/feature-settings-data.ts:50`.
- **Terms:**
  - **Settings revision:** a counter in the settings of each org. A save
    of the install script or of the repository choice raises it. Each
    build records it.
- **Background:** The Cloud computer tab shows a notice under the install
  script while saved settings wait for a build. The Worker sets
  `needsBuild` when the settings revision differs from the revision of
  the build of the org image. A repository save also raises the
  revision, because the added build of decision 151 reads it. The notice
  has one fixed title, "The install script changed".
- **Problem:** After an admin adds or removes a repository, admins and
  members read "The install script changed". The install script did not
  change.
- **Impact if no action:** People look for a script change that did not
  occur.
- **Root question:** How do admins and members learn which saved change
  the org image does not hold yet? The options check replaced "How does
  the Cloud computer tab say which saved change waits for a build?",
  because the answer puts a notice on the Repositories tab too.
- **Options:**
  - **A.** Use words that fit both causes, such as "Your changes wait for
    a build". The reader does not learn which change waits. Effort:
    Small.
  - **B.** The Worker compares the build of the org image with the current
    settings, and says which part changed. The notice then names the
    repositories, the install script, or both. Effort: Medium.
  - **C.** The install script notice shows only for an install script
    change. A repository change shows its own notice, with Build
    computer, on the Repositories tab. Effort: Medium.
  - **D.** The settings revision counts only install script saves. The
    added build of decision 151 then compares the repositories of its job
    with the chosen ones. A script that an admin changes and then changes
    back still shows the notice. Effort: Medium.
  - **E.** Start a build at each save of a changed install script and at
    each removal, as at an add. A change then waits only while its build
    runs, or after a failed build. It changes decision 12 for every
    change, and each build is a start. Effort: Medium.
  - **F.** Mark each row of the repository lists, for admins and members.
    A waiting repository says when it is ready, and a removed repository
    that the image still holds says that it leaves at the next build.
    Effort: Medium.
- **Left out:** No change, because the notice states a false fact.
- **Wider fix:** B, built as one Worker list of the differences between
  the org image and the saved settings. Each notice reads that list.
- **Previous examples:** None found.
- **Related:** Decision 240. Its option C starts a build for each added
  repository, so the repository notice mostly shows a running build.
- **Recommendation:** C, as the user chose, with its notice on both tabs,
  built on the Worker list of B. The options check changed it from B.
- **Decision:** On 2026-11-10 the user chose C, and asked for a notice on
  the Cloud computer tab too: "2 = C - but should also show something on
  the Cloud computer tab if the user goes there". The notices read the
  Worker list of B.

## Design

### Builds

My calls, 2026-11-10:

- An added repository starts a build at once, for the admin who added
  it. A failed start keeps the saved choice and writes one warning.
  Reason: decision 240.
- The add starts the build also when the newest build failed. Reason: the
  admin's add starts it, as Try again does. The app still starts no
  build by itself after a failed build (decision 12).
- A removed repository starts no build. It waits for the next build, as
  today, and the repository notice offers Build computer. Reason: the
  user named added repositories. A removed repository leaves only an
  unused folder in new workspaces until the next build.
- When a job runs, the add starts no second job. When that job succeeds,
  and the job lacks a chosen repository, the app starts one added build.
  The newest build must have succeeded. Reason: without the added build,
  a repository added during a job never builds. A failed build gets no
  added build, because Try again then builds the current choice, as
  decision 151 says.
- So an add during a refresh that follows a failed build gets no build.
  The repository notice then offers Try again. Reason: the app starts no
  build by itself after a failed build. This case needs an add during
  the short run of a refresh, after a failed build that nobody tried
  again.
- The added build runs for the first admin who is not suspended, as the
  added build of decision 151 does.
- The later start uses the end of the job, not the image coordinator of
  option D of decision 240. Reason: the end of the job reuses the added
  build that decision 151 tested, with one more condition. D needs a new
  start path in the coordinator, and a wait for a start that keeps
  failing. A lost added build is rare, and the repository notice then
  offers Build computer. Milestone 3 adds D as an option to the follow-up
  item about the lost added build, because D also fixes that item.
- No delay groups several adds into one build. The first add starts its
  build at once, and the adds during that build share one added build.
  Reason: one add is the common case, and it then has no wait. A burst of
  adds costs one more build.
- The added build of decision 151 stays. The first good build still gets
  one for each change of the install script or the repositories during
  it.

### Contracts

My calls, 2026-11-10:

- The add of a repository, `PUT` on the repository path: the reply does
  not change. The Worker starts the build after the save, when the save
  changed the repository from removed to added.
- `BuildsResponse.changes` lists the saved changes that the org image does
  not hold. Reason: the wider fix of decision 241. One comparison in the
  Worker serves each screen.
  - `installScript`: true when the saved install script differs from the
    script that the org image ran. That is the script of the newest build
    that succeeded, or of the newest build while the org has no image.
    Reason: a refresh stores the saved script, but it never runs it.
  - `addedRepositories`: the ID and the full name of each chosen
    repository that the org image does not hold.
  - `removedRepositories`: the ID and the full name of each repository
    that the org image holds and the org no longer chose.
- Both repository lists are empty while the org has no image. So a
  repository waits only once the org has an image, and the notices of the
  first build cover the time before. Reason: the mockups of Milestone 1
  showed that the plan did not say what waits before the first good
  build.
- The repository lists come from the same image data as the check of the
  create.
- The repository save keeps its revision raise, because the added build
  of decision 151 reads it. Reason: option D of decision 241 would change
  the trigger of decision 151.
- A create in a waiting repository keeps HTTP 404 and the code
  `repository_not_found`. Its words say that the repository is ready
  after the next build. A repository that the org did not choose keeps
  "The repository is not available."

### Screens

My calls, 2026-11-10. The mockups settle the words.

- New workspace, as a page and as a dialog: the repository menu lists
  each chosen repository. A waiting repository is off, with a note that
  says when it is ready. The form picks the first ready repository. A
  removed repository stays out of the menu, as today.
- When the repository of the form waits, such as in a kept draft, Send
  is off and the form says when the repository is ready.
- When the org has an image and no chosen repository is ready, Send is
  off and a notice says why. An admin gets a link to the Cloud computer
  tab after a failed build, or while no build runs. While a build runs,
  the notice shows its progress without a link, as the notice of the
  first build does, because the admin has nothing to do on that tab.
- The repository notice shows on the Repositories tab and on the Cloud
  computer tab, for admins and members. It shows while `changes` lists an
  added or a removed repository, and the org has an image. Before the
  first good build, the notices of the first build cover that time. The
  first state that applies wins:
  1. No build runs, and the newest build failed: the changes wait for a
     good build. An admin gets Try again.
  2. A build runs, and an added repository waits: the added repositories
     are ready after the build. No button.
  3. Else, such as during a refresh, after a removal, or after a failed
     start: the changes wait for a build. An admin gets Build computer.
  - A refresh never counts as a running build, because the build cards
    do not show it.
  - A member gets no button, and reads that an admin can act.
  - On the Cloud computer tab, the notice has no button, because the
    build card under it has the same action. The Repositories tab keeps
    the button.
  - The words say "after the build", not "after this build". Reason: an
    add during a build waits for the one more build that follows it.
- The install script notice shows only when `changes.installScript` is
  true. Its words stay.
- After an add, the app reads the builds again, so that the new build
  shows at once.

Calls of Milestone 1, 2026-11-10, from the mockups:

- The rows of the repository lists get no mark, so option F of decision
  241 is not taken. Reason: the notice names the repositories.
- The repository notice sits at the top of the Repositories section, and
  under the intro of the Cloud computer tab.
- A failed build gives the notice the danger tone, a running build a
  spinner, and a wait the hammer icon, as the existing notices do.
- An off row of a menu fades only its label, so that its note stays
  readable.
- The description of the Repositories tab says that adding a repository
  starts a build.
- A kept draft keeps its waiting repository, and the hint under the
  repository picker hides while the repository of the form waits.
- The build history stays closed while a repository change waits, as it
  does for a changed install script.
- The waiting states of New workspace show on the page only. The dialog
  uses the same menu and notices. Its page showed six screens when
  Milestone 1 ran. The merge of `origin/main` moved its states into child
  pages, which fixed that page, so its follow-up item is gone.
- A removal that the install script still uses fails the next build, as
  it does today, and the log of that build shows the failed `cd`. On
  2026-11-10 the user chose A, no change, over a sentence in the notice
  (B) and a warning at the removal (C): "1 = A".

Calls of Milestone 2, 2026-11-10, from the protocol docs:

- The refusal of a waiting repository covers every create, also a
  create through the agent tools.
- A waiting repository turns on when a build that holds it succeeds. The
  app reads the builds again while a build runs, and so it learns of the
  success.
- The protocol docs do not name `BuildsResponse.changes`. The READMEs of
  Milestones 3 and 4 name it.
- The protocol docs keep the words "an admin who is not suspended" for
  the starter of an added build.
- The reason against a build at each removal and each install script
  change: such a change blocks no new workspace, and each build is a
  start.
- The public guides of the marketing site restate the rules of the org
  image. They came with `origin/main`, so the merge of `origin/main`
  updates them.
- Two problems outside the scope wait for the user, as follow-up items:
  [The push refresh trigger disagrees with the code](follow-ups/push-refresh-trigger-mismatch.md)
  and
  [The clone token risk misses a new repository](follow-ups/clone-token-risk-new-repository.md).

Calls of Milestone 4, 2026-11-10, from the screens:

- The app reads the builds again after each repository save, also a
  removal, and after each install script save, so that each notice shows
  at once.
- The app no longer reads the settings again when a build ends. That read
  existed only to refresh `needsBuild`. The builds, which the app reads
  again at the end of a build, now carry the changes.
- The New workspace notice is built from the mockup `Notice` and the
  shared words, because the mockup notice imports catalogue links. The
  members UI keeps its own `Notice` with the shared words, as its README
  asks.
- A waiting repository keeps its place in the repository menu.
- In a suspended org, the notice names no admin, because nobody can act.
- The app does not check again that the org has an image. The Worker
  sends empty repository lists while the org has no image.
- A kept draft whose repository the org removed keeps its old behaviour.
  [A kept draft can hold a removed repository](follow-ups/kept-draft-removed-repository.md)
  records it.

Calls of the review, 2026-11-10:

- The condition of the added build stays org-wide: the newest build of
  any provider account must have succeeded. Reason: a failed build of any
  account points to an install script problem, and the install script is
  org-wide.
- The install script comparison and the repository lists of `changes`
  use the provider account of the org image that they describe.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the new states of New workspace, the Repositories tab, and the Cloud
computer tab, for an admin and for a member. Read the `mockups` and
`product-ui` skills first.

- [x] `app/new-workspace` and `app/new-workspace/dialog`: a variant with a
      waiting repository, off in the open repository menu, with its note.
  - The dialog got no variant, as the calls of Milestone 1 say. The page
    `app/new-workspace/waiting-repository` draws the states.
- [x] `app/new-workspace`: a variant where the repository of a kept draft
      waits, and a variant where no chosen repository is ready. Send is
      off in both.
- [x] `app/org-settings/repositories`: a variant for each state of the
      repository notice: a build runs after an add, the newest build
      failed, and a removal waits for a build.
- [x] The `member` variant of `app/org-settings/repositories`: the
      repository notice of a member, without a button.
- [x] `app/org-settings/cloud-computer`: a `repositories-changed` variant
      with the repository notice, and the same notice in
      `app/org-settings/cloud-computer/member`. `script-changed` keeps the
      install script notice for a script change only.
- [x] Update `docs/mockups/catalogue.md` for each new variant, with
      decisions 240 and 241.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/added-repository-builds/` holds the check logs
(`m1r2-*.log`) and the screenshots.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements of decisions 240 and 241 and of the design calls
above in the protocol docs.

- [x] `docs/protocol/org-image.md`: an added repository starts a build,
      the added build after a job, a removal waits for a build, and the
      install script notice and the repository notice on both tabs.
      Change the lines of decision 12 and the reason of "A build at each
      save".
- [x] `docs/protocol/org-image.md`: say that a refresh fetches the
      repositories that the org image holds, not each chosen repository.
      The code does this already, and a change of the repositories takes
      effect at a build.
- [x] `docs/protocol/create-a-workspace.md`: the repository menu with its
      waiting repositories, Send off for a waiting repository, and the
      words of the refusal.
- [x] Check `docs/protocol/orgs-and-members.md` and `docs/architecture.md`
      for each sentence that states the old rule.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact.
- [x] Check the rows in `src/marketing/from-conductor/` for a listed
      feature that this change ships, starts, or drops.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2b: Public guides

Depends on: 2

The merge of `origin/main` brought the public guides of the marketing
site, and a rule that a changed protocol fact updates each guide sentence
that restates it.

- [x] Merge `origin/main` into the branch with the `git-merge` skill.
- [x] Read each guide under `src/marketing/docs/` in full. Update each
      sentence that restates a fact of decisions 240 and 241, or of the
      refresh rule of Milestone 2.
- [x] Run the guide tests and `npm run site:build`, and check each
      relative link of each changed guide.

Evidence: `.context/added-repository-builds/m2b-*.log`.

## Milestone 3: Worker and API contract

Depends on: 2

Build each added repository, and give the app the data of the new
notices. The app keeps its current screens.

- [x] Start a build in `changeShellRepository` in
      `worker/app-api/feature-repositories.ts` after a save that changed
      a repository from removed to added. Catch a failed start and warn,
      as `createShellOrg` does.
- [x] In `publishBuild` of `worker/lifecycle/build-admission-data.ts`,
      also give a job that succeeded the phase `cleanup-build` when it
      lacks a chosen repository and the newest build succeeded. Keep the
      rule of decision 151.
- [x] Add `changes` to `BuildsResponse` and to `readBuildHistory` in
      `worker/lifecycle/build-data.ts`. Read the repositories of the org
      image as `publishedImageSource` does.
- [x] Keep `needsBuild` in the settings reply for Milestones 3 and 4.
- [x] Give the refusal of a create in a waiting repository its new words.
- [x] Read `changes` in the parsers of `src/app/api/` and
      `src/members/api/`.
- [x] Return `changes` from the dev fakes in `src/app/dev/` and
      `src/members/dev/`. The fake add of a repository starts a fake
      build, as the Worker does.
- [x] Add Worker tests:
  - [x] An add starts a build for the admin. A second save of the same
        repository starts none. A removal starts none.
  - [x] An add after a failed build starts a build.
  - [x] An add during a build gets one added build after that build
        succeeds, and none after it fails.
  - [x] An add during a refresh gets one added build after the refresh
        succeeds, and none when the newest build failed.
  - [x] `changes` lists the added and the removed repositories.
  - [x] `changes.installScript` turns on for an install script change,
        stays off for a repository change, and stays on after a refresh.
  - [x] The refusal words of a waiting repository and of a repository
        that the org did not choose.
- [x] Update `plans/follow-ups/added-build-can-be-lost.md`: the added
      build now follows each job that succeeds, and option D of decision
      240, the start in the image coordinator, is a new option there.
- [x] Update the lifecycle README, `image-builds.md`, and the app-api
      README.
- [x] Run the targeted tests, `npm run typecheck`, and `npm run lint`.

## Milestone 4: Screens

Tags: ui

Depends on: 3

Show the waiting repositories and the repository notice, as the mockups
of Milestone 1 draw them. Read the `product-ui` and `typescript` skills
first.

- [x] New workspace: the repository menu, the first ready repository,
      Send off for a waiting repository, and the notice when no
      repository is ready.
- [x] The repository notice on the Repositories tab and on the Cloud
      computer tab, in `src/shell/settings/` for an admin and in
      `src/members/` for a member. Each tab reads the builds.
- [x] Move the consumers of `needsBuild` to `changes.installScript`. The
      install script notice then shows only for a script change.
- [x] Use the shared parts of the mockups:
      `docs/mockups/src/components/settings/RepositoryNotice.tsx` and the
      words in `repositoryChangeCopy.ts`.
- [x] Fade only the label of an off menu row in `src/shell/ui/`, as the
      mockup menu does.
- [x] Give the Repositories tab of an admin the new description, as the
      mockups do.
- [x] Read the builds again after an add, in `src/app/settings-actions.ts`.
- [x] Add the screen tests of each state.
- [x] Update `src/app/README.md`, `src/app/screens.md`, and
      `src/members/README.md`.
- [x] Run the targeted tests, `npm run typecheck`, and `npm run lint`.

## Milestone 5: Remove `needsBuild`

Depends on: 4

- [x] Delete `needsBuild` from the Worker reply, `OrgSettings`, the
      parsers, the dev fakes, and the fixtures.
- [x] Run the targeted tests and `npm run typecheck`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      complete gate, `npm run check`.
- [x] Delete `plans/follow-ups/new-workspace-offers-unbuilt-repositories.md`,
      because this change fixes it.
- [x] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
- [ ] Merge the pull request when its CI passes and no finding waits for
      the user. The user asked on 2026-11-10: "merge when ready".

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, add a repository to an org. Check that a
      build starts, that New workspace shows the repository as off until
      the build succeeds, and that a workspace then starts in it.
