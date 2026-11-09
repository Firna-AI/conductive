# Automatic first build of a new org

Status: Active. On branch `calummoore/box-auto-build-onboarding`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A new org has no org image until an admin presses Build computer on the
Cloud computer tab. So the first message after Get started fails with "Ask
an org admin to build the cloud computer image first." The user asked on
8 November 2026 that the app builds the cloud computer by itself after the
repositories step, as part of the onboarding of a new org. Decision 150
chose how the app shows that build. Decision 151 made Create org require a
repository, and added one build after the first good build when the
settings changed during it. This change starts the first build when Create
org saves an org. Get started and New workspace show that build until the
org has its first good image.

The change does not cover these cases. A change of the repositories after
the first good build still needs Build computer, as decision 12 says. A
failed build gets no automatic retry. A first message cannot wait for the
build, as option D of decision 150 would allow.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the org image and the create of a workspace.
- [Orgs and members](../docs/protocol/orgs-and-members.md): Get started.
- The [app API README](../worker/app-api/README.md) and
  [Image builds](../worker/lifecycle/image-builds.md).
- The [web app README](../src/app/README.md), for the dev fake.
- The [mockup catalogue](../docs/mockups/catalogue.md) and
  [Orgs and logins](../docs/mockups/orgs-and-logins.md).

## Decisions

### 150. Show the first build of a new org

