# Pull request bar actions

Status: Active. On branch `calummoore/github-status-bar-actions`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The pull request bar at the top of the right column shows the GitHub state
of the workspace branch. Today each action in the bar links to GitHub, and
after a merge the bar also offers Archive. Decision 18 chose these links on
5 November 2026. It rejected a merge in the app and buttons that send fixed
prompts to the agent. On 9 November 2026 the user asked for the actions of
Conductor's git panel: merge, resolve conflicts, commit, create PR, and
continue or archive after a merge.

This change gives the bar Conductor's split of the work, as decision 220
chose. The agent gets a fixed prompt for each step that changes code:
Create PR, Commit and push, Fix checks, Resolve conflicts, and Address
review. The app merges as the member who clicks, and only a member whose
GitHub rights allow it sees Merge (decision 221). After a merge, Continue
moves the workspace to a new branch from the updated base, and keeps the
sandbox and the sessions (decision 223). Every member may continue
(decision 224). Archive stays as it is. The user answered decisions 224
to 228 on 9 November 2026. The change does not cover auto-merge,
merge queues, custom prompts, keyboard shortcuts, or command palette
entries.

Contract owners:

- [GitHub banner](../docs/protocol/github-banner.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [GitHub tokens](../docs/protocol/github-tokens.md).
- The [architecture doc](../docs/architecture.md).
- The [GitHub banner UI README](../src/github/README.md).
- The [GitHub banner backend README](../worker/github/README.md).
- The [agent runner README](../runner/README.md).

Two options checks ran on 9 November 2026: the first over decisions 220
to 225, and the second over decisions 226 to 228. Their reports are in
`.context/pull-request-bar-actions/`.

## Decisions

Decision numbers 189 to 212 are in use on other branches, so this plan
starts at 220.

### 220. Choose who does each step of the bar

Added on 9 November 2026 from the brainstorm of this change. The options
check rewrote the root question, so that the step after the merge stays
with decision 223. It also corrected the login in option A.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/github-banner.md`, "Banner states", and
  `src/github/PullRequestBar.tsx`.
- **Background:** Decision 18 chose links only. The protocol doc says that
  the app merges nothing and writes nothing to GitHub for the bar. The
  Worker already stores the GitHub token of each member, so it can merge
  as the member who clicks. Conductor's agent writes the pull request,
  commits, fixes errors, and resolves conflicts. Conductor's app merges,
  continues, and archives.
- **Problem:** The bar offers only links. Each step after a push needs a
  visit to GitHub, or a request that the member types to the agent.
- **Impact if no action:** Members leave the app to merge, and they type
  every fix request.
- **Root question:** How does a member take a workspace from changed
  files to a merged pull request without a visit to GitHub?
- **Options:**
  - **A.** The agent does every step. Each button sends a fixed prompt,
    also Merge, which the agent runs with the GitHub CLI. A merge then
    waits for a running sandbox and a turn, and it uses the model quota
    of the session's login. Effort: Large.
  - **B.** Conductor's split. The agent gets fixed prompts for Create PR,
    Commit and push, Fix checks, Resolve conflicts, and Address review.
    The app merges as the member who clicks, and offers Continue and
    Archive. The Worker gets its first GitHub write. Effort: Large.
  - **C.** The app does each step itself. The Worker merges and opens the
    pull request, and the runner commits and pushes. Conflicts and failed
    checks keep their GitHub link. A push outside a turn needs a new way
    to name the sender. Effort: Large.
- **Left out:**
  - Fixed-prompt buttons with the merge left on GitHub, decision 18
    option D: it fails the goal, because the user asked for Merge in the
    app.
  - Change nothing: it fails the goal.
  - Automatic steps, such as auto-merge and archive on merge: they fail
    the goal as the main approach, because the user asked for buttons.
    They can come later as settings.
  - Merges by the GitHub App: B is better on every point. With B, GitHub
    shows the member as the merger and checks the member's own rights.
- **Assumptions:** All options keep the actions in the bar and in the
  phone row, from the task message. All options keep the ten states of
  decisions 18 and 64. Every GitHub change runs as a member, after
  decision 50. The approach that drops this last assumption is the App
  merge above. The steps that change code run in the sandbox, so they
  wait for a running sandbox.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Decision 18 rejected options C and D on
  5 November 2026. Decision 64 rejected option C, "Update branch", on
  6 November 2026. Decision 16 added Archive to the bar.
- **Related:** Decisions 221, 222, and 223 waited for this answer.
- **Recommendation:** B. It follows Conductor: the agent changes the code,
  and the app merges at once under GitHub's own checks.
- **Action:** asked the user, because the recommended option replaces
  decision 18, a user decision in force.
- **Chosen:** B, by the user on 9 November 2026. It replaces the rules of
  decision 18 that kept every action a link and rejected a merge in the
  app and fixed prompts. The ten states of decisions 18 and 64 stay.

### 221. Choose who may merge from the bar

Added on 9 November 2026 from the brainstorm of this change. The options
check rewrote the root question, added option D, and moved the
recommendation from A to C.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/github-banner.md`, "Banner states", and
  `src/github/archive.ts`.
- **Background:** Every member of an org can send messages in each of its
  workspaces. Only the workspace owner and the admins may archive
  (decision 42). A merge from the app uses the GitHub token of the member
  who clicks. GitHub then checks that member's rights and the rules of
  the branch.
- **Problem:** No requirement says who may merge from the app.
- **Impact if no action:** The plan must guess the rule for the app's
  first GitHub write.
- **Root question:** Who may merge a workspace's pull request from the
  app, and does the app or GitHub decide?
- **Options:**
  - **A.** Every member sees Merge. GitHub checks the member's own rights,
    and the bar shows GitHub's refusal. A member without the right sees a
    button that fails. Effort: Small.
  - **B.** Only the workspace owner and the admins see Merge, as with
    Archive. A reviewer must merge on GitHub. Effort: Small.
  - **C.** A member sees Merge only when GitHub says that the member may
    merge. The Worker reads this right with each member's own token.
    Effort: Medium.
  - **D.** Added by the options check. Only the workspace owner and the
    admins see Merge, and only when GitHub gives them the right, as in C.
    Merge, Archive, and Continue under decision 224 option A then share
    one app rule. A reviewer with the right must merge on GitHub. Effort:
    Medium.
- **Left out:** A merge with the app's own token: GitHub would then show
  the app as the merger and skip the member's rights.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Decision 42 chose the owner and the admins for
  Archive.
- **Related:** Decision 220, option B, puts Merge in the app.
- **Recommendation:** C. The first recommendation was A. GitHub keeps the
  final say in both, and C shows no button that is sure to fail.
- **Action:** asked the user, because the option sets a rule for a new
  write action, and no requirement covers it.
- **Chosen:** C, by the user on 9 November 2026, before the options check
  added D.

### 222. Choose how the agent reaches the GitHub API

Added on 9 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `image/github-cli.sh` and `docs/protocol/github-tokens.md`.
- **Background:** Create PR needs the agent to open a pull request. Fix
  checks and Address review need the check results and the review
  comments. At the time of the brainstorm, this branch did not yet have
  the authenticated GitHub CLI of pull request #110.
- **Problem:** The agent could not reach the GitHub API.
- **Impact if no action:** Create PR by the agent fails.
- **Root question:** How does the agent open a pull request and read
  GitHub's checks and comments?
- **Options:**
  - **A.** Sign in the GitHub CLI through the git credential route, with
    the sender's fresh token for each `gh` call. Effort: Medium.
  - **B.** Add one agent tool call, "create a pull request", through the
    Worker. Effort: Medium.
  - **C.** Keep the GitHub API away from the agent. The Worker opens the
    pull request, and the prompts carry the GitHub data. Effort: Medium.
- **Left out:** A personal GitHub token for each member: the GitHub App
  gives the app all of its GitHub access.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Decision 50 and decision 121.
- **Related:** Decision 220, option B, sends the agent prompts that use
  `gh`.
- **Recommendation:** A.
- **Action:** asked the user, because the option gives the sandbox GitHub
  API access, a security boundary.
- **Chosen:** A, by the user's answer on 9 November 2026: the actions only
  send the prompt. Pull request #110, merged as commit `7e23773`, built
  option A in another workspace. As its own design call, it also gives
  `gh` the workspace owner's token outside a turn. Only a workspace from
  an org image built after #110 has it. This change adds no GitHub access
  to the sandbox.

### 223. Choose how work goes on after a merge

Added on 9 November 2026 from the brainstorm of this change. The options
check rewrote the root question, added option D, gave a second reason
for the left-out approach, and named two more costs of option A.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/architecture.md`, "Terms", and
  `docs/protocol/create-a-workspace.md`, "The branch and the name".
- **Background:** A workspace has one repository, one branch, one
  sandbox, and its sessions. The branch is set when the workspace is
  created, and GitHub events find the workspace through it. After a
  merge, the bar offers only Archive. Conductor also offers Continue,
  which starts a new branch from the updated base in the same workspace
  and keeps the chats.
- **Problem:** No requirement lets a workspace go on after its pull
  request merges.
- **Impact if no action:** After each merge, the member archives and
  waits for a new sandbox. The new agent starts without the earlier
  context.
- **Root question:** How does a member start the next task after a merge,
  and what carries over from the merged task?
- **Options:**
  - **A.** Continue on a new branch in the same workspace, as Conductor
    does. The sessions, the installed software, and the running servers
    stay. A workspace then has one branch at a time, not one branch for
    its whole life. The workspace keeps the software of its first org
    image for each later task. Open pull request #112 keeps the old
    branch in the instructions of each session. Effort: Large.
  - **B.** Continue in a new workspace. One click creates it from the
    updated base, with a first message that links to the merged one. The
    new sandbox starts cold, without the agent's context. Effort: Medium.
  - **C.** Keep Archive only. Effort: Small.
  - **D.** Added by the options check. Continue in a new workspace that
    forks the sandbox of the merged one. It keeps the files, the
    installed software, and the caches. Its sessions start new, with a
    first message that links to the merged workspace. Each workspace
    keeps one branch. It needs a fork flow that no code uses yet, and one
    more start on the app's Boat account. Effort: Large.
- **Left out:** More work on the merged branch. After a squash merge, a
  new pull request from that branch shows the old commits again. Also,
  the Worker finds the pull request by the branch name, first an open
  one, then a merged one. So the bar would show the merged pull request
  again, and Create PR would never show.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Decision 16 added Archive after the merge.
- **Related:** Decision 220 puts Continue in the bar. Decisions 224, 226,
  and 227 wait for this answer.
- **Recommendation:** A. It is the only option that keeps both the agent's
  context and the warm sandbox, which are the point of Continue.
- **Action:** asked the user, because the option changes the rule that a
  workspace keeps one branch.
- **Chosen:** A, by the user on 9 November 2026, before the options check
  added D.

### 224. Choose who may continue another person's workspace

Added on 9 November 2026 while this plan was written.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/orgs-and-members.md`, "Members and roles",
  and `src/github/archive.ts`.
- **Background:** Continue moves the workspace to a new branch for every
  session and every member. Archive, the other action after a merge,
  shows only to the workspace owner and the admins (decision 42). Every
  member can send messages in each workspace.
- **Problem:** No requirement says who may continue a workspace that
  another person owns.
- **Impact if no action:** Milestone 7 must guess the rule.
- **Root question:** Who may move another person's workspace on to its
  next task?
- **Options:**
  - **A.** Only the workspace owner and the admins, as with Archive. Other
    members ask the owner, or start a new workspace. Effort: Small.
  - **B.** Every member of the org. A member can move the owner's
    sessions to a new branch. Effort: Small.
  - **C.** Every member when the sandbox has no local work. With local
    work, only the owner and the admins, as option C of decision 42 drew
    it. Effort: Small.
- **Left out:** Only the admins: a member then cannot go on with their
  own work.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Decision 42 chose the owner and the admins for
  Archive.
- **Related:** Decision 223 chose Continue.
- **Recommendation:** A. Continue changes the owner's branch and sessions,
  as Archive changes the owner's sandbox, so one rule fits both actions
  after a merge.
- **Action:** asked the user, because the recommended option adds a
  permission rule that no requirement covers.
- **Chosen:** B, by the user on 9 November 2026. Every member of the org
  may continue each workspace of the org.

### 225. Choose how the agent learns why a check failed

Added on 9 November 2026 while this plan was written. The options check
widened the root question to checks from other services.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/github-tokens.md`, "Git and the GitHub
  CLI".
- **Terms:**
  - **Actions read:** the GitHub App permission that reads GitHub Actions
    runs, their logs, and their artifacts.
- **Background:** Fix checks asks the agent to find why the checks
  failed. GitHub's public record of the app's GitHub App, read on
  9 November 2026, lists checks read and statuses read, but no Actions
  permission. So `gh pr checks` and the check summaries work, and
  `gh run view --log-failed` fails. A check from another service keeps
  its log outside GitHub.
- **Problem:** The agent cannot read the logs of failed GitHub Actions
  jobs.
- **Impact if no action:** Fix checks works only from check summaries,
  annotations, and local runs. A failure that shows only in a log takes
  the agent longer, or the member pastes the log.
- **Root question:** How does the agent learn why a check failed, also a
  check from a service other than GitHub Actions?
- **Options:**
  - **A.** Keep the permissions. The prompt tells the agent to read the
    check summaries and annotations with `gh`, and to run the failed
    checks locally. Effort: Small.
  - **B.** Add Actions read to the GitHub App. The agent then reads the
    failed logs with `gh run view --log-failed`. The operator changes the
    App, and each install owner must approve the new permission. Effort:
    Small.
  - **C.** As B, and the Worker also puts the end of each failed log into
    the Fix checks prompt. Effort: Medium.
- **Left out:** A personal token for the logs, and a second GitHub App
  for the logs: one GitHub App gives the app all of its GitHub access.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Pull request #110 added Issues write to the App
  on 9 November 2026, after a user decision.
- **Related:** Decision 220 chose Fix checks. Decision 222 says that the
  actions only send the prompt, which goes against option C.
- **Recommendation:** B. Logs are the main evidence of a failed Actions
  job. Actions read also reaches the runs and the artifacts of each
  repository that a member's token reaches, also outside the org. That
  grant is still small beside the Contents write and the Workflows write
  that each token already has. The prompt keeps the text of A for checks
  of other services and for installs that have not approved.
- **Action:** asked the user, because the recommended option changes the
  GitHub App's permissions, which needs the operator and each install
  owner.
- **Chosen:** B, in force since 9 November 2026. The user answered that
  the App already had this access. GitHub's public record of the App,
  updated at 18:57 UTC that day, lists Actions write, which includes the
  read of option B. Write also lets each member token start, re-run, and
  cancel workflow runs, turn workflows on and off, and delete runs, logs,
  artifacts, and caches. Each install owner must still approve the
  permission.

### 226. Choose whose GitHub access fetches the base for Continue

Added on 9 November 2026 from the options check. The second options
check corrected the background, added option C, and gave option A a new
reason.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/github-tokens.md`, "Git and the GitHub
  CLI", and `credentialSender` in
  `worker/lifecycle/workspace-controller.ts`.
- **Background:** Continue fetches the updated default branch in the
  sandbox, then creates the new branch from it. Continue runs outside a
  turn. The git credential helper gives Git the token of the sender of a
  current turn. During the create of a workspace, it gives the token of
  the first sender to the fetch of the trusted start job. Its token mode,
  which pull request #110 added for `gh`, gives the workspace owner's
  token outside a turn, and any process in the sandbox can pass that
  token to Git.
- **Problem:** No rule says whose access the fetch of an app action uses
  outside a turn.
- **Impact if no action:** Continue cannot fetch the base of a private
  repository.
- **Root question:** Whose GitHub access fetches the updated base when a
  member presses Continue?
- **Options:**
  - **A.** The member who pressed Continue. The workspace object runs
    Continue as a trusted job, as it runs the create. The credential
    route accepts the ID of the job only while its fetch runs. GitHub then
    checks the read access of that member. It works also in a workspace
    from an image older than #110. Effort: Medium.
  - **B.** The workspace owner. The fetch uses the owner's token through
    the token mode that `gh` uses outside a turn. It works only in a
    workspace from an image built after #110. Effort: Small.
  - **C.** Added by the second options check. The app's own read access.
    The credential route answers the ID of the Continue job with an
    installation token that reads only this one repository, as for an
    image build. The Worker first checks the member's read access with
    the member's own token, and revokes the installation token when the
    fetch ends. It changes the rule that a workspace sandbox never gets
    an installation token, and it needs the revoke and recovery steps of
    image builds. Effort: Large.
- **Left out:**
  - A branch change that the agent makes in a turn: decision 220 gives
    Continue to the app.
  - No fetch: it fails the goal, because the sandbox does not have the
    merge, and the new branch would start from an old base.
- **Assumptions:** All options fetch in the repository folder of the
  sandbox, with its Git settings and hooks, which agent code can change.
  An isolated fetch into a staging folder, as image builds do, lowers
  this risk for A and C.
- **Wider fix:** None. The wider fix for the class, a Git proxy in the
  Worker, is option C of the follow-up item
  `plans/follow-ups/github-token-readable-in-sandbox.md`.
- **Previous examples:** The create job gives its fetch the token of the
  first sender. Pull request #110 gave `gh` the owner's token outside a
  turn.
- **Related:** Decision 223 chose Continue. Decision 224 decides who
  presses it. The follow-up item
  `plans/follow-ups/github-token-readable-in-sandbox.md` holds the same
  token risk for every Git call.
- **Recommendation:** A. GitHub then checks the read access of the member
  who acts, as for the create, and A also works in older workspaces. The
  first reason, that no Git call gets the owner's token, was false. C
  protects the tokens best, because its token reads one repository and
  ends with the fetch.
- **Action:** asked the user, because each option adds a token rule at a
  security boundary, and no requirement covers it.
- **Chosen:** A, by the user on 9 November 2026. With decision 224 B,
  the member who presses Continue can be another member than the owner.
  That member's token then reaches the owner's sandbox for the fetch, as
  it does for a message of that member.

### 227. Choose how each session works on the new branch

Added on 9 November 2026 from the options check. The second options
check rewrote the root question, added option D, and moved the
recommendation from A to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/chat-and-events.md`, and
  `docs/protocol/agent-instructions.md` on the branch of open pull
  request #112.
- **Background:**
  - Continue keeps the sessions of the workspace, and their agents keep
    their context. That context names the old branch and the merged pull
    request.
  - Open pull request #112 gives each session fixed instructions with the
    workspace branch, for the whole life of the session. Its guidance
    tells the agent to keep the branch name unless a member asks for a
    rename. It rejected a block in the first message, because a summary
    of the conversation can drop it.
  - In #112 the runner reads the workspace branch once, when it starts,
    and the Worker gives it only at a sandbox start. So a session that
    starts after Continue also gets the old branch, until the next start.
  - #112 also says that the fixed text holds no fact that changes during
    the work. Continue makes the branch such a fact.
- **Problem:** After Continue, each session can still name the old branch,
  also a session that starts or reopens later.
- **Impact if no action:** An agent can push to the old branch after
  Continue. The bar then does not follow the work.
- **Root question:** How does every session of the workspace, also one
  that starts or reopens later, work on the new branch after Continue?
- **Options:**
  - **A.** One line at the start of the next input of each session, as a
    request of the member who pressed Continue: work on the new branch
    from now on. The chat shows its own note, not this line. A later
    summary can drop the line, but Git then shows the new branch. Effort:
    Small.
  - **B.** Continue rebuilds the instructions of each open session with
    the new branch. This rewrites the prompt cache of each session, and
    it goes against the rule of #112 that a session keeps one text. Both
    agents read the text only when their process starts, so B also
    restarts the agent of each session. Effort: Medium.
  - **C.** Only the note in the chat. The agent learns the branch from
    Git when it works next. The instructions of #112 keep the old name.
    Effort: Small.
  - **D.** Added by the second options check. Each message to the agent
    gets one more line, after the line that names its sender, when the
    fixed text of its session names an older branch. That line names the
    current workspace branch, which the Worker sends with each message. A
    new session gets the current branch in its fixed text. The shared
    message contract, the Worker, and the runner change. #112 rejected
    text that the Worker sends with each turn, because only later
    features needed it. Continue is such a feature. Effort: Medium.
- **Left out:** New sessions at Continue: they go against decision 223,
  which keeps the sessions and their context.
- **Wider fix:** D, when its line also names a changed target branch.
  #112 accepts an old target branch name as a risk, and the same line
  removes that risk.
- **Previous examples:** None found. For a new default branch, #112
  accepts that an older session names the old target branch.
- **Related:** Decision 223 chose Continue. Open pull request #112 owns
  the instructions.
- **Recommendation:** D. The first recommendation was A. D reaches every
  session in each message, also after a summary and in a session that
  starts later, and it keeps the fixed text and its cache.
- **Action:** asked the user, because the options conflict with the rules of
  open pull request #112, and no rule settles which side wins.
- **Chosen:** D, by the user on 9 November 2026. The plan also applies
  the wider fix: the same line names a changed target branch. Pull
  request #112 merged later the same day, so its rules are now in
  `docs/protocol/agent-instructions.md` on `main`.

### 228. Choose how the bar guards a merge

Added on 9 November 2026 from the options check.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/github-banner.md`, "Banner states", and
  `src/github/PullRequestBar.tsx`.
- **Background:** The app cannot undo a merge, and a merge into the main
  branch can start a deploy, as it does in this repository. The merge
  request carries the head commit that the bar shows, so GitHub refuses
  commits that the member did not see. Local work is changed files that
  are not committed, or commits that no remote branch holds, in the
  sandbox. The runner counts each untracked file as a changed file.
- **Problem:** The first draft of this plan merged on one click, and hid
  Merge while the sandbox had local work. A stray file then hides Merge
  from every member.
- **Impact if no action:** Milestones 1 and 5 must guess how Merge guards
  against a merge by mistake, and against work that stays in the sandbox.
- **Root question:** How does the bar keep a member from merging by
  mistake, or without the work that is still in the sandbox?
- **Options:**
  - **A.** Merge on one click. Local work hides Merge and the fix
    actions, and Commit and push takes their place. Effort: Small.
  - **B.** Merge on one click. When the sandbox has local work, Commit and
    push shows beside the main action of the state, so Merge stays.
    Effort: Small.
  - **C.** Merge asks for a confirmation that names the method, the pull
    request, and the base. The confirmation also lists the local work.
    Commit and push shows beside the main action, as in B. Effort: Small.
  - **D.** Merge on one click, and the bar waits a few seconds with Undo
    before it sends the merge. Commit and push shows as in B. Effort:
    Medium.
  - **E.** Added by the second options check. Merge on one click while the
    sandbox has no local work and no turn runs. Otherwise Merge asks
    first, and the question lists the local work and the turns that run.
    Commit and push shows as in B. A click by mistake on a clean sandbox
    merges at once. Effort: Small.
- **Left out:**
  - A Merge that first sends Commit and push, then merges: the merge would
    hold commits that the member did not see, and it must wait for new
    checks. That is auto-merge, which this change leaves out.
  - An undo through a revert pull request: a revert is a new pull request
    and a new deploy, not an undo.
- **Wider fix:** None. This is a design choice, not a defect.
- **Previous examples:** Archive asks every time, also when everything is
  pushed, and lists the local work (decision 16,
  `src/shell/workspace/ArchiveDialog.tsx`).
- **Related:** Decision 221 chose who sees Merge.
- **Recommendation:** C. One more click guards the app's first GitHub
  write, as Archive guards its own, and the member sees the work that the
  merge leaves out. Its question also names each turn that runs.
- **Action:** asked the user, because the options trade speed against
  safety, and no option is clearly best.
- **Chosen:** A, by the user on 9 November 2026. Merge runs on one click.
  While the sandbox has local work, Commit and push takes the place of
  Merge and of the fix actions. A stray untracked file also counts as
  local work.

## Design

Each line marked "Design call" is a call of the agent that wrote this
plan, on 9 November 2026, under the decision test of the
`decisions-and-findings` skill.

### Actions by state

The bar shows one main action. "Open on GitHub" stays in each state that
has a pull request. The labels are drafts for the mockups.

| Bar state | Main action | Done by |
| --- | --- | --- |
| No pull request, with commits on GitHub or local work | Create PR | Agent |
| Checks failed | Fix checks | Agent |
| Merge conflict | Resolve conflicts | Agent |
| Changes requested | Address review | Agent |
| Open pull request with local work, in any state | Commit and push | Agent |
| Ready to merge, for a member who may merge | Merge | App |
| Merged | Continue and Archive | App |
| No commits and no local work | None: "No commits yet" | None |
| Checks running, draft, blocked, and closed | None | None |

- Local work comes first, as decision 228 chose. While an open pull
  request has local work, Commit and push takes the place of Merge and of
  the fix actions.
- Local work is changed files that are not committed, or commits that no
  remote branch holds, in the sandbox. Today the runner marks only the
  changed files. Milestone 3 adds the count of commits.
- Design call: the state without a pull request keeps the link that
  creates the pull request on GitHub, beside Create PR. Reason: no current
  link goes away.
- Design call: checks running, draft, blocked, and closed get no new
  action, so decision 64 stays. Reason: the user's list names no action
  for these states.
- Design call: an archived workspace and a suspended org show no actions,
  only links. Reason: a suspended org allows no change, and Archive
  follows the same rule today.

### Agent actions

- Design call: an agent action sends its fixed prompt at once, as a
  message of the member who clicks. It goes to the session that the
  member saw last in the chat column, with the model and the effort of
  that session. Reason: Conductor does this, and the chat keeps a record
  of each request.
- Design call: the action follows every send rule of the composer. The
  turn runs on the login that the session rules give it, under decisions
  105, 115, and 116. A send during a turn joins that turn. A blocked send
  shows the notice of the composer. The draft of the session stays as it
  is. Reason: an action is a message.
- Design call: a member sees the agent actions only when GitHub gives the
  member write access or more, read as for Merge. When the Worker cannot
  read the right, the bar still shows them. Reason: each action ends in a
  push as that member, and a typed message can still ask for the same
  work.
- Design call: the bar offers the agent actions also in a workspace from
  an org image older than pull request #110, whose `gh` can be missing.
  Each prompt says what to do then: push the branch and say that `gh`
  failed. The link that creates the pull request on GitHub stays.
  Reason: the action still helps, and such workspaces age out.
- Design call: the prompts are fixed text in the app. Custom prompts for
  each org can come later. Reason: Conductor added custom prompts after
  its buttons.
- Design call: the prompts ask for no replies on GitHub. Reason: a reply
  posts as the sender, and the member did not ask for one.
- Draft prompts, to settle in the mockups:
  - Create PR: "Commit any changes that are not committed, push this
    branch, and open a pull request into `<base>` with `gh pr create`.
    Write a short title and a description of what changed and why."
  - Commit and push: "Commit the changes that are not committed, with a
    clear message, and push this branch."
  - Fix checks: "These checks failed on pull request #<number>:
    <names>. Find out why with `gh pr checks <number>`. Read the logs of
    failed GitHub Actions jobs with `gh run view --log-failed`. For a
    check from another service, read its details, or run it locally.
    Fix the cause, then commit and push."
  - Resolve conflicts: "Pull request #<number> has conflicts with
    `<base>`. Merge `origin/<base>` into this branch, resolve each
    conflict, run the tests, then commit and push."
  - Address review: "<Reviewers> requested changes on pull request
    #<number>. Read the open review comments with `gh`, make the changes,
    then commit and push."

### Merge

- Design call: the Worker reads, for each member, whether GitHub lets the
  member merge, and which merge method GitHub gives the member. It reads
  with the member's own GitHub token. The answer goes only to that
  member. Reason: decision 221 chose GitHub's own answer.
- Design call: a member may merge when GitHub gives the member write
  access or more to the repository. GitHub still checks the branch rules
  at the merge. Reason: GitHub reports no single field for the right to
  merge.
- Design call: the method is the member's default merge method on
  GitHub, when the repository allows it. Otherwise it is a method that
  the repository allows. The button names the method, such as "Squash and
  merge". No method menu. Reason: Conductor names the repository's
  method, and a menu can come later.
- Design call: the Worker starts the merge with GitHub's asynchronous
  merge API, with the head commit that the bar shows, the method, and a
  direct merge. The bar asks the Worker for the result until GitHub
  reports it, and shows meanwhile that the merge runs. Reason: since
  1 October 2026 GitHub recommends this API over the GraphQL mutation
  and the older endpoint, and the branch rules run only at the merge.
- Design call: the bar names a moved head and a missing right in the
  app's own words. For every other refusal it says that GitHub refused
  the merge, with Open on GitHub. Reason: no text from GitHub reaches the
  browser, as the Worker's GitHub errors do today.
- Design call: the Worker hides Merge when it cannot read the member's
  right. Reason: a button that is sure to fail helps nobody.
- Design call: merge queues, stacked pull requests, and a bypass of the
  branch rules are out of scope. A direct merge into a branch that needs
  a merge queue gets GitHub's refusal. Reason: the user's list names none
  of them.
- Merge runs on one click, with no confirmation, as decision 228 chose.

### Continue

- Design call: Continue first checks the sandbox for local work, as
  Archive does. When the check finds work, a question lists it, and the
  member can continue anyway or cancel. Changed files move to the new
  branch. Commits that no remote branch holds stay on the old branch in
  the sandbox. Reason: the member sees the work before it leaves the
  current branch.
- Design call: the check for local work, for Archive and for Continue,
  counts the unpushed commits of every local branch, not only of the
  current one. Reason: after Continue, the old branch can hold unpushed
  commits, and Archive must not delete them without its question.
- Design call: Continue starts a stopped sandbox first. Reason: the
  branch change runs in the sandbox.
- Design call: Continue waits while a turn runs in any session of the
  workspace. The bar shows Continue as not available, and says that it
  waits for the agent. Reason: a branch change under a running agent can
  mix its edits into the new branch.
- Design call: the new branch follows the create rule: the current GitHub
  login of the workspace owner, a city name, and four random characters.
  Reason: decision 53 keeps the branches of each person together.
- Design call: when Git cannot move the changed files to the new branch,
  Continue stops, keeps the old branch, and names the reason. Reason: a
  forced move can lose work.
- Design call: the workspace keeps its name. Reason: the name can be one
  that a member gave, and an automatic name never replaces such a name.
- Design call: each session shows one note where Continue happened, with
  the member, the new branch, and the base. Reason: members see why the
  branch changed.
- Design call: after Continue, the bar starts again at the state without
  a pull request, and GitHub events follow the new branch. The old branch
  stays on GitHub. Reason: the merged pull request belongs to the old
  branch.
- A workspace keeps the software of its first org image for each later
  task. So the `gh` of #110, and the runner changes of Milestones 3 and
  7, reach only workspaces from a newer image.
- Every member of the org may continue, as decision 224 chose.
- The fetch of the base runs in a trusted Continue job, with the token of
  the member who pressed Continue, as decision 226 chose. The credential
  route accepts the ID of the job only while its fetch runs.
- Design call: the fetch runs in a separate staging repository with a
  clean Git config. The repository folder then fetches from that copy,
  with no token. Reason: agent code can change the Git settings and hooks
  of the repository folder, and the fetch carries a member's token. Image
  builds keep their tokens away from such settings in the same way.
- The Worker sends the current workspace branch with each message, as
  decision 227 chose. A session that started on an older branch gets one
  line in each message, after the line that names its sender. The line
  names the current workspace branch and the current target branch. A new
  session gets the current branches in its fixed text.
- Design call: the Worker records the branches of each session when the
  session starts, and adds the branch line while they differ from the
  current branches. Reason: the fixed text of a session, from pull
  request #112, keeps the branches of its start.

### Layouts

- Design call: on a phone, the actions show at the top of the Checks tab.
  The row keeps its one link to the Checks tab. Reason: a button cannot
  sit inside the link of the row, and two states have two actions.

### Out of scope

- Auto-merge, merge queues, stacked pull requests, approvals, "Update
  branch", and "Ready for review".
- Custom prompts, keyboard shortcuts, and command palette entries. Branch
  `calummoore/keyboard-shortcuts-settings` works on shortcuts.
- Archive on merge.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the actions of the bar for each state, on desktop and on a phone,
with Merge, Continue, and the chat parts that the actions add. The
current mockups say that the app merges nothing. Change that text.

- [ ] Draw the main action of each state in the mockup
      `PullRequestBar`, as "Actions by state" lists it. Keep "Open on
      GitHub" and the link that creates the pull request on GitHub.
- [ ] Draw Merge with its method, the merge that runs, a moved head, a
      missing right, and another refusal. Draw Ready to merge for a member
      who may not merge.
- [ ] Draw Commit and push in the place of Merge and of the fix actions
      while local work exists, as decision 228 chose.
- [ ] Draw Continue beside Archive, its question with local work, the
      branch change that runs, a failed Continue, Continue while a turn
      runs, and the bar after Continue, for every member, as decision 224
      chose.
- [ ] Draw the message that an agent action sends, in the chat, and the
      note of Continue in a session.
- [ ] Draw the actions at the top of the Checks tab on a phone.
- [ ] Settle the labels and the prompt texts with the copy rules of the
      `product-ui` skill. Record them in this plan.
- [ ] Update the descriptions and the rationale of the `app/banner`
      pages, `docs/mockups/catalogue.md`, and the mockups README.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements of decisions 220 to 223 in the protocol docs, and
the answers of decisions 224 to 228 when they come.

- [ ] Update `docs/protocol/github-banner.md`: the actions by state, local
      work, the agent actions, Merge and who sees it, Continue and Archive,
      and the actions on a phone. Remove the rules that every action links
      to GitHub and that the app merges nothing.
- [ ] Update `docs/protocol/chat-and-events.md`: an action is a message of
      the member who clicks, and the note of Continue.
- [ ] Update `docs/protocol/agent-instructions.md`: a workspace can hold
      one task after another, Continue changes the workspace branch, and
      the branch line of decision 227 names the current branches.
- [ ] Update `docs/protocol/workspaces-and-sandboxes.md` with a Continue
      section beside Archive. State in
      `docs/protocol/orgs-and-members.md`, "Members and roles", that every
      member may continue a workspace (decision 224).
- [ ] Update `docs/protocol/create-a-workspace.md`: the branch rule also
      names the branch of Continue.
- [ ] Update `docs/protocol/github-tokens.md`: the Worker reads a member's
      merge right and merges with that member's own token. Record the
      Actions permission of the App and its reason (decision 225), and
      the trusted Continue job with the token of the member who pressed
      Continue (decision 226).
- [ ] Update `docs/architecture.md` and `docs/architecture/flows.md`: a
      workspace has one branch at a time, and it can hold one task after
      another. Update the same words in `AGENTS.md` and `README.md`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact, such as who a merge shows as, the
      repository access that the app reads for each member, and whose
      GitHub token the fetch of Continue uses under decision 226.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Local work in the changes report

Depends on: 2

The runner reports the commits of the current branch that no remote
branch holds, beside the changed files that it already marks.

- [ ] Add the number of such commits to the runner's changes report and
      to `ChangesResponse` in `src/shared/files.ts`.
- [ ] Store and forward the number in the Worker, and add it to the fake
      API and the fixtures.
- [ ] Test the count in the runner, and its path to the browser.
- [ ] Update the runner README and the shared README.

## Milestone 4: Merge right and merge route

Depends on: 2

The Worker reads each member's merge right and method, and merges as the
member.

- [ ] Add the head commit to the pull request of the banner contract in
      `src/shared/github.ts`.
- [ ] Add a read route that returns, for the signed-in member, the merge
      right and the merge method. It reads with the member's own token,
      behind the app gate and the org check.
- [ ] Add a write route that starts the merge with GitHub's asynchronous
      merge API, with the member's own token, the head commit, the method,
      and a direct merge. It refuses a non-member, a suspended org, and an
      archived workspace.
- [ ] Add a read route that returns the result of that merge, read with
      the same member's token. Read the GitHub state again when the merge
      is done.
- [ ] Map the refusals of GitHub to the app's own error codes. No text
      from GitHub reaches the browser.
- [ ] Extend the fake GitHub server in `worker/github/fake-repository.ts`
      with the member's right, the method, and the asynchronous merge.
- [ ] Test each right, a moved head, a refused method, a merge that fails
      at its run, a missing token, a non-member, and a suspended org.
- [ ] Update `worker/github/README.md`.

## Milestone 5: Merge in the bar

Tags: ui

Depends on: 1, 4

- [ ] Read the member's merge right and method when the bar loads and
      after a reconnect.
- [ ] Show Merge in Ready to merge for a member who may merge, with the
      method in its label. Merge runs on one click, and local work hides
      it, as decision 228 chose.
- [ ] Show the merge that runs, and each refusal, as the mockups draw
      them.
- [ ] Show the actions at the top of the Checks tab on a phone.
- [ ] Test the bar for each right, each refusal, and the phone.
- [ ] Smoke-test Merge in the development page of the GitHub banner.
- [ ] Update `src/github/README.md` and `src/shell/workspace/screen-parts.md`.

## Milestone 6: Agent actions in the bar

Tags: ui

Depends on: 1, 3, 4

- [ ] Give the bar a way to send a prompt to the session that the member
      saw last, with the send rules of the composer.
- [ ] Add the fixed prompts in one module, with the pull request number,
      the base, the failed checks, and the reviewers.
- [ ] Show the agent action of each state, as "Actions by state" lists
      it, to a member with write access. Show Commit and push in the
      place of the main action while local work exists (decision 228).
- [ ] Test each state, local work, a member without write access, a
      blocked send, and a send during a turn.
- [ ] Smoke-test each action in the development page of the GitHub
      banner.
- [ ] Update `src/github/README.md` and `src/chat/README.md`.

## Milestone 7: Continue in the Worker and the runner

Depends on: 2

Continue moves the workspace to a new branch, under decisions 224, 226,
and 227.

- [ ] Add the Continue route. It accepts only a merged pull request, and
      refuses an archived workspace, a suspended org, and a workspace
      where a turn runs. Allow every member of the org (decision 224).
- [ ] Make the check for local work count the unpushed commits of every
      local branch. Use it for the question of Archive and of Continue.
- [ ] Run the branch change in the sandbox. Start a stopped sandbox
      first. Fetch the default branch in a trusted Continue job, with the
      token of the member who pressed Continue (decision 226), through a
      staging repository with a clean Git config. Create the new branch
      with the changed files. Keep the old branch when Git refuses.
- [ ] Store the new branch in D1 and in the workspace object. Read the
      GitHub state of the new branch, and publish the change to each tab.
- [ ] Add the note of Continue to the chat events. Send the current
      workspace branch with each message, and add the branch line of
      decision 227 in the runner, after the sender line of pull request
      #112.
- [ ] Test the route rules, the count of every local branch, the branch
      change, a refused move, the routing of GitHub events to the new
      branch, and the note.
- [ ] Update `worker/github/README.md`, the lifecycle README, and the
      runner README.

## Milestone 8: Continue in the bar

Tags: ui

Depends on: 1, 7

- [ ] Show Continue beside Archive after a merge, to every member
      (decision 224).
- [ ] Show the question with local work, the branch change that runs, a
      failed Continue, and Continue while a turn runs, as the mockups draw
      them.
- [ ] Show the note of Continue in each session.
- [ ] Test the action, the question, a failure, and the bar after
      Continue.
- [ ] Smoke-test Continue in the development page.
- [ ] Update `src/github/README.md` and `src/chat/README.md`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
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

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, with a rebuilt org image, run each agent
      action, a merge by a member with the right, the hidden Merge of a
      member without it, and a Continue.
