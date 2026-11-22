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

This plan first gave its decisions the numbers 288 to 298 and 301. On
21 November 2026, Milestone 18 renumbered them, because `main` used the
numbers 288 to 297 for other changes. The old 288 to 298 became 298 to 308
in the same order, and the old 301 became 309. Decisions 310 to 312 kept
their numbers.

Each decision reference in the files of this branch uses the new numbers,
also in the completed milestones. The old numbers stay only in the text
about the renumbering, here and in Milestones 9 and 18. The commit messages
and the evidence in `.context/start-from-branch/` keep the old numbers.
Evidence folder names, such as `ui-301`, keep them too.

Decisions 298 to 312 hold Cal's answers. An options check ran over the
decisions and the design calls. It added options to decisions 298, 299,
300, and 301, corrected the design calls, and found decisions 303 and 304.
Its report is in `.context/start-from-branch/options-check.md`.

### Decision 298: what a start from another branch makes

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

### Decision 299: the scope

Chosen by Cal on 13 November 2026: A, branches only. Starts from pull
requests and issues stay in the paused plan.

- Rejected: B, branches and pull requests. C, the whole paused plan with its
  four open decisions. D, from the options check: branches, and a base that
  follows the open pull request. All are larger, and Cal asked for branches.

### Decision 300: the base after Continue

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

### Decision 301: which branch the workspace targets

Chosen by Cal on 13 November 2026: D. When the picked branch is not the
default branch, New workspace offers a choice of two targets: the picked
branch or the default branch. Decision 305 holds which one is selected
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

### Decision 302: the agent call

Chosen by Cal on 13 November 2026: A. The MCP tool and the CLI command of
`create_workspace` take both the start branch and the base branch. This
closes decision 281, which left a base branch for a create call to this
change. On 11 November 2026 Cal also chose that this change gives agents a
branch choice, with option B of
the branch check follow-up item. This change applies that item's option B.

- Not offered, from the options check: B, a start branch and a target of the
  start or the default branch. C, a base branch only. D, a start branch
  only. Each gives agents less than Cal asked for.

### Decision 303: the branch check on the browser create

Chosen by Cal on 13 November 2026: A. The create from New workspace uses the
same branch check as the agent create. A missing branch gets a refusal, and
the composer keeps the message.

- Rejected: B, no check and a start failure that names the branch, because
  each Try again then fails the same way. C, no check and a fall back to the
  default branch, because the work would start from a branch that the
  member did not pick.

### Decision 304: a stored base that GitHub deleted

Chosen by Cal on 13 November 2026: C. When the stored base of a workspace is
gone from GitHub, the Worker moves the base to the default branch, as
Continue does under decision 300. It updates the Git setting in the cloud
computer, and the bar says that the base moved.

- Problem that it solves: before, the bar showed "GitHub is not available.
  Try again." and "Create PR" targeted a branch that did not exist. The
  options check found it at `worker/github/client.ts:155`.
- Rejected: A, no change, because a normal stack flow then ends with a
  broken bar. B, a bar state that turns off "Create PR", because the app
  then gives no way back.
- Left out: a base that always follows GitHub, which the paused plan owns.

### Decision 305: the target selected first

Chosen by Cal on 13 November 2026: A. New workspace selects the picked
branch as the target before the member chooses.

- Rejected: B, the default branch, because a member who forgets then gets a
  pull request with the commits of the picked branch. C, no selection,
  because it adds a step before Send.

### Decision 306: a phone shows the base branch

Chosen by Cal on 16 November 2026: A. While the workspace branch has no
pull request, the top of the Checks tab on a phone shows the branch and its
base, where Create PR stands. Found by the mockups of Milestone 1.

- Rejected: B, the base in the compact row, because long names get cut
  more. C, only when the base is not the default branch, because one rule
  for every workspace is simpler. D, no change, because a phone user could
  not see the target before Create PR.

### Decision 307: the fetch of a moved base

Chosen by Cal on 16 November 2026: D, from review item 1 of the branch
review. When a base moves (decision 304), one shared base-change
operation, built like the one of Continue, fetches the new base into its
remote-tracking ref in an isolated stage, and only then changes
`gh-merge-base` and `origin/HEAD`. A move that no member started, from a
webhook, a retry, or a resume, fetches with the GitHub token of the
workspace owner, the account that `gh` already uses outside a turn.

- Problem that it solves: the move changed only the names, so Changes
  compared with an old copy of the default branch and showed merged work.
- Rejected: A and B of the review, because a move that no member started
  has no token under the rules before this decision. C and F, a resolved
  base commit for the runner, because they change the runner contract. E,
  a move at the next agent turn, because a workspace that waits for review
  keeps the old comparison. G, a button on the line of a moved base,
  because Changes then wait for a press.

### Decision 308: one owner of the base move retries