- **Severity:** Medium. **Effort:** Large. The options check of 8 November 2026 changed the grade from Medium, because C holds mockups, protocol changes, Worker changes, and new app states.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/feature-org.ts`, `src/shell/onboarding/OrgStep.tsx`, `src/shell/new-workspace/NewWorkspaceScreen.tsx`, `docs/protocol/workspaces-and-sandboxes.md`.
- **Background:** The user asked that the app builds the cloud computer of a new org by itself, after the repositories of Create org. A build can run for many minutes, up to its 60-minute limit. During that time a create fails, and its words ask for a manual build. The Get started finish also says "‹org› is ready for a new workspace" while the build runs.
- **Problem:** No requirement says what the app shows, or what a create does, while the first build of a new org runs.
- **Impact if no action:** A new user who sends early gets a failed create that asks for a manual build. So the goal fails.
- **Root question:** How does a new org become ready for its first workspace with no manual step?
- **Options:**
  - **A.** Build at create, and change words only. The refusal says that the cloud computer is still being prepared, and the finish stops saying "ready". The user can still send early and get a failed create, with the message kept. Effort: Small.
  - **B.** A, and New workspace shows a notice with the time of the running build. Send stays off until the build succeeds. After a failed build, the notice says so and links an admin to the Cloud computer tab. This adds notice states to the app and the mockups. Effort: Medium.
  - **C.** B, and the org step of Get started shows the build with its time, then done, or the failure with Try again. The finish says "ready" only after a good build, and "Open ‹org›" stays on. This adds Get started states to the app and the mockups. Effort: Medium.
  - **D.** C, but New workspace takes the first message during the build, in place of the notice. The workspace shows the start step "Waiting for the cloud computer" and starts after the build. A failed build fails the create, and the message goes back to the composer. The 20-minute start limit conflicts with the 60-minute build limit, so D needs one more decision. Effort: Large.
  - **E.** Added by the options check: C, and one Worker rule starts the first build after each save that leaves an org with chosen repositories, no good image, and no build yet. So an org that Create org made with no repository builds when the admin saves its first repository. The tab saves each repository on its own, so the build can hold only the first repositories. Effort: Large, of which the part over C is Small.
  - **F.** Added by the options check: E, but the Worker waits about one minute after the last save of the repositories, so the build holds the whole choice. Create org uses no wait. It needs a saved due time, an alarm, and a pending state in the builds answer, the app, and the mockups. Effort: Large.
- **Left out:**
  - The browser starts the build after the create. A closed tab can then lose the build, and the Worker does the same work.
  - The first workspace starts without an org image. It repeats the build in each early start, and decision 13 needs an org image.
  - The build starts at the first visit to New workspace. It fails the task message, which asks for the build after the repositories step, and a member's visit cannot start a build.
  - Added by the options check: the browser keeps the first message and sends it after the build. It breaks the rules of decisions 14 and 130 in `docs/protocol/chat-and-events.md`, and a closed tab loses the message.
  - Added by the options check: the first workspace builds the org image in its own sandbox. That sandbox holds the env vars and a workspace token, and no saved snapshot may hold a secret.
  - Added by the options check: a fourth step of Get started. C shows the same state in the org step and keeps the three steps of decisions 33 and 80. Get started stays open until every step is done, so a fourth step keeps the user there for up to 60 minutes.
  - Added by the options check: the Worker keeps a waiting create at the org, outside any workspace. D gives the same result with the existing start steps.
- **Wider fix:** F, from the options check. The first repositories of an org are saved in two places, Create org and the Repositories tab, so a trigger only in Create org is a direct fix. Decision 151 asks about that path.
- **Previous examples:** Decision 12 of 5 November 2026 chose the manual Build computer, also after a failure. It left out an automatic retry, because a broken script fails again. No plan, follow-up, or earlier workspace proposed an automatic first build.
- **Related:** The open follow-up [No rule covers Get started for a returning member](follow-ups/get-started-returning-member.md) changes the same org step. With C, an invited member also sees the build of an admin's org there. The open follow-up [Delete org misses unresolved allocations](follow-ups/org-deletion-lost-build-allocation.md) gets more likely, because each new org now runs a build in its first minutes.
- **Recommendation:** C. It shows the build where it starts, as part of the onboarding, and the notice also covers orgs from the org rail.
- **Action:** ask the user, because each option adds behaviour that no requirement covers.
- **Chosen:** C, by the user on 8 November 2026. The user asked for mockups to review before the rest of the work. E and F came later, from the options check. Decision 151 asks about the path that they cover.

### 151. Build an org that gets its first repositories later

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. The options check of decision 150 found it, and the options check of 8 November 2026 widened it.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/feature-org.ts:18`, `saveShellRepository` in `worker/app-api/feature-repositories-data.ts:8-63`, `publishBuild` in `worker/lifecycle/image-build-steps.ts:70`, `src/shell/orgs/CreateOrgScreen.tsx`.
- **Background:** Create org accepts an org with no repository. Such an org starts no build, as a design call of this plan says. Its admin then chooses repositories on the Repositories tab, which saves each repository on its own. A build keeps the repositories and the install script that are saved when it starts. So a repository or a script that the admin saves during the first build waits for Build computer.
- **Problem:** Both paths keep a manual build, and the user asked for none in the onboarding of a new org.
- **Impact if no action:** An admin who creates an org with no repository, or who changes the choice during the first build, must still find Build computer. The notice of New workspace links the admin to it.
- **Root question:** How does a new org get a cloud computer with each repository that its admin chooses during the onboarding, with no manual build? The options check changed it from "How does an org with no repository at Create org get its first build with no manual step?", because that question split the problem by the screen that saves.
- **Options:**
  - **A.** Keep Build computer for both paths. The notice of New workspace links an admin to it. Effort: Small.
  - **B.** Option E of decision 150: the first saved repository of an org with no build starts the first build at once. A repository that the admin saves during that build needs Build computer after it. Effort: Small.
  - **C.** Create org asks for at least one repository, so every new org starts its build at create. A user whose GitHub App reaches no repository cannot create an org until the app reaches one. This adds a rejection to Create org. Effort: Medium.
  - **D.** Option F of decision 150: as B, but the Worker waits about one minute after the last save, so the build holds the whole choice. Effort: Large.
  - **E.** Added by the options check: C, and one more build when the settings change during the first good build. Each build records the settings revision that it starts with, and each change of the repositories or of the install script raises it. When the first good build of an org ends below the current revision, the Worker starts one more build at once. That costs one more paid build. The added build can also join B, D, F, or G in place of C. Effort: Medium.
  - **F.** Added by the options check: the Repositories tab of an org with no build keeps the choice as one draft with one Save, as Create org does. It overrides the save of each repository on `origin/main` for that state, and it needs a new route and new mockup states. Effort: Large.
  - **G.** Added by the options check: D, but the wait runs inside the first build. The build shows as running from the first save, and it reads the choice after the saves stop for about one minute. This changes the build job. Effort: Medium.
