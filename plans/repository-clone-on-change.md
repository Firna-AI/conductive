# Clone a repository at a repository change

Status: Active. On branch `calummoore/add-repo-not-added-faoc`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The repository menu in the workspace header lists only the repositories
that the cloud computer of the workspace holds. A repository that the org
chose after the workspace started is in New workspace, but not in that
menu. Cal reported this on 26 November 2026 with
`mokly-ai/mokly-build-smoke`.

This change lets a repository change copy such a repository from GitHub
into a new folder of the cloud computer. Then the change goes on as it does
today. The change does not run the install script or the startup script
for the new folder. It does not change New workspace, the org image, or
its builds.

## Decisions

### Repository clone decision 1: a repository that the computer does not hold

- **Date:** 27 November 2026. Cal answered "1 = C".
- **Root question:** how does a member in an older workspace get to a
  repository that the org added later?
- **Options:**
  - **A.** Change nothing. The member creates a new workspace. This was
    repository change decision 4 G.
  - **B.** Show the repository as a row that is off, with a note that says
    to create a new workspace.
  - **C.** When the member picks the repository, clone it into a new
    folder of the cloud computer. The install script does not run for it.
- **Chosen:** C. It replaces repository change decision 4 G. The other
  rejected ways of repository change decision 4 stay rejected: a clone
  with a run of the install script, a new sandbox from the newest org
  image, and a helper sandbox that packs the folder.
- **Cost that Cal accepted:** the install script never prepares the new
  folder. Its dependencies are not installed until an agent or a member
  installs them, or until a new workspace starts from a newer org image.

### Design calls

Each call below is my call, made on 27 November 2026 under the decision
test of the `decisions-and-findings` skill.

1. **The menu lists every chosen repository.** A waiting repository shows
   too. Reason: the clone reads GitHub, not the org image, so a waiting
   repository needs no build first. This also follows from decision 1 C,
   which accepts a folder that the install script never prepared. A
   removed repository does not show, because the org did not choose it.
2. **The menu has no notes, and a row that needs a clone looks like any
   other row.** Reason: the rule "The menu has no notes" of repository
   change decision 4 stays in force.
3. **A workspace with no record of its folders still shows text.**
   Reason: the rule of repository change decision 4 stays. Such a
   workspace started before 7 November 2026, and its folders follow the
   legacy layout.
4. **The question asks nothing new for a clone.** A new folder holds no
   local work, so the change reads no carried files there. The question
   shows only when the old folder has work, as today.
5. **Progress is the same spinner on the repository button.** Reason:
   repository change decision 9 A stays. A clone can take longer than a
   move, but the spinner already covers a wait of unknown length.