Chosen by Cal on 16 November 2026: E, from review item 101 of the branch
review. The shared operation of decision 307 owns the cloud update of a
base move, with one saved retry job that starts with the repair marker and
a capped growing delay. Each resume runs the same job. The GitHub read
keeps the database move and the marker, and runs no cloud command, so a
failing cloud computer no longer fails a banner read.

- Problem that it solves: each failed cloud update added a new retry chain,
  a failed database write of the move scheduled no retry, and a failed
  cloud command showed "GitHub is not available".
- Rejected: A, B, D, and F of the review, because the cloud update stays
  inside the GitHub read and its failure keeps failing that read.

### Decision 309: a compact branch control in the header

Chosen by Cal on 20 November 2026: variant B, Pair, of the compact
variants under `app/new-workspace/start-branch/compact`, with the branch
control in the header directly right of the repository picker. The
control shows `main`, the default branch, until the member picks another
branch. Its dropdown has two parts: "Start from", with the search and the
branch list, and "Target", with the two named targets and the line about
what the pull request holds. The closed control adds `→ main` while a
picked branch targets the default branch. The separate target row goes.

- Reason: Cal found the target row too verbose (16 November 2026), and B
  names both targets and shows a default-branch target before the send.
- Rejected: A, a target control in the dropdown with no sign on the closed
  control. C, a second control for the target. D, a submenu on the
  checked row. E, one "Target main" switch. Also rejected: the place in the
  composer footer that all five variants drew, because Cal placed the
  control next to the repository picker.
- This replaces the target row of decision 301 and the design calls of
  Milestones 1 and 8 that describe it. The choice of two targets, and the
  picked branch as the first selection (decision 305), stay.

### Decision 310: a rename of the default branch reaches the cloud computer