- **Left out:**
  - A build when the admin leaves the Repositories tab. The tab can close first, and D and G get the whole choice from the Worker.
  - A build after each change of the repositories, for every org. It breaks decision 12 for changes after the onboarding, and the task does not change those.
  - A build at Create org also with no repository. Its image lacks the repositories that come later.
  - A start that clones a repository that the image lacks. It breaks decision 13, because that repository then misses the work of the install script.
  - Get started keeps its org step open until the org has a repository. It fails for an org from the org rail, which never shows Get started.
- **Wider fix:** E, from the options check, in place of D. It compares the revisions when the first good build ends, so it covers each save from any screen during that build.
- **Previous examples:** Decision 12, and the design calls of this plan that keep Build computer for the Repositories tab and for a script saved during the first build.
- **Related:** Decision 150, option C, which this item extends. Get started needs words for an org with no repository under A, B, D, F, and G. The follow-up [New workspace offers repositories that the image lacks](follow-ups/new-workspace-offers-unbuilt-repositories.md) has the same cause for later changes.
- **Recommendation:** E, changed by the options check from C. Create org gives the first build the whole choice, and the added build takes in each save during that build, so no manual build remains. Without the rejection of C, the next best is B or G with the added build of E.
- **Action:** ask the user, because C and E add a rejection to Create org, and the other options change when a build starts.
- **Chosen:** E, by the user on 9 November 2026.

