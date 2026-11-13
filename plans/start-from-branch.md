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
Decisions 288 to 292 hold Cal's answers. Decisions 293 to 295 are open. An
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

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/create-request.ts:20` and `worker/lifecycle/workspaces.ts:44`.
- **Background:** Cal chose the branch check for the agent create on 11
  November 2026. New workspace gets its branches from a live list, so a
  wrong name comes only from a stale list or an old tab. A start whose
  branch is gone fails and waits for Try again. Try again uses the same
  branch.
- **Problem:** No decision says whether the browser create gets the check.
  The check adds a refusal to a path that has none for branches today.
- **Impact if no action:** A branch that is deleted after the pick makes a
  workspace that fails. Each Try again fails too, until a member archives
  it.
- **Root question:** What happens when a member creates a workspace from a
  branch that GitHub no longer has?
- **Options:**
  - **A.** The browser create uses the same branch check. A missing branch
    gets a refusal, and the composer keeps the message. Effort: Small.
  - **B.** No check. The start fails, and the failure names the missing
    branch. Effort: Small.
  - **C.** No check. When the start branch is gone, the start falls back to
    the default branch and says so in a start step. Cost: the work starts
    from a branch that the member did not pick. Effort: Medium.
- **Left out:** None.
- **Wider fix:** A. One check serves each create path.
- **Previous examples:** A create in a waiting repository gets a refusal, and
  the composer keeps the message (`repository_not_found`).
- **Recommendation:** A. It leaves no failed workspace, and it reuses the
  check of the agent create.
- **Action:** ask the user, because A adds a refusal to the browser create.

### Decision 294: a stored base that GitHub deleted

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `worker/github/client.ts:155`.
- **Background:** A stacked workspace stores the picked branch as its base.
  GitHub often deletes a branch when its pull request merges. The pull
  request bar compares the workspace branch with the stored base.
- **Problem:** When the base is deleted before the workspace opens its pull
  request, the bar shows "GitHub is not available. Try again." "Create PR"
  then targets a branch that does not exist.
- **Impact if no action:** A common stack flow ends with a broken bar. The
  member must open the pull request by hand.
- **Root question:** What does a workspace target when its base branch is
  gone from GitHub?
- **Options:**
  - **A.** No change. Effort: Small.
  - **B.** The bar says that the base branch is gone and turns off "Create
    PR". The member asks the agent to open the pull request into another
    branch. Cost: a new bar state with a mockup, and no way back in the app.
    Effort: Medium.
  - **C.** The Worker moves the stored base to the default branch, as
    Continue does under decision 290. It updates the Git setting in the cloud
    computer, and the bar says that the base moved. Cost: a new path that
    changes a stored base, and a command in the cloud computer. Effort:
    Medium.
- **Left out:** A base that follows GitHub in every case, because the paused
  plan owns it.
- **Wider fix:** C. It uses one rule for a gone base, at Continue and at any
  other time.
- **Previous examples:** Decision 290 for Continue.
- **Recommendation:** C. A stack then keeps working after its lower pull
  request merges.
- **Action:** ask the user, because the options add behaviour that no
  requirement covers.

### Decision 295: the target selected first

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** None.
- **Background:** Decision 291 offers two targets when the picked branch is
  not the default branch. The text of the chosen option named the picked
  branch as the first selection, but the answer did not confirm it. Cal
  first asked whether the work would still target `main`.
- **Problem:** No recorded answer says which target is selected first.
- **Impact if no action:** A member who does not look gets the target that
  this plan guesses.
- **Root question:** Which target does New workspace select before the
  member chooses?
- **Options:**
  - **A.** The picked branch. A member who forgets gets a stack, and Changes
    shows only the new work. Effort: Small.
  - **B.** The default branch. A member who forgets gets a pull request that
    also holds the commits of the picked branch. Effort: Small.
  - **C.** Neither. The member must choose before Send. Cost: one more step,
    and Send can be off. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. This is a choice of a default.
- **Previous examples:** Pull request runs target the head branch of their
  pull request (decision 507 G).
- **Recommendation:** A. A forgotten choice then costs the least: the member
  can change the base of the pull request on GitHub.
- **Action:** ask the user, because the options trade one cost against
  another, and Cal's first question points to B.

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

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the branch picker and the target choice on New workspace, on desktop
and on a phone.

- [ ] Add `app/new-workspace/start-branch`, with child pages of five screens
      or fewer:
  - [ ] The page and the dialog with the branch control beside the
        repository picker, set to the default branch.
  - [ ] The open picker with search, the default branch first, and the list
        states: loading, no results, a failed GitHub read with Try again, and
        no GitHub access to the repository.
  - [ ] A picked branch that is not the default branch, with the target
        choice of decision 291 on each of its two values.
  - [ ] The refusal of a missing branch, under decision 293.
  - [ ] The picker as a sheet on a phone.
- [ ] Draw the workspace after a start that stacks on a branch, with its pull
      request bar naming that base, and the bar of decision 294.
- [ ] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the work below.

- [ ] In `docs/protocol/create-a-workspace.md`, add a "Start from a branch"
      section with decisions 288, 291, 293, and 295. Change "The branch and
      the name" so that the branch starts from the start branch.
- [ ] In `docs/protocol/base-branches.md`, give the base of a workspace with
      a picked branch and of an agent create call, and decision 294.
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

Waits for decision 294.

- [ ] Apply decision 294 in `worker/github/client.ts` and the bar.
- [ ] Test a base that GitHub deleted before the pull request opens.
- [ ] Update `worker/github/README.md`.

## Milestone 8: Branch picker and target choice

Tags: ui

Depends on: 1, 3, 4

- [ ] Build the branch control and the picker on the page and in the
      dialog, with search and the list states, as the mockups show.
- [ ] Build the target choice of decision 291, with the first selection of
      decision 295.
- [ ] Keep the branch and the target in the draft, clear them on a change of
      repository, and send them with the create.
- [ ] Show the refusals of the branch check, and keep the message.
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