Chosen by Cal on 21 November 2026: B, from merge item 1 of the merge of
`main` on 20 November 2026. When the `repository` webhook of `main` (#463)
saves a new default branch, the Worker saves one base move for each live
workspace of that repository whose base is the default branch. The move
reuses the fetch with the owner's token (decision 307) and the one retry
owner (decision 308), so the cloud computer fetches the new default branch
and then targets it.

- Problem that it solves: after a rename, the app named the new default
  branch, but the cloud computer kept its old copy and target, so Changes
  could show merged work and `gh` targeted a branch that GitHub no longer
  had. `main` had the same gap.
- Rejected: A, no change, because members would need Continue or a new
  workspace after each rename. C, a fetch at each start, because a running
  cloud computer waits for its next start and each start needs a token.

### Decision 311: the follow-up item on a stale saved default branch goes

Chosen by Cal on 21 November 2026: A, from merge item 3. Delete
`plans/follow-ups/saved-default-branch-after-github-rename.md`, because
`main` built its option C, a `repository` webhook (#463, #500, #515).
Decision 310 covers the cloud computers that already run.

- Rejected: B, a rewrite that keeps only the running computers, because
  decision 310 owns that work.

### Decision 312: a repository change stores the default base as null

Chosen by Cal on 21 November 2026: B, from merge item 4. When `main`'s
repository change (#423) moves a workspace to another repository and its
base is that repository's default branch, it stores the base as null, as a
create and Continue do, so the base follows a later rename.

- Problem that it solves: a stored name made a later rename look like a
  deleted base, and the bar said that the branch was no longer on GitHub.
- Rejected: A, no change, because the bar would show a wrong cause.

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
  decision 301. Reason: one create path, and no new refusal of a pair.
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
  repository. Reason: decision 300, and the stored GitHub summary holds only
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
  when this plan is deleted. Reason: decision 299.
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
  on a phone, and the line names the cost that decision 305 avoids.
- A pick of another branch that is not the default branch keeps the target
  choice of the member. Only a change of repository clears it. Reason:
  decision 305 selects the picked branch only before the member chooses.
- The refusal of a missing branch is the notice of a failed create, with
  the cause and the kept message. Its one action is Start from and the
  default branch, which puts the control back on that branch. Send stays on,
  as after each failed create. The refusal of a token that cannot read the
  repository offers Try again. Reason: Try again of a missing branch fails
  the same way, as the reason against option B of decision 303 says.
- The bar of decision 304 names the default branch, and a line under it
  says "Now targets main, because the branch `<base>` is no longer on
  GitHub." The line is a status, not a refusal, and it shows until a pull
  request opens. On a phone it stands at the top of the Checks tab.
  Reason: a pull request names its own base on GitHub.
- A sentence puts "the branch" before a branch name. Reason: the mockups
  showed that a name such as `calummoore/checkout-autocomplete` reads like
  the name of a repository.

Design calls from the docs of Milestone 2, made on 13 November 2026:

- A token that cannot read the repository gets HTTP 403 with the code
  `github_access_required` at the branch check. Reason: the design calls
  give the rule, and 403 is the status of a missing permission.
- An expired GitHub sign-in at the branch check or the list read counts as
  "GitHub cannot answer", so the create goes on and the start decides.
  Reason: a refusal there would be a new rejection, and the rule for a
  GitHub read that fails already exists.
- When GitHub does not answer whether the merged-into branch still
  exists, Continue stops and keeps its branch, as it does today when its
  first GitHub read fails. Reason: a fall back to the default branch could
  set the wrong base.
- The Terms changed, so `TERMS_VERSION` in `src/shared/terms.ts` names a
  new revision. Reason: users agree to the current revision at their next
  sign-in (decision 126).

Design calls from the backend implementation, made on 13 November 2026:

- The private GitHub snapshot keeps the pull request's real base in
  `pullBaseBranch`. The banner still uses the stored workspace base.
  Reason: Continue follows the merged pull request without adding the
  deferred feature of a workspace base that follows an open pull request.
- The public `GitHubBanner.baseMoved` field holds the deleted branch name.
  Its presence supplies the mockup's boolean fact and its message names.
  Reason: the app needs the old name as well as the new target.
- A private `baseChange` marker in the committed GitHub snapshot keeps
  the D1 move and cloud command repairable without a new schema field.
  The next refresh repairs that marker before it replaces the snapshot.
  Reason: a lost D1 or provider reply must not lose the moved base name.
- The trusted metadata command writes `gh-merge-base` and `origin/HEAD`.
  Each startup also applies the current stored base before the startup
  script and runner. Reason: a stopped computer must follow a base move,
  and the retained runner already reads the setting for each scan and diff.

Design calls from the UI of Milestone 8, made on 13 November 2026:

- A send ends the picked branch and its target, as it ends the message of
  the draft. Reason: they belong to the draft.
- Start from and the default branch also removes the refusal and moves the
  focus to the message. Reason: the mockup shows the page without the
  refusal after this action.
- The search filters the list that the app already has, with no new read
  for each key. Each open of the picker reads the list again and shows
  "Loading branches…" until the reply. Reason: the Worker gives every
  branch, and the protocol asks for a live list.
- The target line says "the commits of the branch <name>". Reason: the
  rule that puts "the branch" before a branch name. The first mockup copy
  left it out.

Design calls from the mockups of Milestone 10, made on 16 November 2026:

- The top of the Checks tab of a phone names the branch and its base with
  the parts of the desktop bar: the branch icon, the branch, an arrow, and
  the base, in the same font and colours. It adds no words. Reason: the
  desktop bar already names the branch and its base in this way, so the
  two layouts look the same.
- On a phone the names wrap. When the two names do not fit on one line,
  the base takes a line of its own with its arrow. A name that is longer
  than the line breaks. Reason: a phone has no tooltip, and decision 306
  rejected option B because long names get cut.
- The branch and its base stand in the group of Create PR, on the line
  above the button. The line of a moved base (decision 304) stays first,
  above them. Reason: the base is the target of Create PR, and the top of
  the Checks tab keeps its order: the message, then the actions.
- The branch and its base show in each state without a pull request, also
  without an action: a branch without commits, a member with read access,
  and a suspended org. Reason: decision 306 gives one rule for every
  workspace, and the desktop bar names the branches in each of these
  states.
- The compact row of a phone does not change. Reason: decision 306
  rejected the base in the row.
- The `create-pr` variant of `app/new-workspace/start-branch/stacked`
  draws a stacked base. `app/banner`, `app/banner/no-commits` with its
  `local-work` variant, and `app/banner/continued/moved-files` draw a base
  that is the default branch. Reason: these pages already show the phone
  Checks tab of a workspace that targets main, so a copy under the stacked
  page would show the same screen twice.
- The styles are new classes in `BarActions.module.css`, which the app
  already imports for the top of the Checks tab. Reason: Milestone 13 can
  use them without a copy, and no rule that the app reads today changes.

Design calls from Milestones 11 to 13, made on 16 November 2026:

- Every fetch of a moved base uses the token of the workspace owner, also
  when a tab read found the deleted base. Reason: decision 308 takes the
  cloud update out of every GitHub read, so only the saved retry or a
  resume runs the fetch, and neither has a member.
- A failed move does not stop a resume, and the startup does not apply an
  unfinished move before its fetch. Reason: decision 308 gives each
  failure to the retry, and the missing-ref rule keeps the old target.
- The retry job has one stable key, saved in the same transaction as the
  repair marker. Its delay starts at one second, doubles after each
  failure, and stops at 15 minutes. A move waits while a Continue runs.
  Reason: decision 308, and Continue owns the branch while it runs.
- The trusted fetch maps to the owner only while it runs, and the mapping
  lives only in memory. Reason: a rebuilt object then gives no token.
- `github-banner.md` and `github-tokens.md` were split, and only sections
  with no inbound links moved. Reason: the file length rule.
- The phone line reads the names from a new `branches` field of the bar
  view, and the group keeps the name "Pull request actions". Reason: no
  caller changes, and the shell tests find the group by that name.

Design calls from the mockups of Milestone 14, made on 20 November 2026:

- The control is the action button of the repository picker, with the
  same tone, size, and chevron, and the branch icon. `→ main` follows the
  name, before the chevron, in the muted colour of the effort of the model
  picker, and the spoken name adds the target. Reason: Cal asked for the
  look of the repository picker, and variant B drew this muted part.
- A long name keeps the rule of the header: the ellipsis at the end of the
  name, and `→ main` and the chevron stay in view. The limit of the
  control grows from 280 px to 340 px while it shows `→ main`, so a name
  gives way at about the same length. Reason: Cal has not answered the
  open item on long names, so the rule before decision 309 stays.
- The label Start from heads the list also when the dropdown has no
  Target part. The Target rows name their branches without the word
  Target, the picked branch first, with a check on the target and no
  detail. Reason: variant B, and the label says Target once.
- A pick in Start from closes the dropdown, and so does a press on a
  Target row. The Target part shows when the member opens the control on
  a picked branch. Reason: variant B closes the dropdown on a pick, as
  every picker does.
- The dropdown takes at most the room below the control. When the room
  runs out, the list of branches scrolls, and the labels, the search
  field, and the Target part stay in view. On the page the room is about
  half the screen, in the dialog about half the screen and the part of the
  dialog under its header, and a phone sheet uses its body. Reason: the
  frame of the catalogue is 720 px high, so the Target part of the page
  fell off its bottom, and the app already limits its picker to the room
  below the control.
- The dialog page shows five states of the control: main, the open
  dropdown on main, the picked branch, the dropdown with its Target part,
  and target main. The refusal of a missing branch in the dialog moved to
  `app/new-workspace/start-branch/missing/dialog`, and `dialog/target-default`
  became `dialog/target-main`. They declare no `movedFrom`, because `main`
  never had these paths, so the hint matches nothing. Only the page draws
  the open dropdown on target main. Reason: a page shows at most five
  screens.
- `TargetChoice.module.css` and the `target` rule of
  `NewWorkspaceDialog.module.css` stay until Milestone 16, and
  `targetCopy.option` stays. `branchCopy.control` takes the target as an
  optional second value. Reason: the app imports them, and it keeps
  working until it builds decision 309.
- The start of the New workspace page, `.start` of
  `NewWorkspaceScreen.module.css`, gets `min-width: 0`. Reason: the smoke
  test found that a branch name, which does not wrap, made the start
  412 px wide on a 390 px phone. So the name got no ellipsis, and on a
  360 px phone `→ main` and the chevron fell off the screen. The rule
  changes only the three phone views with `→ main`. The app imports the
  file, so it gets the rule too.

Design calls from the docs of Milestone 15, made on 20 November 2026:

- The protocol doc gives a reason for each rejected variant of decision
  309: C adds a control where B adds none, and D hides both targets behind
  a submenu where B names both. Reason: the plan recorded a reason only
  for B.
- The old target row is a rejected way of decision 309, not history.
- The doc says only that a long name is cut short. Reason: the open item
  on long names has no answer.

Design calls from the UI of Milestone 16, made on 20 November 2026:

- The rows of the Target part are the radios of the group Target, with one
  stop of Tab on the checked row. Up and Down move the focus between them,
  with a wrap, and choose nothing. A press, Enter, or Space chooses the
  target and closes the dropdown. Reason: a choice closes the dropdown, so
  a key that chose at each move would close it at once. The list of Start
  from and the menus of the app also move with the keys and choose with
  Enter.
- A Target row whose name is cut shows the full name as a tooltip, as each
  row of Start from does. Reason: the rows of one dropdown behave the same.
- The layer of the dropdown keeps it below the control also when it does
  not fit there, and limits it to the room below, so the list of branches
  scrolls. The option `keepSide` of `PopoverSurface` does this, and every
  other menu still flips to the roomier side. Reason: the protocol doc
  opens the dropdown below the control. With the Target part, the dropdown
  needs about 415 px, and the room below the control on the page is 412 px
  at a window height of 900 px and 322 px at 720 px, so the layer flipped
  it above. The room caps of the mockup would fit by only 2 px, and not at
  all for a control on a second line.

Design calls from the merge of `origin/main`, made on 20 November 2026:

- A base move waits while a Continue or a repository change runs. Reason:
  the repository change of `main` holds the workspace against each action
  that changes its branch, as Continue does, and the call of Milestones 11
  to 13 keeps the move away from a job that owns the branch.
- Continue reads the default branch with the GitHub token of the member
  who pressed it, and a repository change keeps the token of the GitHub
  App. Reason: Continue reads its pull request and its base with that
  token, and a member's token may not reach the new repository of a
  change.

Design calls from the renumbering of Milestone 18, made on 21 November 2026:

- The completed milestones and the ticked TODOs also take the new numbers.
  Reason: an old number there now names a decision of `main`. The text
  that describes the renumbering, in Milestones 9 and 18, keeps the old
  numbers.
- The evidence folder names keep their old numbers, such as `ui-301`.
  Reason: they name folders on disk, and a new name would point at no
  folder.
- The note on the taken numbers moved from decision 309 to the start of
  "Decisions", and decision 310 and Milestone 19 no longer give the old
  numbers. Reason: the start of "Decisions" holds the map from the old
  numbers to the new ones.

Design calls from Milestone 19, made on 21 November 2026:

- The webhook saves each default-base move and its alarm before its guarded
  repository write. The job waits while the earlier repository values still
  hold. Reason: a failed workspace call must leave the default unchanged,
  so a repeated delivery can save every move before the earlier name goes.
- The internal GitHub refresh signal carries this prepare request through
  the existing workspace entry point. It performs no GitHub read or cloud
  command. Reason: reuse the durable move and its retry without a new
  browser, Mac app, or runner contract.
- The repository publication checks the effective base after its write,
  while its regression test also reads the raw stored value. Reason: the
  workspace reader resolves null to the repository default.
- The repository-change protocol keeps its After the change heading and
  links to a new page for that section. Reason: the doc must stay near
  250 lines, and existing links to the heading must keep working.

Design calls from the Milestone 19 overlap repair, made on 21 November 2026:

- Cal selected option A of the overlap finding: repair the existing job,
  with no migration. The job reads the authoritative saved default before
  each attempt. This replaces the earlier call to wait while the previous
  repository values hold. Reason: two guarded saves and their workspace
  preparations can finish in different orders.
- Each guarded save attempt has an internal receipt in the existing
  webhook delivery table. Closing that receipt prevents a delayed write.
  After installation, the move closes unfinished receipts and keeps its
  retry. A rejected write prepares again under a fresh receipt. Reason:
  an unfinished transition must retain its move, and an interrupted sync
  must not retain the job forever.
- The one move job keeps its ID and growing retry count. Changed
  preparations and target resolution each get a new revision. Credential
  checks, retries, completion, and isolated stages use that revision.
  Reason: an older fetch must not install after it observes a newer
  revision or remove the newer move.

Design calls from the merge of `origin/main` at `bad6521f1`, made on 22 November 2026:

- The deleted base of `GitHubBanner.baseMoved` gets the masked label
  `displayBaseMoved`, which the shared `filterGitHubBanner` of `main` adds
  at each Worker boundary, and the bar and the top of the phone Checks tab
  show the labels of the branch, its base, and the deleted base. Reason:
  [Tokens and secrets](../docs/protocol/tokens-and-secrets.md) requires a
  label that hides each secret value for each branch name on a screen, and
  `main` labels the branch and its base in this way (#621).
- The move of Continue and the base move keep one install command, and its
  checkout and its settings end with the statuses of `main` for a clash, an
  index lock, and failed comparison settings. Reason: decision 307 shares
  the install with Continue, and `main` stores the stop cause of each
  status (#625).

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
        choice of decision 301 on each of its two values.
  - [x] The refusal of a missing branch, under decision 303.
  - [x] The picker as a sheet on a phone.
- [x] Draw the workspace after a start that stacks on a branch, with its pull
      request bar naming that base, and the bar of decision 304.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the work below.

- [x] In `docs/protocol/create-a-workspace.md`, add a "Start from a branch"
      section with decisions 298, 301, 303, and 305, and the rules of the
      branch control, its picker, the target choice, and the refusals from
      the design calls of the mockups. Change "The branch and the name" so
      that the branch starts from the start branch. The section links to
      the new page `docs/protocol/start-from-a-branch.md`, which holds the
      rules. The dialog moved to `docs/protocol/create-a-workspace-dialog.md`,
      so that the doc stays under 300 lines.
- [x] In `docs/protocol/base-branches.md`, give the base of a workspace with
      a picked branch and of an agent create call, and decision 304. In
      `docs/protocol/github-banner.md`, add the line under the bar of a base
      that moved, which shows until a pull request opens.
- [x] In `docs/protocol/continue.md`, replace decision 223 with decision 300.
- [x] In `docs/protocol/workspace-calls.md`, replace the text of decision 281
      with the two fields of decision 302, their defaults, and the replay of a
      request ID.
- [x] In `docs/protocol/github-tokens.md`, state the branch list read and the
      branch check with the member's GitHub token.
- [x] Update each other doc that restates the old start, the old target, or
      decision 223: `docs/protocol/agent-instructions.md`,
      `docs/protocol/workspace-life.md`, `docs/protocol/github-banner.md`,
      `docs/architecture.md`, `docs/architecture/flows.md`, and
      `docs/deployment.md`.
- [x] Read the Terms page, the Privacy page with its data uses, and each
      public guide in full. Update each sentence that restates a changed
      fact, such as the start of a workspace branch and the GitHub reads.
- [x] Update the comparison rows "Start from a branch, PR, or issue", "Latest
      base branch", "Target branch", "Diff viewer", and "Default branch per
      repository" under the rules of
      `docs/protocol/conductor-comparison.md#statuses`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: Branch list

Depends on: 2

- [x] Add the shared contract of the branch list in `src/shared/`.
- [x] Add a browser route that lists the branches of one repository of the
      org, with a search. It checks the member and the repository, reads with
      the member's GitHub user token, and stores nothing.
- [x] Test the route against the fake GitHub server: org and repository
      isolation, the order, search, an empty repository, and a failed GitHub
      read.
- [x] Update `worker/app-api/README.md` and `src/shared/README.md`.

Evidence: `.context/start-from-branch/m3-red.log` and `m3-green.log`.

## Milestone 4: Create from a start branch and a base branch

Depends on: 2

- [x] Add the optional `startBranch` and `baseBranch` to the create request,
      with the defaults of the design calls.
- [x] Add one Worker branch check, with the refusals of the design calls and
      the fallback when GitHub cannot answer. Apply it to the browser create
      as decision 303 says.
- [x] Store the start branch with the creation plan in a migration, beside
      the base branch. Keep Try again and each resume on the same branches.
- [x] Change the start command as the design calls say, in
      `worker/lifecycle/start-command.ts` and
      `worker/lifecycle/default-branch-command.ts`.
- [x] Test each default, each refusal, the replay, the start command, an
      empty repository, a branch deleted before the start, and Try again.
- [x] Delete `plans/follow-ups/agent-branch-choice-check.md`, because this
      milestone applies its option B.
- [x] Update `worker/lifecycle/README.md`, `worker/lifecycle/default-branch.md`,
      and `worker/lifecycle/workspace-object.md`.

Evidence: `.context/start-from-branch/m4-red.log`, `m4-retry-red.log`, and `m4-green.log`.
The publication race checks are in `branch-admission-red.log` and `branch-admission-green.log` in that folder.

## Milestone 5: The agent call

Depends on: 4

- [x] Add `startBranch` and `baseBranch` to `create_workspace` in
      `tools/workspace-mcp-tools.ts`, the CLI in `tools/cli-help.ts` and
      `tools/cli-options.ts`, and `src/shared/agent-workspaces.ts`. The help
      says what each field does and its default. Change "Omitted choices use
      the owner's defaults" so that it stays true.
- [x] Pass them through `worker/tools/create.ts` to the create of
      Milestone 4.
- [x] Test the call through `runToolProcess` and the MCP adapter, with each
      default, a refusal, and a replay.
- [x] Update `worker/tools/README.md`.

Evidence: `.context/start-from-branch/m5-red.log` and `m5-green-final.log`.
Final checks and repeated test runs are in `.context/start-from-branch/final-repeat-summary.log` and `m3-5-report.md`.

## Milestone 6: Continue builds on the merged base

Depends on: 2

- [x] Choose the base of Continue with decision 300, in
      `worker/lifecycle/continue-progress.ts` and
      `worker/lifecycle/continue-admission.ts`.
- [x] Split the default branch and the base in the Continue job, in
      `worker/lifecycle/continue-types.ts`,
      `worker/lifecycle/continue-data.ts`, and
      `worker/lifecycle/continue-publication.ts`. Read a job that was saved
      before the change.
- [x] Test a merge into a branch that still exists, a merge into a deleted
      branch, a merge into the default branch, and an old saved job.
- [x] Update `worker/lifecycle/continue.md`.

Evidence: `.context/start-from-branch/m6-red.log`, `m6-green-final.log`, and `m6-native-green.log`.

## Milestone 7: A gone base branch

Depends on: 2

- [x] Apply decision 304 in `worker/github/client.ts`, the bar, and a
      command that updates `gh-merge-base` in the cloud computer.
- [x] Keep the name of the base that moved until a pull request opens, so
      the bar and the top of the Checks tab of a phone show its line, as
      `app/new-workspace/start-branch/stacked/base-moved` shows. Take the
      words from `barCopy.ts` and the rule from the `baseMoved` fact of
      `barModel.ts`.
- [x] Test a base that GitHub deleted before the pull request opens.
- [x] Update `worker/github/README.md`.

Evidence: `.context/start-from-branch/m7-red.log`, `m7-command-red.log`, `m7-mutation-red.log`, `m6-7-targeted-final.log`, and `m6-7-report.md`.

## Milestone 8: Branch picker and target choice

Tags: ui

Depends on: 1, 3, 4

- [x] Build the branch control and the picker on the page and in the
      dialog, with search and the list states, as the mockups show.
- [x] Build the target choice of decision 301, with the first selection of
      decision 305: a segmented control on a computer, and radio cards on
      a phone. Keep the choice of the member when the member picks another
      branch.
- [x] Keep the branch and the target in the draft, clear them on a change of
      repository, and send them with the create.
- [x] Show the refusals of the branch check, and keep the message. A
      missing branch offers Start from and the default branch, and a token
      that cannot read the repository offers Try again. Take the words from
      `docs/mockups/src/components/new-workspace/branchCopy.ts`.
- [x] Show the line of a base that moved, from `GitHubBanner.baseMoved`,
      under the pull request bar on a computer and at the top of the Checks
      tab on a phone, as `app/new-workspace/start-branch/stacked/base-moved`
      shows. The banner reader of the app dropped the field before.
- [x] Test the picker states, the clear, the target choice, and the create
      request.
- [x] Compare each screen with its mockup on desktop and on a phone. Update
      `src/app/README.md`.

Evidence: `.context/start-from-branch/m8-mutations.log`,
`m8-repeat-summary.log`, `m8-test-cost.log`, and the screenshots in
`.context/start-from-branch/ui/`.

## Milestone 10: Mockups of the review fixes

Tags: mockup

Depends on: 8

Draw decision 306 on a phone.

- [x] Draw the top of the Checks tab on a phone with the branch and its
      base while the branch has no pull request, for a stacked workspace
      and for a workspace that targets the default branch, under
      `app/new-workspace/start-branch/stacked` and the pull request bar
      pages that show the phone Checks tab.
- [x] Update `docs/mockups/catalogue*.md` and `docs/mockups/design*.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/start-from-branch/mockups-296/`, with the check logs,
the list of changed views against a baseline build, and the screenshots.

## Milestone 11: Documentation of the review fixes

Depends on: 10

- [x] In `docs/protocol/github-tokens.md`, add the fetch of a moved base
      with the GitHub token of the workspace owner when no member started
      the move (decision 307). The image builds moved to
      `docs/protocol/github-tokens-image-builds.md`, so that the doc stays
      near 250 lines.
- [x] In `docs/protocol/base-branches.md`, state that a moved base fetches
      the new base before it changes the target (decision 307), and the one
      retry owner (decision 308).
- [x] In `docs/protocol/github-banner.md`, state decision 306 under
      "Layouts", with the design calls of the mockups of Milestone 10: on
      a phone the names wrap and show in full, the branch and its base
      stand above Create PR and under the line of a moved base, and they
      show in each state without a pull request. The Checks and Layouts
      sections moved to `docs/protocol/github-banner-layouts.md`, so that
      the doc stays under 300 lines.
- [x] Read the Terms page, the Privacy page with its data uses, and each
      public guide in full. Update each sentence that restates a changed
      fact, such as when Conductive uses a member's GitHub token. Bump
      `TERMS_VERSION` when the Terms change.
- [x] Check each relative link of each changed Markdown file.

## Milestone 12: Base move fetch and retry owner

Depends on: 11

- [x] Build the shared base-change operation of decision 307, with the
      owner token for a move that no member started, the isolated stage of
      Continue, and the missing-ref guard of commit `dcbb1a2cd`.
- [x] Give the operation one saved retry job with a capped growing delay,
      run it at each resume, and take the cloud command out of the GitHub
      read (decision 308). A failed database write of the move also leaves
      one retry.
- [x] Apply option D of review item 103: move the failed-database recovery
      case to the native fixture `worker/features/base-moved.test.ts`, with
      a first refresh that cannot find the deleted base again, and checks of
      D1 and of the cloud command.
- [x] Test a merge commit into the default branch that the copy in the
      cloud computer lacks, repeated cloud failures with one retry job, a
      failed database write, a resume, and an owner without access.
- [x] Update `worker/github/README.md` and `worker/lifecycle/README.md`.

## Milestone 13: The base on a phone

Tags: ui

Depends on: 10

- [x] Show the branch and its base at the top of the Checks tab on a phone
      while the branch has no pull request (decision 306), as the mockups
      of Milestone 10 show. They show also when the bar has no action, so
      the top of the Checks tab is no longer empty then. Take the styles
      from the shared `BarActions.module.css`.
- [x] Test it, and compare it with its mockup on a phone.

## Milestone 14: Mockups of the compact branch control

Tags: mockup

Depends on: 10

- [x] Draw decision 309 on the `app/new-workspace/start-branch` pages and
      their children, on the page and in the dialog, on a computer and on
      a phone: the control next to the repository picker, `main` first,
      the two-part dropdown, and `→ main` on the closed control.
- [x] Remove the target row and `TargetChoice` from the mockups, and the
      `compact` exploration pages and their parts, when no page uses them.
- [x] Keep the files that the app imports working, or list each change
      that Milestone 16 must follow.
- [x] Update `docs/mockups/design-new-workspace.md` and the catalogue.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/start-from-branch/compact-301/`, with the check logs,
the screenshots in `shots/`, and the measurements of the phone fix in
`cdp/`.

## Milestone 15: Documentation of the compact branch control

Depends on: 14

- [x] Update `docs/protocol/start-from-a-branch.md` and
      `docs/protocol/create-a-workspace-dialog.md` with decision 309.
- [x] Read each public guide in full, and update each sentence that
      describes the target choice. Read the legal pages for the same fact.
- [x] Check each relative link of each changed Markdown file.

## Milestone 16: The compact branch control in the app

Tags: ui

Depends on: 14

- [x] Build decision 309 in New workspace, on the page and in the dialog,
      as the mockups of Milestone 14 show, and remove the target row.
- [x] Keep the draft, the clear on a change of repository, the create
      request, and the refusals working.
- [x] Test the closed control, the two-part dropdown, the kept target
      choice, and the phone sheet. Compare each screen with its mockup.
- [x] On a 360 px phone, check that a long name with `→ main` ends in an
      ellipsis, and that `→ main` and the chevron stay in view. The
      `min-width: 0` of `.start` in `NewWorkspaceScreen.module.css` keeps
      the start inside the screen.
- [x] Remove `TargetChoice.module.css`, the `target` rule of
      `NewWorkspaceDialog.module.css`, and `targetCopy.option` from the
      mockups, once the app no longer uses them.
- [x] Update `src/app/start-branch.md`, also its lines on the old target
      row, and `src/app/key-code-layers.md`, which names `TargetChoice.tsx`.
- [x] Remove the bullet on `TargetChoice.module.css` and the `target` rule
      from `docs/mockups/design-new-workspace.md`, because this milestone
      removed both. The brief of the UI work allowed no edit of a doc under
      `docs/`.

Evidence: `.context/start-from-branch/ui-301/`, with the red, green, and
mutation logs, the batch logs of `src/shell` and `src/app`, the ten repeat
runs, the room and 360 px measures, the screenshots, and the comparisons
with the mockups in `compare/`.

## Milestone 17: Split the create doc

Depends on: 15

- [x] Move the section "The preference" of
      `docs/protocol/create-a-workspace.md` to a new linked page, and leave
      a short section with the same heading and a link, so that every link
      into it keeps working. Reason: the doc has 281 lines, over the target
      of about 250 of the `documentation` skill.
- [x] Check each relative link into and out of both docs.

## Milestone 18: Renumber the decisions of this plan

Depends on: none

`main` used the numbers 288 to 297 for other changes. Decisions 310 to 312
already have free numbers.

- [x] Renumber this plan's decisions in every file of the branch: 288 to
      298 become 298 to 308 in order, and 301 becomes 309. Change only the
      references that this branch added. Keep each reference of `main` to
      its own decisions 288 to 297.
- [x] Check with `git grep` that no reference of this branch keeps an old
      number, and that each reference of `main` is unchanged.

Evidence: `.context/start-from-branch/renumber/`, with the scripts, the
list of each changed reference, and the check results.

## Milestone 19: Default branch renames and repository changes

Depends on: 18

- [x] In `docs/protocol/base-branches.md` and the doc of the repository
      change, state decisions 310 and 312. Read the legal pages and the
      public guides for the same facts.
- [x] Build decision 310: the webhook save of a new default branch saves
      one base move for each live workspace of the repository whose base is
      null, through the operation of decisions 307 and 308.
  - [x] Keep the newest default move when two repository deliveries
        prepare jobs before their guarded saves finish. Add a failing
        regression for the stale job that loses the newer move.
- [x] Build decision 312 in `worker/lifecycle/repository-change-progress.ts`
      and `worker/lifecycle/repository-change-data.ts`, with the check after
      the write that accepts null.
- [x] Delete `plans/follow-ups/saved-default-branch-after-github-rename.md`
      (decision 311), and remove each link to it.
- [ ] Test a rename with a running and with a stopped cloud computer, a
      workspace with a stored base that the rename does not move, and a
      repository change to the default branch.
  - [x] Verify the running rename, one saved move, explicit bases, and an
        inactive repository.
  - [ ] Verify the stopped-computer rename and its required repeat runs.
  - [x] Verify that a repository change to the default stores null.
- [x] Update the READMEs of `worker/github/` and `worker/lifecycle/`.

Evidence: `.context/start-from-branch/m19-progress.md` and `m19-report.md` in that folder.
The stopped-computer test remains unverified after three timeouts.
The overlap repair and its deterministic regressions are recorded in
`.context/start-from-branch/m19-race.md`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test a start that stacks on a branch, and a start that branches
      off and targets the default branch, on the development page.
- [x] Set the comparison rows as Milestone 2 says. Pull request #380 on
      `main` removed the comparison page and its rows, so no row remains.
- [x] Renumber decisions 288 to 295 when another change took those numbers.
      Milestone 18 does it.
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

The justifications of the merge of `origin/main` at `5ca03a0c2` are in
`.context/start-from-branch/merge-2/justifications.md`, and those of the merge
at `bad6521f1` in `.context/start-from-branch/merge-3/justifications.md`.

## Post-merge follow-up (non-blocking)

- [ ] On the deployment, start a workspace that stacks on a branch of a test
      repository. Check the pull request bar, Changes, and a Continue after
      the merge.