### 152. Let a new workspace wait for the first build

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. The user asked on 9 November 2026 whether each workspace could wait for the first build, which Create org starts.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/create-request.ts`, `worker/lifecycle/creation-claims.ts`, `worker/lifecycle/start-records.ts:65-73`, `worker/lifecycle/start-coordinator.ts`, and the sections "Create a workspace" and "Time limits of builds and starts" of `docs/protocol/workspaces-and-sandboxes.md`.
- **Terms:**
  - **Start steps:** the steps that a new workspace shows while its cloud computer starts, with their times (decision 91).
  - **Start limit:** each start of a workspace has a 20-minute limit from its beginning (decision 128). A build has a 60-minute limit.
- **Background:** With C of decision 150, a user who opens New workspace during the first build sees a notice, and Send is off. A create today needs a published org image. In one D1 batch it records the creation attempt, the start plan, and a lease on the image, before the start begins.
- **Problem:** The first task of a new org waits for the user to come back, not only for the build.
- **Impact if no action:** A new user who leaves during the build finds no agent at work on return.
- **Root question:** How does a user who gives the first task of a new org during its first build get an agent at work on it without coming back? The options check changed it from "How does a new org become ready for its first workspace with no manual step?", because decisions 150 and 151 already answer that question.
- **Options:**
  - **A.** Keep C of decision 150. Effort: Large, for the work that remains.
  - **B.** Option D of decision 150: New workspace accepts the first message during the first build. The workspace appears at once, and its first start step waits for the build. When the build succeeds, the start goes on as today. When it fails, the create fails, and the message goes back to the composer. The 20-minute start limit begins when the build succeeds. This changes the path that creates every workspace. Effort: Large.
  - **C.** Build A now, and record B as a follow-up item for a later change. B then replaces only the notice that A shows while the build runs. Effort: Large now, Large later.
  - **D.** Added by the options check: one automatic retry. When the first build of an org fails, the Worker starts one more build at once, with the first admin who is not suspended. A build that passed its 60-minute limit gets no retry. It can join any other option, and it changes decision 12 for the first build. Effort: Medium.
  - **E.** Added by the options check: B, built after the follow-up `plans/follow-ups/failed-first-start-keeps-workspace.md`. A failed wait then keeps the workspace, its first message, and the error for every member, and members can queue later messages during the wait. Effort: Large.
  - **F.** Added by the options check: E, and a create waits for each running build that holds its repository, not only the first. It needs the data of which repositories a good image and a running build hold. Effort: Large.
- **Left out:**
  - The browser holds the message and sends it later. A closed tab loses it, and the app never sends a draft by itself, as decisions 14 and 130 say.
  - The first workspace starts without an org image. Only a build copies each chosen repository with an installation token, which a workspace sandbox never gets.
  - The Worker holds the message at the org, outside a workspace. It breaks decision 91, which stores the workspace and its first message before the answer.
  - Added by the options check: a message to the user when the build ends, and a shorter first build. Both fail the goal, because the task still waits for the user.
  - Added by the options check: a list of returned first messages for each sender. The follow-up of decision 130 leaves it out, because its option D keeps the messages where every member reads them.
- **Wider fix:** F, from the options check, in place of None. It holds one rule for every build.
- **Previous examples:** Option D of decision 150.
- **Related:** The follow-up [A new workspace could wait for the first build](follow-ups/workspace-waits-for-first-build.md) records B, E, and F for the later change. The follow-up [A failed first start removes the workspace and its queue](follow-ups/failed-first-start-keeps-workspace.md) replaces the failure path of B. The follow-up [A failed first build could retry once](follow-ups/first-build-retry.md) records D. Option E of decision 151: a repository added during the first build is not in that build.
- **Recommendation:** E, as the later change that C records. The options check changed it from B, because under B a failed first build returns the message only to the tab that sent it, and a closed tab then loses it. A best protects the codebase, because it keeps the create path.
- **Action:** ask the user, because B changes decision 150 and the start limit of decision 128.
- **Chosen:** C, by the user on 9 November 2026. The later change chooses among B, E, and F in its follow-up item. D waits in its own follow-up item, because it can join any option and the user did not ask about it.

## Design

The Worker starts the build in the Create org request, after the org, its
admin, and its repositories exist. Create org requires at least one
repository (decision 151), so every new org starts its build at create.
When the first good build of an org is published, the Worker compares the
settings revision of that build with the current one. Each change of the
repositories or of the install script raises the revision. When the
current revision is higher, the Worker starts one more build at once. The build is a normal build with the
creator as its starter. Get started reads the builds of its org, and New
workspace reads the builds of its org, through the org model that already
follows them.

Agent calls, 8 November 2026:

- The Worker starts the build inside the Create org request. Reason: the
  browser makes no second request, so a closed tab cannot lose the build.
- The build is a normal build by the creator, with its log and history on
  the Cloud computer tab. A failure gets Try again and no automatic retry,
  as decision 12 says.
- An org with no chosen repository starts no build at Create org. Reason:
  no workspace can start without a repository. Decision 151 replaced this
  call on 9 November 2026: Create org now requires a repository.
- Changes on the Repositories tab of an org with a build keep Build
  computer, as decision 12 says. Reason: the tab saves each repository on
  its own, so a build there can start with part of the choice. Decision 151
  adds one build after the first good build.
- When the build cannot start, Create org still succeeds, and the Worker
  writes a warning. Reason: the org is valid without a build, and the
  Cloud computer tab still offers Build computer.
- A build whose alarm fails to schedule after its record exists fails at
  once, with a saved message. Reason: today such a build stays running with
  no alarm, and Build computer stays off while a build runs. With this
  change, New workspace would then keep Send off with no end. The options
  check found the gap in `worker/lifecycle/image-builds.ts`.
- Get started also shows an org with repositories and no build, such as
  after a build that could not start. An admin gets Build computer there.
  Reason: the finish needs words for that org, and the user needs one way
  to recover.
- The first build runs the install script that the org has at create,
  which is empty. An admin who saves a script during that build presses
  Build computer after it ends. Reason: Build computer is off while a
  build runs, and the task asks for the build right after the repositories
  step. Decision 151 replaced this call on 9 November 2026: one more build
  follows the first good build when the settings changed during it.

Calls of the `ui implementor` in the mockups, 8 November 2026:

- Get started and the notice say "Preparing" and "ready", as this plan
  does. The Cloud computer tab keeps "Building". Reason: the onboarding
  speaks of the outcome, and the tab keeps its existing words.
- The build shows as a "Cloud computer" line inside the org step, so Get
  started keeps three steps, as decision 33 says.
- The org step of a failed build links to its log on the Cloud computer
  tab. Reason: the saved message says "Check the log", and Get started has
  no log.
- Get started and the notice do not name the 60-minute limit. The Cloud
  computer tab names it under the log.
- A new org has empty scripts and no env vars, so its Cloud computer tab
  shows empty fields and "No variables yet."
- The New workspace notice takes its words from one copy module, which the
  app also reads, as Get started does. This is the call of the agent that
  checked the mockups.

Agent calls, 9 November 2026, for decision 151:

- The added build starts with the first admin who is not suspended, as
  each automatic refresh does. Reason: one rule then covers every build
  that the app starts by itself.
- When the added build cannot start, the first good image stays, and the
  Worker writes a warning. The Cloud computer tab then asks for a build,
  as it does after any change. Reason: the org already works.
- The added build runs only after the first good build. A failed first
  build gets Try again, which builds the current settings. Reason: Try
  again already takes in each change.
- `needsBuild` compares with the newest build before the first good image,
  and is false with no build. Reason: an org with no image always got
  `needsBuild`, so every new admin saw a script change that nobody made.
  The mockup agent found it, and the code confirms it.

Calls of the `ui implementor` in the mockups, 9 November 2026:

- "Add at least one." shows in every state of Create org, so the rule is
  clear before the user tries, and no error shows.
- The notice says "succeeds", not "ends", because the added build follows
  only a good first build.
- The settings mockup keeps the state of the script apart from the state
  of the build, as the app keeps `needsBuild` apart from the builds.
- The notice of New workspace shows only while the org has no good image.
  Reason: after the first good image, a later build or a failed later
  build leaves the last good image in use, as decision 9 says.
- The same notice also covers an org with repositories, no good image, and
  no running build, such as after a build that could not start. It asks
  for a build, and it links an admin to the Cloud computer tab. Reason:
  the user then learns the cause before writing a message, in place of a
  failed create.
- Only an admin gets Try again in Get started and the link in the notice.
  A member gets the state with no action. Reason: only an admin builds, as
  decision 57 says.
- A create that comes while the first build runs, such as from an old tab
  or an agent tool, gets a refusal that says the cloud computer is still
  being prepared. Reason: the old words ask for a manual build.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the first build in Get started, New workspace, and the Cloud computer
tab, and add it to the sign-up flow. The new words of Get started go into
the shared copy module as new entries, so the app text does not change in
this milestone.

- [x] Get started: move its saved states into child pages with the same
      paths, so that the page shows only its canonical screen.
- [x] Get started: draw the first build in the org step and the finish:
      running, succeeded, failed with Try again, and no build with Build
      computer.
- [x] New workspace: add `app/new-workspace/first-build` with the running
      build, the good build, the failed build, and no build.
- [x] Cloud computer: add `app/org-settings/cloud-computer/first-build`
      with the running first build, the failed first build, and no build.
- [x] User flows: add the first build to `user-flows/sign-up`, and name it
      in the last step of `user-flows/create-org`.
- [x] Update `docs/mockups/catalogue.md` and
      `docs/mockups/orgs-and-logins.md`.
- [x] Run `npm run mockups:check`, then smoke-test the changed pages at
      both sizes. Screenshots and logs: `.context/automatic-first-build/`.
      Merge decisions of the merge of origin/main on 9 November 2026:
      `.context/automatic-first-build/merge-decisions.md`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [ ] The user reviews the mockups.
- [x] Decision 151: draw Create org with no repository chosen, and with no
      repository that the GitHub App reaches, both with Create org off.
      Draw the Cloud computer tab of the first build after an admin saved
      an install script, which one more build takes in by itself.

## Milestone 2: Documentation and protocol

Depends on: 1

State the automatic first build and what the app shows during it.

- [ ] `docs/protocol/workspaces-and-sandboxes.md`, The org image: Create
      org with at least one repository starts the first build
      (decision 150). Later changes of the repositories need Build
      computer.
- [ ] `docs/protocol/workspaces-and-sandboxes.md`, Create a workspace:
      until the first good image, New workspace shows the state of the
      first build and keeps Send off. A create in that time gets a refusal
      that names the state.
- [ ] `docs/protocol/orgs-and-members.md`, Orgs: Create org requires at
      least one repository (decision 151).
- [ ] `docs/protocol/workspaces-and-sandboxes.md`, The org image: when the
      repositories or the install script changed during the first good
      build, the app starts one more build when it ends (decision 151).
- [ ] `docs/protocol/orgs-and-members.md`, Get started: the org step shows
      the first build, with Try again for an admin. The finish says that
      the org is ready only after the first build succeeds.

## Milestone 3: Worker and dev fake

Depends on: 2

- [ ] `createShellOrg` starts the build after the org exists, when it has
      at least one repository. A failed start writes a warning, and the
      create still answers 201.
- [ ] `startImageBuild` fails a new build at once when its alarm does not
      schedule, so that Try again shows.
- [ ] The settings answer sets `needsBuild` only after a change. It
      compares the settings revision with that of the build that holds the
      org image. Before the first good image, it compares with the newest
      build, and with no build it is false. Today an org with no image
      always gets `needsBuild`, so the tab says that the install script
      changed in every first build.
- [ ] Create org refuses a request with no repository.
- [ ] After the first good build of an org, the Worker starts one more
      build when the settings revision is higher than that of the build.
- [ ] The refusal of a create during the first build says that the cloud
      computer is still being prepared.
- [ ] The dev fake of `src/app/dev/` starts a build at Create org in the
      same way.
- [ ] Tests: a create with repositories records a running build, a create
      with none is refused, a failed start keeps the org, the refusal
      during the first build, the stuck build that fails at once, and the
      added build after a change during the first build.
- [ ] Update `worker/app-api/README.md`,
      `worker/lifecycle/image-builds.md`, and `src/app/README.md`.

## Milestone 4: Get started and New workspace

Tags: ui

Depends on: 1, 2, 3

- [ ] The org step of Get started shows the first build, as the mockups
      draw it, with Try again and Open the log for an admin.
- [ ] The finish of Get started takes its words from the state of the
      first build. Open ‹org› is a secondary button after a failed build
      or with no build.
- [ ] New workspace shows the notice of the first build and keeps Send off
      while the org has no good image. The notice takes its words from
      `docs/mockups/src/screens/firstBuildCopy.ts`, and the running notice
      shows the spinner of `Notice` with `busy`.
- [ ] The Cloud computer tab matches the first-build mockups. The History
      list waits for the follow-up
      [The app and the mockups list different builds](follow-ups/build-history-running-build.md).
- [ ] Create org stays off until a repository is chosen, and its hint ends
      with "Add at least one.", as the mockups draw it.
- [ ] The notice of a changed install script follows the mockups: during
      the first build it says "One more build runs it when this build
      succeeds." with no button. With no good build and no build that
      runs, it says "It runs at the next build." with no button.
- [ ] Tests for each state of the org step, the finish, the notice, and
      Create org.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Before the pull request, check that decisions 150, 151, and 152 are
      still free on origin/main. Renumber them in this plan, its follow-up
      items, the mockups, and the docs when main has taken them.
- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decision 150 and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, create an org with one repository, and check
      that Get started shows its build and that the first workspace starts
      after it.
