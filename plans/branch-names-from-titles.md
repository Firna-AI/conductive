# Branch names from workspace titles

Status: Active. On branch `calummoore/riga-aumm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace branch has a placeholder name today:
`<GitHub login>/<city>-<4 random characters>`, such as
`calummoore/riga-aumm`. The rule "the branch keeps the city name when the
workspace gets a name" was an agent call of 5 November 2026
(`plans/boat-native-remote-workspaces.md`), not a user decision. On
16 November 2026 the user asked: "branch should be renamed based on the
title (i.e. the same time we edit the title)".

This change gives a new workspace a branch named after its title. The
Worker changes the stored branch name when the workspace gets a name, but
only while the cloud computer has not created the branch yet. After that
step, the branch name never changes, so no Git rename, no GitHub call,
and no running turn is at risk. Continue names its new branch after the
workspace name, with a task number. The change does not rename a branch
that exists already, and it does not change the branches of existing
workspaces.

The short name of this change is "branch-name". Its decisions are
branch-name decisions 1, 2, and 3.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md#the-branch-and-the-name).
- [Continue](../docs/protocol/continue.md#the-base-and-the-new-branch).
- [Workspace and session names](../docs/protocol/workspace-and-session-names.md).
- [Workspace menu](../docs/protocol/workspace-menu.md#rename),
  [Workspace calls](../docs/protocol/workspace-calls.md#rename-a-workspace),
  and [Names from the workspace tools](../docs/protocol/tool-names.md).
- The public guide [Workspaces](../src/marketing/docs/workspaces.md).
- The [lifecycle README](../worker/lifecycle/README.md) and the
  [chat README](../worker/chat/README.md), when they name the branch.

## Terms

- **Placeholder branch:** the branch name that the Worker makes at the
  create, before the workspace has a name.
- **Branch step:** the start step that runs `git checkout -b` in the cloud
  computer. It reads the branch name from the Worker record.
- **Slug:** the part of a branch name made from a workspace name, such as
  `saved-carts` from "Saved carts".
- **Task number:** the count of tasks of a workspace. The first task is 1.
  Each Continue adds 1.

## Decisions

### Branch-name decision 1: when the branch takes the title

Answered 16 November 2026: **A**.

- **A (chosen).** The Worker changes the stored branch name when the
  workspace gets a name before the branch step. This covers the automatic
  title, a manual rename, and a name in a create call. After the branch
  step, a name has no effect on the branch.
- **B.** A, and also a Git rename in the cloud computer until the first
  push, in a job like Continue that waits for each turn to end. Not
  chosen: a new job, waits, and failure states for a rare case.
- **C.** B, and also a GitHub rename after the push. Not chosen: GitHub
  closes an open pull request when its head branch gets a new name, and
  protected branches need an admin.
- Left out: the agent renames the branch (the name then comes from the
  agent, and sandbox code would control event routing); the create waits
  for the title (slower create, same result as A); show the title in
  place of the branch (GitHub keeps the city name); push a local branch
  to a remote branch with another name (`git push origin HEAD` breaks it);
  a new branch and a new pull request (reviews are lost).
- Reason: A names nearly every new branch, with no risk to Git, GitHub, or
  a running turn. A late title keeps the placeholder branch. That happens
  when the title model is slow or fails, or when the first message has
  only files.

### Branch-name decision 2: equal titles

Answered 16 November 2026: **A**.

- **A (chosen).** Keep 4 random characters after the slug:
  `calummoore/saved-carts-7k2q`.
- **B.** A clean slug with a check of the database and GitHub, and `-2`
  on a clash. Not chosen: it needs a GitHub read and race handling.
- Reason: no check is needed. The database does not require unique branch
  names, and GitHub events go to each workspace on a branch.

### Branch-name decision 3: the branch of Continue

Answered 16 November 2026: **B, with a version**. The user wrote "B (but
add a -v2)".

- **A.** Keep the city rule for Continue. Not chosen.
- **B (chosen).** Use the kept workspace name, a version, and new random
  characters: `calummoore/saved-carts-v2-7k2q`.
- **C.** Name the branch from the next message. Not chosen: it needs the
  Git rename of decision 1, option B.

## Design calls

All design calls are agent calls of 16 November 2026.

- The GitHub login prefix stays, because decision 53 requires it.
- The slug: NFKD, then remove combining marks, then lowercase. Each run of
  characters outside `a-z` and `0-9` becomes one hyphen. No hyphen at the
  start or at the end. At most 40 characters, cut at the last hyphen
  within the limit. Reason: Git's ref rules and short names in the pull
  request bar.
- An empty slug, such as from a title in a script with no Latin letters,
  keeps the city name. Reason: graceful handling, no error.
- A title keeps the 4 random characters of the placeholder branch:
  `calummoore/riga-aumm` becomes `calummoore/saved-carts-aumm`. Reason:
  the title path needs no new randomness, and a retried title write gives
  the same name.
- The version of Continue is `v<task number>`, after the slug and before
  the random characters. The Worker stores the task number in the
  workspace row. Reason: a version parsed from the branch name fails for
  a title such as "Upgrade to Node v24". The first task has no version.
- Continue of a workspace without a name uses the city name with the
  version: `calummoore/lisbon-v2-7k2q`.
- A workspace from before this change starts at task 1, also after an
  earlier Continue. So its next Continue gives `v2`. Reason: D1 holds no
  count of earlier Continues, and the product is not in production. A
  count from the chat history of each old workspace was rejected, because
  it adds a code path only for old rows.
- A marker in the workspace row says that the branch name can still
  change. Each new workspace sets it, also the workspace of a routine run.
  A pull request run creates a branch of its own from the pull request,
  with the rule of every workspace (decision 505 A), so its branch takes
  its title too. Existing rows get no marker, so their branches stay.
- The branch step clears the marker and reads the branch in one SQL
  statement. A name write changes the branch only in a statement that
  requires the marker. Reason: D1 runs one statement at a time, so a
  title and the branch step cannot both win.
- The branch step does not wait for a late title, because start time
  comes first.
- The runner variable `CONDUCTIVE_WORKSPACE_BRANCH` can hold the
  placeholder branch, because the cloud computer starts before the title.
  The runner reads it only when a turn gives no branches. Each turn gives
  the branches from the Worker record, so the agent instructions name the
  final branch. No change.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups of the create flow and of Rename say that the branch keeps
the city name. The fixture of Saved carts has a city branch.

- [x] Change the branch of the Saved carts fixture to a branch from its
      title, and update its comment in
      `docs/mockups/src/fixtures/workspaces.ts`.
- [x] Update the texts of `new-workspace/creating`: the branch starts
      with a city name and takes the title with the name.
- [x] Update the texts of `new-workspace/first-turn` and
      `workspace-menu/rename`.
- [x] Update the Continue mockup under `app/banner/continued` when it
      shows the new branch name.
- [x] Update the branch of the run workspace of `routines/run-workspace`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update this plan for each problem that the mockups show. The run
      workspace showed that a pull request run has a branch of its own.
      No marketing picture shows a changed branch.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `create-a-workspace.md`: the placeholder branch, the branch from the
      name before the branch step, the slug, and the empty slug. Cite
      branch-name decisions 1 and 2.
- [x] `continue.md`: the new branch takes the workspace name, the version,
      and random characters. Cite branch-name decision 3.
- [x] `workspace-and-session-names.md`, `workspace-menu.md`,
      `workspace-calls.md`, and `tool-names.md`: a name changes the branch
      only before the branch step.
- [x] Read the public guides in full. Update
      `src/marketing/docs/workspaces.md` and each other guide sentence
      about branch names.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates the branch rule. Check that the Privacy page
      covers the title in a branch name on GitHub. Done: the privacy
      notice names the branch name in its GitHub and agent items, with a
      new effective date. The guides of Workspaces and Pull requests name
      the branch of Continue.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: Worker

Depends on: 2

- [x] Migration: add the marker and the task number to `workspaces`. Add
      the marker to the creation plan table when the create copies the
      row from it.
- [x] `worker/lifecycle/workspace-branch.ts`: the slug function, the
      branch from a name, the title branch that keeps the random
      characters, and the Continue branch with its version. Unit tests.
- [x] Create: a name in the create call gives the branch at once. Each
      new workspace sets the marker.
- [x] Branch step: clear the marker and read the branch in one statement
      in `start-command-execution.ts`. Use that branch for the command.
      Check retries of the step.
- [x] Automatic title (`worker/chat/workspace-title.ts`,
      `worker/chat/queries.ts`): change the branch in the same statement
      when the marker is set. Publish `workspace.updated` so that open
      tabs show the new branch.
- [x] Manual rename (`worker/app-api/feature-workspaces-data.ts`) and
      `rename_workspace`: the same rule, and the same publication.
- [x] Continue (`worker/lifecycle/continue-admission.ts`,
      `continue-data.ts`): the branch from the name and the next task
      number. Store the task number with the branch.
- [x] Check that a title that arrives before the workspace row exists
      still names the branch, through the title repair.
- [x] Tests: a title before the branch step renames the branch; a title
      after it does not; a manual rename before and after; a create name;
      Continue with a name, without a name, and twice.
- [x] Update the lifecycle and chat READMEs.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, then `npm run check`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

Review round 1, 16 November 2026: four findings, all fixed. A test now
runs two Continues. The start settles the branch only while it is a
placeholder. One helper publishes the workspace record. A name with no
letter or digit puts back the city. Review round 2: two Low findings,
both fixed. The plan records the task number of older workspaces, and the
rename SQL states its fallback plainly.

## Post-merge follow-up (non-blocking)

- [ ] Create a workspace on the test deployment. Check that its branch on
      GitHub takes the title.