6. **The clone uses the GitHub token of the member who changes the
   repository.** It uses the same trusted fetch and the same credential
   route as the fetch of a change today. Reason: the token rule of
   [Continue](../docs/protocol/github-tokens-worker.md#continue) already
   covers this fetch. The installation token of a build needs build rows,
   so its grant cannot serve a workspace.
7. **The new folder has the layout of a build.** The fetch gets every
   branch and every tag. The folder gets `origin` with the GitHub address
   and the usual fetch refspec, as `finalizeSourceCommand` gives a folder
   of a build. Reason: Git commands, Changes, and agents then work the
   same in every folder.
8. **The folder name follows decision 94, with the recorded folders as
   names in use.** The name is the repository name. When a recorded
   folder has the same name, with case ignored, the name starts with the
   owner. A name that is still in use, in the record or on the disk, gets
   `-2`, `-3`, and so on. The folder variable follows the same rule.
   No recorded folder and no recorded variable changes. Reason: a rename
   of a held folder would move the work of agents and terminals.
9. **The clone goes to a temporary folder first.** It moves to its name
   only after the fetch and the checkout of the new branch. Reason: a
   failed clone then leaves no half folder under the folder name.
10. **The Worker records the new folder when the move succeeds, before
    the publication.** A later failure of the change keeps the folder in
    the record, because the cloud computer holds it. Reason: the record
    must match the disk, so that the next start gives the folder its
    variable.
11. **A runner that cannot take a new folder gets the refusal "Restart the
    software, then try again."** Nothing stops. Reason: repository change
    decision 5 A gives this rule for a runner that cannot move.
12. **The running runner adds the new folder and its variable.** Its
    agent commands and its instructions then name the new variable at
    once. The settle step gives the variable to new terminals, as it
    gives `CONDUCTIVE_REPOSITORY_DIR` today. The next start writes the
    variable into the start variables from the record.
13. **No mockup changes.** The menu mockup already lists every repository
    of its fixture, with no notes. The button and its spinner do not
    change.

Contract owners:

- [Repository change](../docs/protocol/repository-change.md).
- [Repository folders](../docs/protocol/repository-folders.md).
- [GitHub tokens in the Worker](../docs/protocol/github-tokens-worker.md).
- [Runner messages](../crates/cnd-runner-interface/README.md) and the
  [runner](../crates/cnd-runner/README.md).
- The public guides [Workspaces](../src/marketing/docs/workspaces.md) and
  [Cloud computer](../src/marketing/docs/cloud-computer.md).

## Milestone 1: Documentation and protocol

Depends on: none

State the clone as a requirement, and remove the rule that hides a
repository that the computer does not hold.

- [x] In `docs/protocol/repository-change.md`, under "The menu": the menu
      lists every chosen repository, with design calls 1 to 3. Replace
      repository change decision 4 G with repository clone decision 1 C.
      Keep the other rejected ways of decision 4 and add 4 G as rejected.
- [x] Add a section "A repository that the computer does not hold" to
      `docs/protocol/repository-change.md`, with design calls 4 to 11. Say
      that the install script and the startup script do not run for the
      new folder.
- [x] In `docs/protocol/repository-folders.md`, replace "A repository
      change adds no folder" with the clone and the name rule of design
      call 8. Say that a later start gives the folder its variable.
- [x] In `docs/protocol/github-tokens-worker.md`, under Continue, say that
      the fetch of a clone uses the same token.
- [x] Update `src/marketing/docs/workspaces.md`, "Change the repository",
      and the matching sentence of `src/marketing/docs/cloud-computer.md`.
      Read each public guide in full for other sentences that restate the
      rule.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates the changed facts.
- [x] Check each relative link of the changed Markdown files.

## Milestone 2: Runner accepts a new folder

Depends on: 1

A runner accepts a move to a folder that the move adds, and older runners
keep working.

- [x] In `crates/cnd-runner-interface/src/runner_repository.rs`, add an
      optional `variable` to `repository.move`. It names the variable of
      a folder that the move adds.
- [x] Add an optional hello field, such as `addsRepositoryFolder`, in
      `runner_handshake.rs`. Only a runner that sets it gets a move with
      `variable`.
- [x] In `crates/cnd-runner/src/relocation.rs`, accept a folder that is not
      known when the move names a valid `CONDUCTIVE_REPOSITORY_*_DIR`
      variable that is not in use, the folder is a direct child of
      `/home/user/code`, and it holds a Git work tree.
- [x] Add the folder and the variable to `repository_directories` and to
      the agent command environment of the next runner round.
- [x] Add Rust tests for the accepted and the refused cases.
- [x] Run `cargo run -p cnd-runner-interface --example export_bindings`
      and commit `src/shared/generated/`.
- [x] Update the crate READMEs.
- [x] Run the Rust checks of `CLAUDE.md`.

## Milestone 3: Worker clones at the change

Depends on: 2

- [x] Add a function in `worker/lifecycle/repository-locations.ts` that
      gives the location of one added repository, from the recorded
      locations, with design call 8. Test it.
- [x] In `repository-change-target.ts`, give a target with `clone` when
      the recorded folders do not hold the new repository. Keep the
      refusal for a workspace with no record.
- [x] Store the clone in the job, with its folder and variable. A job of
      an older deploy has no clone, and runs as before.
- [x] In admission and in the runner phase, refuse a clone with
      `softwareOutdated()` when the runner has no flag from Milestone 2.
- [x] Skip the carried files read for a clone.
- [x] Fetch every branch and every tag into the stage for a clone.
- [x] Add a clone command: a check of the names on disk, `git init` in a
      temporary folder, the layout of design call 7, the fetch from the
      stage, the exclude rule, the context copy, the checkout of the new
      branch, and the move to the folder name.
- [x] Record the new location in `workspace_runtime` when the move
      succeeds, as design call 10 says.
- [x] Send `variable` with the runner move, and set the variable in the
      settle step for new terminals.
- [x] Add Worker tests for a clone change, an older runner, a name in use
      on the disk, and a failed clone.
- [x] Update `worker/lifecycle/README.md` when it names the change steps.

## Milestone 4: Menu lists every chosen repository

Tags: ui

Depends on: 3

- [x] In `src/shell/workspace/repository/use-repository-change.ts`, make
      `repositoryChoices` list each chosen repository while the record of
      the folders exists. Update its comment and the comment of
      `RepositoryControl`.
- [x] Update `RepositoryMenu.test.tsx` for a repository that the computer
      does not hold.
- [x] Smoke-test the menu and a clone change in the app in a browser. Save
      a screenshot under `.context/repository-clone-on-change/`.
      The development page showed the menu with a repository that the
      cloud computer does not hold. A real clone needs a cloud computer, so
      it moved to the post-merge follow-up below. Evidence:
      `.context/repository-clone-on-change/menu-lists-unheld.png`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`,
      and the Rust checks.
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

- [ ] In production, change the repository of a workspace to a repository
      that its computer does not hold. Check the new branch, the folder,
      and its variable after a stop and a resume.
