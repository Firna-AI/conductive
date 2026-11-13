# Start a workspace from a branch that is not the default branch

Status: Active. On branch `calummoore/delft-39rk`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today every new workspace makes its own branch from the default branch of
its repository, and its work targets that branch. This change lets a member
pick another branch in New workspace, on the page and in the dialog. The
workspace still makes its own branch, with the name rule of decision 53, but
from the picked branch. The member then chooses the target: the picked
branch, which stacks the work on it, or the default branch. The agent call
`create_workspace` gets the same two choices. After a merge, Continue builds
on the branch that the pull request merged into, when that branch still
exists.

The change does not cover a start from a pull request or an issue, or a
target branch that follows GitHub after the pull request opens. Those parts
stay in the paused plan. Cal asked for the feature on 12 November 2026 and
chose its approach in a brainstorm on 13 November 2026. The notes are in
`.context/start-from-branch/brainstorm.md`.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Base branches](../docs/protocol/base-branches.md).
- [Continue](../docs/protocol/continue.md).
- [Workspace calls](../docs/protocol/workspace-calls.md).
- [GitHub tokens](../docs/protocol/github-tokens.md).
- [GitHub banner](../docs/protocol/github-banner.md).
- [Conductor comparison](../docs/protocol/conductor-comparison.md#statuses),
  for the rows in `src/marketing/from-conductor/areas/`.
- The Terms page in `src/marketing/terms.ts`, the Privacy page in
  `src/marketing/privacy.ts` with its data uses in
  `src/marketing/privacy-uses.ts`, and the public guides in
  `src/marketing/docs/`.
- The READMEs of `worker/lifecycle/`, `worker/tools/`, `worker/app-api/`,
  `worker/github/`, `src/shared/`, and `src/app/`.

## Terms

- **Start branch:** the branch whose newest commit the new workspace branch
  starts from. Today it is always the default branch.
- **Base branch:** the branch that the work of a workspace targets. Changes
  and diffs compare with it from the merge base, and "Create PR" opens a
  pull request into it (decision 507 G). GitHub stores a base only on a pull
  request. Conductive stores its own base for each workspace. A stored null
  means the default branch.
- **Stack:** a pull request whose base is another branch that is not merged
  yet.
- **Paused plan:** `plans/start-from-github.md` on the branch
  `calummoore/new-chat-start-from-brainstorm`. It plans starts from
  branches, pull requests, and issues.
- **Branch check:** the Worker asks GitHub for a named branch before the
  create, with the GitHub token of the sender.

## Decisions

The numbers 288 to 295 were the next free numbers on 13 November 2026.
Decisions 288 to 295 hold Cal's answers. An
options check ran over the decisions and the design calls. It added options
to decisions 288, 289, 290, and 291, corrected the design calls, and found
decisions 293 and 294. Its report is in
`.context/start-from-branch/options-check.md`.

### Decision 288: what a start from another branch makes

Chosen by Cal on 13 November 2026: A. The workspace makes its own branch,
such as `calummoore/delft-xxxx`, from the picked branch. The login rule of
decision 53 holds for every workspace branch. A branch with an open pull
request then gets a new stacked pull request, not more commits on that pull
request.

- Rejected: B, continue the picked branch and push to it, which was decision
  213 A of the paused plan. Two workspaces could share one branch, and the
  base needed a new rule. C, both actions in each row, because it doubles
  the actions and the start paths. D, from the options check: continue a
  branch whose name starts with the member's login, else branch off. It
  needs two start paths and an exception to decision 53.
- Left out: a note to the agent with no app change, because the pull request
  bar and Changes then do not follow the branch.

### Decision 289: the scope

Chosen by Cal on 13 November 2026: A, branches only. Starts from pull
requests and issues stay in the paused plan.

- Rejected: B, branches and pull requests. C, the whole paused plan with its
  four open decisions. D, from the options check: branches, and a base that
  follows the open pull request. All are larger, and Cal asked for branches.

### Decision 290: the base after Continue

Chosen by Cal on 13 November 2026: B. After a merge, Continue builds on the
branch that the pull request merged into, when that branch still exists on
GitHub. Otherwise it builds on the default branch. This changes decision
223, which always used the default branch.

- Rejected: A, keep decision 223, because a workspace on `develop` would move
  to `main` after each merge. C, always keep the stored base, because it
  fails when GitHub deleted that branch. D, from the options check: the
  stored base when it exists, else the default branch. It picks the wrong
  branch after a change of the base on GitHub. E, a choice in the Continue
  dialog, because it adds a question and a mockup.

### Decision 291: which branch the workspace targets

Chosen by Cal on 13 November 2026: D. When the picked branch is not the
default branch, New workspace offers a choice of two targets: the picked
branch or the default branch. Decision 295 holds which one is selected
first.

- Reason: Cal named two real cases. A member stacks on a branch, or works on
  a long-lived branch such as `develop`, and targets the picked branch. Or a
  member branches off a branch and still targets `main`.
- Rejected: A, always the picked branch, and B, always the default branch,
  because each serves one case only. C, a second picker for any target,
  because the other pairs are rare.
- Left out for now: F, from the options check: D, and then the base follows
  the open pull request on GitHub, as decision 216 D of the paused plan. It
  adds to D, and the paused plan owns it.

### Decision 292: the agent call

Chosen by Cal on 13 November 2026: A. The MCP tool and the CLI command of
`create_workspace` take both the start branch and the base branch. This
closes decision 281, which left a base branch for a create call to this
change. On 11 November 2026 Cal also chose that this change gives agents a
branch choice, with option B of
[the branch check item](follow-ups/agent-branch-choice-check.md).

- Not offered, from the options check: B, a start branch and a target of the
  start or the default branch. C, a base branch only. D, a start branch
  only. Each gives agents less than Cal asked for.

### Decision 293: the branch check on the browser create

Chosen by Cal on 13 November 2026: A. The create from New workspace uses the
same branch check as the agent create. A missing branch gets a refusal, and
the composer keeps the message.

- Rejected: B, no check and a start failure that names the branch, because
  each Try again then fails the same way. C, no check and a fall back to the
  default branch, because the work would start from a branch that the
  member did not pick.

### Decision 294: a stored base that GitHub deleted

Chosen by Cal on 13 November 2026: C. When the stored base of a workspace is
gone from GitHub, the Worker moves the base to the default branch, as
Continue does under decision 290. It updates the Git setting in the cloud
computer, and the bar says that the base moved.

- Problem that it solves: before, the bar showed "GitHub is not available.
  Try again." and "Create PR" targeted a branch that did not exist. The
  options check found it at `worker/github/client.ts:155`.
- Rejected: A, no change, because a normal stack flow then ends with a
  broken bar. B, a bar state that turns off "Create PR", because the app
  then gives no way back.
- Left out: a base that always follows GitHub, which the paused plan owns.

### Decision 295: the target selected first

Chosen by Cal on 13 November 2026: A. New workspace selects the picked
branch as the target before the member chooses.

- Rejected: B, the default branch, because a member who forgets then gets a
  pull request with the commits of the picked branch. C, no selection,
  because it adds a step before Send.

### Decision 296: a phone does not show the base branch

Open. Found by the mockups of Milestone 1 on 13 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `docs/mockups/src/components/workspace/BarActions.tsx:199` and `docs/protocol/github-banner.md`, under "Layouts".
- **Background:** On a computer the bar names the branch and its base. On a phone the compact row shows only the state, and Create PR stands at the top of the Checks tab.
- **Problem:** No phone screen names the base of a workspace without a pull request. Create PR on a phone opens a pull request into a branch that the phone does not show.
- **Impact if no action:** A member on a phone cannot see that a stacked workspace targets its picked branch and not the default branch.
- **Root question:** How does a member on a phone learn the target before Create PR?
- **Options:**
  - **A.** Show the branch and its base at the top of the Checks tab while the branch has no pull request. Effort: Small.
  - **B.** Show the base in the compact row at the top of the workspace. Long names get cut more. Effort: Small.
  - **C.** A, only when the base is not the default branch. Effort: Small.
  - **D.** No change. Effort: Small.
- **Left out:** A line in the workspace header, because the bar owns the branches.
- **Wider fix:** None. This is one layout rule.
- **Previous examples:** Pull request runs have a base that is not the default branch, and a phone does not show it either.
- **Recommendation:** A. The base shows where the member presses Create PR, with one rule for every workspace.
- **Action:** ask the user, because A changes the phone layout that `github-banner.md` states.

## Design calls

My calls, made on 13 November 2026:

- The agent call takes two optional fields, `startBranch` and `baseBranch`.
  The defaults apply to the fields as sent. With neither, both are the
  default branch. With only `startBranch`, the base is that branch. With
  only `baseBranch`, the start is that branch. Reason: the same default as
  New workspace, and Cal asked for both fields.
- A base that is the default branch is stored as null, as for a create
  today. A named branch that is the default branch skips the branch check,
  so an empty repository still works. Reason: a null base follows a rename
  of the default branch.
- The Worker accepts any pair of branches from the browser and from an
  agent. Only New workspace limits the target to the two choices of
  decision 291. Reason: one create path, and no new refusal of a pair.
- The branch check refuses a missing branch with HTTP 404 and the code
  `branch_not_found`, and a name that is not a valid Git branch name with
  HTTP 400 and the code `invalid_input`. When the token cannot read the
  repository, the refusal says so and does not claim that the branch is
  missing. When GitHub cannot answer, the create goes on, and the start
  decides. Reason: option B of the branch check item and its shared part,
  and the codes of the other create refusals.
- The check runs after the replay of a repeated request ID. Reason: a retry
  after a lost reply must give the workspace that exists.
- A branch that GitHub deletes between the create and the start fails the
  start, and the failure names the branch. Reason: Try again would fail the
  same way without that cause.
- The start pushes an empty first commit only to the default branch. It
  fetches the start branch and the base branch, creates the workspace branch
  from `refs/remotes/origin/<start branch>`, points `origin/HEAD` at the
  base, and sets `branch.<workspace branch>.gh-merge-base` to the base.
  Reason: a typo must not make a branch on GitHub, and `FETCH_HEAD` holds
  only the last fetch.
- Changes, the diffs, the ahead count of the bar, the branch line, and
  `get_workspace` already read the stored base. Webhook routing already
  reaches every workspace of the repository. They need no change.
- Continue takes the base of the merged pull request from the fresh GitHub
  read of its verify step, and asks GitHub whether that branch still
  exists. The Continue job gets separate fields for the default branch and
  the base, and a job that was saved before the change still reads. Continue
  no longer writes its base into the stored default branch of the
  repository. Reason: decision 290, and the stored GitHub summary holds only
  the state.
- The branch picker is a control beside the repository picker, on the page
  and in the dialog. It shows the default branch until the member picks
  another branch. It has a search. A phone opens it as a sheet. Reason: the
  design of the paused plan. The mockup milestone shows it for review.
- The target choice shows only when the picked branch is not the default
  branch. Its two labels name the branches, such as "Target `feature-x`" and
  "Target `main`". The words never say "fork". Reason: on GitHub, a fork is
  a copy of the repository.
- The Worker reads the branch list live from GitHub with the member's own
  GitHub user token, for one repository of the org. It stores no list. The
  default branch comes first, then the others by their newest commit.
  Reason: the browser gets no token, and each member sees only what GitHub
  shows to that member.
- A change of repository clears the picked branch and the target. The page
  and the dialog share them with the rest of the draft. Reason: a branch
  belongs to one repository.
- The pull request bar of a workspace with a stored base names that base.
  After a change of the base on GitHub, the bar names the old base, and a
  push to the new base does not refresh the bar. This limit stays until the
  paused plan builds a base that follows GitHub. A follow-up item records it
  when this plan is deleted. Reason: decision 289.
- The paused plan keeps its pull request and issue parts. Its decision 213 A
  no longer covers branches. The pull request description of this change
  says so. Reason: the paused plan lives on another branch.

Design calls from the mockups of Milestone 1, made on 13 November 2026:

- Each New workspace page and dialog shows the branch control where it
  shows the repository picker. The control always names a branch, so it has
  no Clear, and a pick of the default branch hides the target choice.
  Reason: the Clear of the paused plan was for a start point that a form
  can leave out.
- The picker lists the default branch first with the detail "default",
  then the other branches with the time since their newest commit. A
  search highlights its first match. The default branch needs no read of
  GitHub, so its row shows in each state of the list, and a failed read
  stops no start from it. Reason: the form knows the default branch.
- The list states say "Loading branches…" and "Nothing matches" with the
  query, as the command palette and the list of `@` do. A failed read
  shows a notice with Try again. A token that cannot read the repository
  shows a notice without an action, because only GitHub grants access.
- The phone views of `app/new-workspace/start-branch/picker` and of its
  variants draw the sheet, so the sheet has no page of its own. Reason: each
  page draws a phone view.
- The target choice is a segmented control on a computer, and two radio
  cards on a phone. A line under the choice says what the pull request
  then holds: only the new work, or also the commits of the picked branch.
  In the dialog the choice takes a line of its own under the header.
  Reason: the mockups showed that two branch names do not fit side by side
  on a phone, and the line names the cost that decision 295 avoids.
- A pick of another branch that is not the default branch keeps the target
  choice of the member. Only a change of repository clears it. Reason:
  decision 295 selects the picked branch only before the member chooses.
- The refusal of a missing branch is the notice of a failed create, with
  the cause and the kept message. Its one action is Start from and the
  default branch, which puts the control back on that branch. Send stays on,
  as after each failed create. The refusal of a token that cannot read the
  repository offers Try again. Reason: Try again of a missing branch fails
  the same way, as the reason against option B of decision 293 says.
- The bar of decision 294 names the default branch, and a line under it
  says "Now targets main, because the branch `<base>` is no longer on
  GitHub." The line is a status, not a refusal, and it shows until a pull
  request opens. On a phone it stands at the top of the Checks tab.
  Reason: a pull request names its own base on GitHub.
- A sentence puts "the branch" before a branch name. Reason: the mockups
  showed that a name such as `calummoore/checkout-autocomplete` reads like
  the name of a repository.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the branch picker and the target choice on New workspace, on desktop
and on a phone.

- [x] Add `app/new-workspace/start-branch`, with child pages of five screens
      or fewer:
  - [x] The page and the dialog with the branch control beside the
        repository picker, set to the default branch.
  - [x] The open picker with search, the default branch first, and the list
        states: loading, no results, a failed GitHub read with Try again, and
        no GitHub access to the repository.
  - [x] A picked branch that is not the default branch, with the target
        choice of decision 291 on each of its two values.
  - [x] The refusal of a missing branch, under decision 293.
  - [x] The picker as a sheet on a phone.
- [x] Draw the workspace after a start that stacks on a branch, with its pull
      request bar naming that base, and the bar of decision 294.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the work below.

- [ ] In `docs/protocol/create-a-workspace.md`, add a "Start from a branch"
      section with decisions 288, 291, 293, and 295, and the rules of the
      branch control, its picker, the target choice, and the refusals from
      the design calls of the mockups. Change "The branch and the name" so
      that the branch starts from the start branch.
- [ ] In `docs/protocol/base-branches.md`, give the base of a workspace with
      a picked branch and of an agent create call, and decision 294. In
      `docs/protocol/github-banner.md`, add the line under the bar of a base
      that moved, which shows until a pull request opens.
- [ ] In `docs/protocol/continue.md`, replace decision 223 with decision 290.
- [ ] In `docs/protocol/workspace-calls.md`, replace the text of decision 281
      with the two fields of decision 292, their defaults, and the replay of a
      request ID.
- [ ] In `docs/protocol/github-tokens.md`, state the branch list read and the
      branch check with the member's GitHub token.
- [ ] Update each other doc that restates the old start, the old target, or
      decision 223: `docs/protocol/agent-instructions.md`,
      `docs/protocol/workspace-life.md`, `docs/protocol/github-banner.md`,
      `docs/architecture.md`, `docs/architecture/flows.md`, and
      `docs/deployment.md`.
- [ ] Read the Terms page, the Privacy page with its data uses, and each
      public guide in full. Update each sentence that restates a changed
      fact, such as the start of a workspace branch and the GitHub reads.
- [ ] Update the comparison rows "Start from a branch, PR, or issue", "Latest
      base branch", "Target branch", "Diff viewer", and "Default branch per
      repository" under the rules of
      `docs/protocol/conductor-comparison.md#statuses`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Branch list

Depends on: 2

- [ ] Add the shared contract of the branch list in `src/shared/`.
- [ ] Add a browser route that lists the branches of one repository of the
      org, with a search. It checks the member and the repository, reads with
      the member's GitHub user token, and stores nothing.
- [ ] Test the route against the fake GitHub server: org and repository
      isolation, the order, search, an empty repository, and a failed GitHub
      read.
- [ ] Update `worker/app-api/README.md` and `src/shared/README.md`.

## Milestone 4: Create from a start branch and a base branch

Depends on: 2

- [ ] Add the optional `startBranch` and `baseBranch` to the create request,
      with the defaults of the design calls.
- [ ] Add one Worker branch check, with the refusals of the design calls and
      the fallback when GitHub cannot answer. Apply it to the browser create
      as decision 293 says.
- [ ] Store the start branch with the creation plan in a migration, beside
      the base branch. Keep Try again and each resume on the same branches.
- [ ] Change the start command as the design calls say, in
      `worker/lifecycle/start-command.ts` and
      `worker/lifecycle/default-branch-command.ts`.
- [ ] Test each default, each refusal, the replay, the start command, an
      empty repository, a branch deleted before the start, and Try again.
- [ ] Delete `plans/follow-ups/agent-branch-choice-check.md`, because this
      milestone applies its option B.
- [ ] Update `worker/lifecycle/README.md`, `worker/lifecycle/default-branch.md`,
      and `worker/lifecycle/workspace-object.md`.

## Milestone 5: The agent call

Depends on: 4

- [ ] Add `startBranch` and `baseBranch` to `create_workspace` in
      `tools/workspace-mcp-tools.ts`, the CLI in `tools/cli-help.ts` and
      `tools/cli-options.ts`, and `src/shared/agent-workspaces.ts`. The help
      says what each field does and its default. Change "Omitted choices use
      the owner's defaults" so that it stays true.
- [ ] Pass them through `worker/tools/create.ts` to the create of
      Milestone 4.
- [ ] Test the call through `runToolProcess` and the MCP adapter, with each
      default, a refusal, and a replay.
- [ ] Update `worker/tools/README.md`.

## Milestone 6: Continue builds on the merged base

Depends on: 2

- [ ] Choose the base of Continue with decision 290, in
      `worker/lifecycle/continue-progress.ts` and
      `worker/lifecycle/continue-admission.ts`.
- [ ] Split the default branch and the base in the Continue job, in
      `worker/lifecycle/continue-types.ts`,
      `worker/lifecycle/continue-data.ts`, and
      `worker/lifecycle/continue-publication.ts`. Read a job that was saved
      before the change.
- [ ] Test a merge into a branch that still exists, a merge into a deleted
      branch, a merge into the default branch, and an old saved job.
- [ ] Update `worker/lifecycle/continue.md`.

## Milestone 7: A gone base branch

Depends on: 2

- [ ] Apply decision 294 in `worker/github/client.ts`, the bar, and a
      command that updates `gh-merge-base` in the cloud computer.
- [ ] Keep the name of the base that moved until a pull request opens, so
      the bar and the top of the Checks tab of a phone show its line, as
      `app/new-workspace/start-branch/stacked/base-moved` shows. Take the
      words from `barCopy.ts` and the rule from the `baseMoved` fact of
      `barModel.ts`.
- [ ] Test a base that GitHub deleted before the pull request opens.
- [ ] Update `worker/github/README.md`.

## Milestone 8: Branch picker and target choice

Tags: ui

Depends on: 1, 3, 4

- [ ] Build the branch control and the picker on the page and in the
      dialog, with search and the list states, as the mockups show.
- [ ] Build the target choice of decision 291, with the first selection of
      decision 295: a segmented control on a computer, and radio cards on
      a phone. Keep the choice of the member when the member picks another
      branch.
- [ ] Keep the branch and the target in the draft, clear them on a change of
      repository, and send them with the create.
- [ ] Show the refusals of the branch check, and keep the message. A
      missing branch offers Start from and the default branch, and a token
      that cannot read the repository offers Try again. Take the words from
      `docs/mockups/src/components/new-workspace/branchCopy.ts`.
- [ ] Test the picker states, the clear, the target choice, and the create
      request.
- [ ] Compare each screen with its mockup on desktop and on a phone. Update
      `src/app/README.md`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test a start that stacks on a branch, and a start that branches
      off and targets the default branch, on the development page.
- [ ] Set the comparison rows as Milestone 2 says.
- [ ] Renumber decisions 288 to 295 when another change took those numbers.
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

- [ ] On the deployment, start a workspace that stacks on a branch of a test
      repository. Check the pull request bar, Changes, and a Continue after
      the merge.
