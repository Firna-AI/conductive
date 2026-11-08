# Automatic first build of a new org

Status: Active. On branch `calummoore/box-auto-build-onboarding`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A new org has no org image until an admin presses Build computer on the
Cloud computer tab. So the first message after Get started fails with "Ask
an org admin to build the cloud computer image first." The user asked on
8 November 2026 that the app builds the cloud computer by itself after the
repositories step, as part of the onboarding of a new org. Decision 142
chose how the app shows that build. This change starts the first build when
Create org saves an org with repositories. Get started and New workspace
show that build until the org has its first good image.

The change does not cover these cases. A later change of the repositories
still needs Build computer, as decision 12 says. A failed build gets no
automatic retry. A first message cannot wait for the build, as option D of
decision 142 would allow.

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

### 142. Show the first build of a new org

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
- **Wider fix:** F, from the options check. The first repositories of an org are saved in two places, Create org and the Repositories tab, so a trigger only in Create org is a direct fix. Decision 143 asks about that path.
- **Previous examples:** Decision 12 of 5 November 2026 chose the manual Build computer, also after a failure. It left out an automatic retry, because a broken script fails again. No plan, follow-up, or earlier workspace proposed an automatic first build.
- **Related:** The open follow-up [No rule covers Get started for a returning member](follow-ups/get-started-returning-member.md) changes the same org step. With C, an invited member also sees the build of an admin's org there. The open follow-up [Delete org misses unresolved allocations](follow-ups/org-deletion-lost-build-allocation.md) gets more likely, because each new org now runs a build in its first minutes.
- **Recommendation:** C. It shows the build where it starts, as part of the onboarding, and the notice also covers orgs from the org rail.
- **Action:** ask the user, because each option adds behaviour that no requirement covers.
- **Chosen:** C, by the user on 8 November 2026. The user asked for mockups to review before the rest of the work. E and F came later, from the options check. Decision 143 asks about the path that they cover.

### 143. Build an org that gets its first repositories later

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. The options check of decision 142 found it, and the options check of 8 November 2026 widened it.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/feature-org.ts:18`, `saveShellRepository` in `worker/app-api/feature-repositories-data.ts:8-63`, `publishBuild` in `worker/lifecycle/image-build-steps.ts:70`, `src/shell/orgs/CreateOrgScreen.tsx`.
- **Background:** Create org accepts an org with no repository. Such an org starts no build, as a design call of this plan says. Its admin then chooses repositories on the Repositories tab, which saves each repository on its own. A build keeps the repositories and the install script that are saved when it starts. So a repository or a script that the admin saves during the first build waits for Build computer.
- **Problem:** Both paths keep a manual build, and the user asked for none in the onboarding of a new org.
- **Impact if no action:** An admin who creates an org with no repository, or who changes the choice during the first build, must still find Build computer. The notice of New workspace links the admin to it.
- **Root question:** How does a new org get a cloud computer with each repository that its admin chooses during the onboarding, with no manual build? The options check changed it from "How does an org with no repository at Create org get its first build with no manual step?", because that question split the problem by the screen that saves.
- **Options:**
  - **A.** Keep Build computer for both paths. The notice of New workspace links an admin to it. Effort: Small.
  - **B.** Option E of decision 142: the first saved repository of an org with no build starts the first build at once. A repository that the admin saves during that build needs Build computer after it. Effort: Small.
  - **C.** Create org asks for at least one repository, so every new org starts its build at create. A user whose GitHub App reaches no repository cannot create an org until the app reaches one. This adds a rejection to Create org. Effort: Medium.
  - **D.** Option F of decision 142: as B, but the Worker waits about one minute after the last save, so the build holds the whole choice. Effort: Large.
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
- **Related:** Decision 142, option C, which this item extends. Get started needs words for an org with no repository under A, B, D, F, and G. The follow-up [New workspace offers repositories that the image lacks](follow-ups/new-workspace-offers-unbuilt-repositories.md) has the same cause for later changes.
- **Recommendation:** E, changed by the options check from C. Create org gives the first build the whole choice, and the added build takes in each save during that build, so no manual build remains. Without the rejection of C, the next best is B or G with the added build of E.
- **Action:** ask the user, because C and E add a rejection to Create org, and the other options change when a build starts.

## Design

The Worker starts the build in the Create org request, after the org, its
admin, and its repositories exist. The build is a normal build with the
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
  no workspace can start without a repository. Decision 143 asks how such
  an org gets its first build.
- Changes on the Repositories tab of an org with a build keep Build
  computer, as decision 12 says. Reason: the tab saves each repository on
  its own, so a build there can start with part of the choice. Option E of
  decision 143 would add one build after the first good build.
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
  step. Option E of decision 143 would replace this call.

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
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [ ] The user reviews the mockups.
- [ ] After the answer to decision 143, draw the states that it needs, such
      as Get started and New workspace for an org with no repository.

## Milestone 2: Documentation and protocol

Depends on: 1

State the automatic first build and what the app shows during it.

- [ ] `docs/protocol/workspaces-and-sandboxes.md`, The org image: Create
      org with at least one repository starts the first build
      (decision 142). Later changes of the repositories need Build
      computer.
- [ ] `docs/protocol/workspaces-and-sandboxes.md`, Create a workspace:
      until the first good image, New workspace shows the state of the
      first build and keeps Send off. A create in that time gets a refusal
      that names the state.
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
- [ ] Apply the answer to decision 143.
- [ ] The refusal of a create during the first build says that the cloud
      computer is still being prepared.
- [ ] The dev fake of `src/app/dev/` starts a build at Create org in the
      same way.
- [ ] Tests: a create with repositories records a running build, a create
      with none records no build, a failed start keeps the org, and the
      refusal during the first build.
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
- [ ] Tests for each state of the org step, the finish, and the notice.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decision 142 and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, create an org with one repository, and check
      that Get started shows its build and that the first workspace starts
      after it.
