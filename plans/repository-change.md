# Repository change

Status: Active. On branch `calummoore/perth-siol`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today a workspace keeps the repository that it was created in. The header
shows the repository as plain text (`src/shell/workspace/WorkspaceHeader.tsx`).
A member who picked the wrong repository must create a new workspace. This
change makes the repository in the header a button. Its menu moves the
workspace to another repository of the org. The workspace keeps its cloud
computer, its number, its name, its sessions, and its chat. It gets a new
branch in the folder of the new repository. When the workspace has work that
it stops following, a question lists that work first.

The user asked for the change on 13 November 2026, with a screenshot of
the header. The user chose the approach in a brainstorm on the same day:
repository change decisions 1 A, 2 B, and 3 B. The user also asked to
copy the context folder to the new repository. After the options check,
the user chose decisions 3 D and 4 D on the same day. The brainstorm notes are
in `.context/repository-change/brainstorm-notes.md`.

This change does not cover a workspace with more than one repository, a
change of the base branch alone, or a move of local work from one
repository to another.

Contract owners:

- A new protocol doc, [Repository change](../docs/protocol/repository-change.md),
  linked from [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Agent instructions](../docs/protocol/agent-instructions.md#the-branch-line),
  for the line that names the new folder.
- [Chat and events](../docs/protocol/chat-and-events.md#what-the-chat-shows),
  for the note in each session.
- [Repository folders](../docs/protocol/repository-folders.md), for the
  context folder and `CONDUCTIVE_REPOSITORY_DIR`.
- The [workspace screen README](../src/shell/workspace/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app`.

## Decisions

This plan names its decisions after the change, as repository change
decision 1, as [Decision numbers](../docs/architecture.md#decision-numbers)
says.

The options check of 13 November 2026 added options 1 E, 2 C, 3 D, and
4 D to 4 F. It changed the root questions of decisions 3 and 4, and the
recommendations of decisions 3 and 4. Its report is in
`.context/repository-change/options-check.md`.

### 1. What happens when the repository changes

Answered on 13 November 2026: A. The user added: "we could copy the
.context".

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/shell/workspace/WorkspaceHeader.tsx:95` on a phone and `:108` on desktop.
- **Background:** Each workspace has its own cloud computer. The org image puts each chosen repository in its own folder, as [Repository folders](../docs/protocol/repository-folders.md) says. Each agent works in the folder of the workspace's repository.
- **Problem:** A workspace cannot change its repository. No rule says what happens to its files, its agents, or its branch.
- **Impact if no action:** A member who picked the wrong repository must create a new workspace.
- **Root question:** What does the workspace keep when a member moves it to another repository?
- **Options:**
  - **A.** Change in place. The workspace keeps its cloud computer and the files of the old repository. It gets a new branch in the folder of the new repository, and the agents go on there. Risk: agents can lose context, and an old cloud computer can lack the new repository. Effort: Large.
  - **B.** Reset. The app deletes the cloud computer and starts a new one from the newest org image, on a new branch of the new repository. The chat stays, and the agents start without context. Local work is lost. Effort: Large.
  - **D.** Create a new workspace in the new repository with the same name, and archive this one. The number and the link change. Effort: Medium.
  - **E.** A, and a move back to a repository that the workspace left takes up its earlier branch again, when that branch still exists in the folder. The pull request bar then finds the open pull request again. The Worker must keep the earlier branch of each folder. Added by the options check. Effort: Medium.
- **Left out:** C, a change only when the workspace has no work, because the user asked for a question and then the change. A new workspace that forks this cloud computer, because A keeps the same files with no extra start, and also keeps the number and the link.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** [Continue](../docs/protocol/continue.md) changes the branch in place. Try again in [A failed first start](../docs/protocol/create-a-workspace.md#a-failed-first-start) starts a new cloud computer.
- **Recommendation:** B was recommended. The user chose A. The options check recommends A, because it keeps the files, the context of the agents, the number, and the link with no new start. E can come in a later change when moves back are common.
- **Action:** ask the user, because each option changes what the product keeps and loses.

### 2. Who may change the repository

Answered on 13 November 2026: B.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None.
- **Background:** Every member may continue a workspace (decision 224). Only the owner and the admins may archive one (decision 42).
- **Problem:** No rule says who may change the repository of a workspace.
- **Impact if no action:** The Worker has no access rule for the new action.
- **Root question:** Who may move a workspace to another repository?
- **Options:**
  - **A.** Only the owner and the admins, as for Archive. Effort: Small.
  - **B.** Every member, as for Continue. Effort: Small.
  - **C.** Every member, except while the branch has an open pull request. Then only the owner and the admins. It adds a second rule, and the menu and the Worker need the state of the pull request. Added by the options check. Effort: Small.
- **Left out:** Only the owner, because the admins can already archive each workspace.
- **Wider fix:** None.
- **Previous examples:** Archive (decision 42) and Continue (decision 224).
- **Recommendation:** A was recommended, for the reset of option 1 B. The user chose B. With decision 1 A, the change deletes no work, as Continue does not.
- **Action:** ask the user, because this is a rule about who may do what.

### 3. Which work makes the question show

Answered on 13 November 2026: B. Changed on the same day to D, after the options check.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/local-work.ts`.
- **Background:** The Worker can already count local work: the changed files, also untracked files, and the commits that no remote branch holds. The pull request bar knows the pull request of the branch.
- **Problem:** "Changes" can mean only local work, or also work on GitHub that the workspace stops following.
- **Impact if no action:** A member can lose track of an open pull request without a warning.
- **Root question:** Which work does the change leave behind or carry into the new branch, and which of that work must the member see first? The options check changed it from "Which work must the member see before the change?", because with decision 1 A the change touches two folders.
- **Options:**
  - **A.** Only local work. Effort: Small.
  - **B.** Local work, and also pushed commits of the branch or its pull request. Effort: Small.
  - **C.** Always ask. Effort: Small.
  - **D.** B, and the question also lists the local work in the folder of the new repository. Such work stays there after an earlier move away, or after an agent edited that folder. The change carries the changed files into the new branch. When Git cannot do this, the change stops and names the reason, as Continue does. Added by the options check. Effort: Small.
- **Left out:** A list of the work in the menu with no question, because the user asked to confirm first.
- **Wider fix:** None.
- **Previous examples:** The local-work question of Continue.
- **Recommendation:** D. The first recommendation was B. D keeps B and also shows the work that the change carries into the new branch.
- **Action:** ask the user, because the user said only "changes".

### 4. A repository that the cloud computer does not have

Answered on 13 November 2026: D. Added on the same day, from the design of decision 1 A.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/repository-location-data.ts`.
- **Terms:**
  - **Install script:** the script of the org that an image build runs once, for example to install the dependencies of each repository.
- **Background:**
  - A cloud computer has the repositories of the org image that it started from. The Worker records them for each workspace.
  - An admin can choose a new repository later. Only a new build adds it to the org image.
  - So an older workspace can lack a repository that New workspace offers.
  - A [waiting repository](../docs/protocol/org-image.md#repository-changes) is a chosen repository that the org image does not hold yet. The build that ends its wait does not add it to a running cloud computer.
  - A workspace created before 7 November 2026 has no record of its folders. The Worker then knows only the folder of its current repository.
- **Problem:** With decision 1 A, the workspace keeps its cloud computer. The new repository is not always in it. The note of a waiting repository in New workspace, "Ready after the build", is false in this menu.
- **Impact if no action:** The change fails, or the menu offers a repository that the change cannot use.
- **Root question:** What can a member do with a chosen repository that this cloud computer does not hold, also a waiting repository? The options check widened it to the waiting repository, which has the same problem.
- **Options:**
  - **A.** The menu shows such a repository as off, with "Not in this cloud computer. Create a new workspace to use it." Effort: Small.
  - **B.** The change clones the repository into its folder, with the GitHub access of the member. The install script does not run, so its dependencies can be missing. It reverses two rejections in force: a clone after a start, in [Waiting repositories](../docs/protocol/create-a-workspace.md#waiting-repositories), and the install script only in a build. A folder added later also needs its own name rule. Effort: Medium.
  - **C.** B, and the change also runs the install script of the org. The script runs for every folder and can take minutes. It can change the other folders of the cloud computer. Effort: Large.
  - **D.** A, and the row opens New workspace with that repository picked, in the section of this workspace. A waiting repository gets the same row. New workspace then shows its own waiting notice. The row replaces the repository of a kept draft in that section. Added by the options check. Effort: Small.
  - **E.** For this case only, the change starts a new cloud computer from the newest org image for the same workspace, as Try again does, after the question of decision 3. The chat, the number, and the link stay. The files, the local work, and the processes of the old cloud computer are lost. No such reset exists today for a workspace that has run. Added by the options check. Effort: Large.
  - **F.** A helper cloud computer from the newest org image packs the prepared folder of the repository. The Worker writes it into this cloud computer, then the change makes the branch. Each change costs one more start. Work of the install script outside the folder does not come with it. Added by the options check. Effort: Large.
- **Left out:** Hiding such a repository, because the member then cannot see why it is missing. An install script for each repository, because it breaks the one install script of the org image only for a rare case. A copy of each new repository into every running cloud computer at each build, because only this change needs the repository.
- **Wider fix:** E, made general in a later change: a move of any workspace to a new cloud computer from the newest org image. It would also give old workspaces the newest software. A follow-up item records it if the user wants it.
- **Previous examples:** A waiting repository is off in the picker of New workspace, with a note.
- **Recommendation:** D. The first recommendation was A. D keeps A, gives a waiting repository a true note, and turns the dead end into one press. The case is rare, because a new workspace starts from the newest org image.
- **Action:** ask the user, because the options differ in what the member can do.

## Design

The change follows [Continue](../docs/protocol/continue.md) where it can.
It reuses the durable job, the fetch with the member's GitHub access, the
local-work check, and the publication of the new branch.

Design calls (my calls, 13 November 2026):

- The repository button opens a menu with the chosen repositories of the
  org, in the order of New workspace. The current repository has a check.
  A repository that this cloud computer does not hold, also a waiting
  repository, shows New workspace as its detail, and a note under the
  menu says that such a repository is not in this cloud computer. A press
  on its row opens New workspace with that repository picked, in the
  section of this workspace, as decision 4 D says.
- A workspace without a record of its folders holds only its current
  repository, for the menu. Reason: the Worker knows no other folder of
  it.
- The button is on desktop and on a phone. On a phone the line under the
  name holds it.
- The app refuses the change while a turn runs in a session of the
  workspace, in an archived workspace, and in a suspended org. Reason: the
  rules of Continue, and a folder change under a running agent can mix
  its edits.
- The change starts a stopped cloud computer first, as Continue does.
- The new branch starts from the latest default branch of the new
  repository. Its name follows the rule of a new workspace: the GitHub
  login of the owner, a city name, and four random characters. Reason:
  decision 53, as for Continue.
- The old branch, its pull request, and its local work stay as they are.
  Nothing is deleted. The changed files stay in the old folder.
- The change adds the `.context/` rule to the Git exclude file of the new
  folder first. Then it copies the context folder of the old repository
  folder into the new repository folder. A file with the same path in the
  new folder stays, and the copy skips it. Reason: the user asked for the
  copy, a skip loses no file, and the runner adds the exclude rule only
  in its start folder, so the copied files would show in Changes.
- The question shows only when work exists, as decision 3 D says. Its
  title is "Change repository?". It says that the workspace starts again
  on a new branch of the new repository, and that the old work stays in
  the old folder. It lists the local work with the `LocalWorkList` of
  Continue, an open pull request, and the pushed commits of the branch
  that its base does not hold. A second list gives the local work in the
  new folder, which moves to the new branch. A merged or closed pull
  request is not
  work. It has Cancel and Change repository. Without such work, the
  change starts at once. Reason: with decision 1 A nothing is deleted, so
  the question says what the workspace stops following, not that work
  is lost.
- The change does not run the startup script. The next start or resume
  runs it in the new folder. Reason: the script can start services that
  already run.
- During the change, the button shows the progress. A failure keeps the
  old repository and branch, and a toast names the reason.
- After the change, the pull request bar starts again at the state
  without a pull request. The GitHub events follow the new repository and
  branch. The Files part and the changes compare with the new base.
- Each session shows one note at the place of the change, with the
  member, the new repository, and the new branch, as after Continue.
- The agents keep their sessions and their context. The runner moves to
  the new folder. Each later message gets a line that names the new
  repository folder and branch, as the branch line of decision 227 does.
- New terminals start in the new folder. A running terminal keeps its
  folder.
- File tabs of the old repository close, because their paths leave the
  workspace's repository.
- A run workspace of a routine can change its repository too. Its run line
  stays.

Risks to check in Milestone 3:

- The runner reads `CONDUCTIVE_REPOSITORY_DIR` when it starts. The change
  must restart the runner, or the runner must take the folder for each
  turn.
- Claude keeps its saved sessions under a folder for each working folder.
  A resume in the new folder can find no session. Codex keeps its sessions
  in one folder. Check both engines, and copy the saved session when the
  engine needs it.
- The startup script, the terminal, and the start checks read the folder
  of the workspace. Each must read the new folder after the change.
- An older cloud computer keeps the runner of its org image, and its
  variables change only at a create and a resume. The change must also
  work there, or the menu must refuse it with a reason.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The header, the menu, the question, the progress, the failure, and the
note in the chat, on desktop and on a phone.

- [x] Make the repository of the mockup `WorkspaceHeader` a button with a
      menu, on desktop and on a phone. Show the current repository, a
      waiting repository, and the state of decision 4.
- [x] Add the question of the change, with local work, a pull request,
      and pushed commits. Reuse `ConfirmDialog` and `LocalWorkList`.
- [x] Add the progress state of the button and the failure toast.
- [x] Add the note of the change in the chat.
- [x] Add the pages to the catalogue and to `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
      Evidence: `.context/repository-change/mockups-check.log` and the
      screenshots in `.context/repository-change/shots/`.

Mockup results (13 November 2026), merged into the design above:

- "Not in this cloud computer" as the detail of a menu row cut the name
  of the repository short. The row now shows New workspace as its
  detail, and a second note under the menu says what it means.
- The rows of the menu have no icons, as in the menu of New workspace.
- The question shows two lists: the work that stays with the old
  repository, with the open pull request and the pushed commits, and the
  work of the new folder that moves to the new branch.
- `LocalWorkList` takes an optional label and extra rows. Its default
  output for Continue is the same.
- The mockups keep the files and the preview of acme/storefront after the
  change, because the fixtures have no files of acme/billing-service.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/repository-change.md` with the requirements and
      the decisions of this plan. Link it from
      `docs/protocol/workspaces-and-sandboxes.md` and
      `docs/protocol/README.md`.
- [ ] Update the line about the repository of each workspace in
      `docs/protocol/workspaces-and-sandboxes.md` and the architecture doc.
- [ ] Add the repository line to `docs/protocol/agent-instructions.md`.
- [ ] Add the note of the change to `docs/protocol/chat-and-events.md`.
- [ ] Read both legal pages and each public guide in full. Update each
      sentence that says a workspace keeps one repository.
- [ ] Check the rows of the Conductor comparison for a repository change.

## Milestone 3: Worker and runner

Depends on: 2

- [ ] Find how the runner and each engine can move to the new folder and
      keep each session. Record the result in this plan.
- [ ] Add the change job in the workspace Durable Object, beside the
      Continue job: admission, local-work check, fetch, branch, context
      copy, publication, and progress.
- [ ] Add the request and response types in `src/shared/workspaces.ts`,
      and the route in `worker/app-api/`.
- [ ] Store the new repository, installation, branch, and base branch in
      one update that checks the old values.
- [ ] Emit `workspace.updated` and the note event for each session.
      Schedule the GitHub refresh of the new branch.
- [ ] Give the runner, the terminal, and the startup script the new
      folder.
- [ ] Send the repository line with each message to a session whose
      instructions name the old folder.
- [ ] Add tests: access, a refused change during a turn, local work, a
      failed fetch, a retry after a lost reply, the context copy, and the
      publication.
- [ ] Update the README of each changed Worker area.

## Milestone 4: Web app

Tags: ui

Depends on: 1, 3

- [ ] Make the repository in `src/shell/workspace/WorkspaceHeader.tsx` a
      button with the menu of the mockup.
- [ ] Show the question when work exists. Show the progress and the
      failure toast.
- [ ] Draw the note of the change in the chat.
- [ ] Close the file tabs of the old repository.
- [ ] Add tests for the menu, the question, and the failure.
- [ ] Update `src/shell/workspace/README.md`.
- [ ] Check the header in a browser on desktop and on a phone.

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
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
