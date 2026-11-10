# Routines

Status: Active. On branch `calummoore/routines-feature-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A routine is a saved prompt that runs an agent without a person. Its
triggers are schedules and GitHub pull request events, as in Conductor.
Each run creates a new workspace, and the routine lists its runs. The user
asked for routines on 8 November 2026 with three screenshots of
Conductor's routine form. Conductor Cloud turns read-only on 13 November
2026 and shuts down on 20 November 2026, so the user's Conductor routines
stop then. The brainstorm notes and sources are in
`.context/routines/notes.md`.

This change does not cover a webhook trigger, filters for labels or base
branches, notifications, or routines across several repositories. The
design calls below give the reasons.

The user answered every decision of this plan. On 9 November 2026, the
user kept 503 B and 504 A after the options check changed their
recommendations, and chose 506 C.

The decisions of this plan take the numbers from 501. They first took
201 to 214, but other plans on `main` used numbers up to 212 by
10 November 2026, so the orchestrator moved them by 300 on that day. Each
number in the protocol docs then names one record.

Contract owners:

- `docs/protocol/routines.md`, a new protocol doc that Milestone 2
  writes.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  for the branch of a pull request run.
- [GitHub banner](../docs/protocol/github-banner.md), for the pull request
  webhooks.
- [Orgs and members](../docs/protocol/orgs-and-members.md) and
  [Operator actions](../docs/protocol/operator-actions.md), for a member
  who leaves and for suspensions.
- The [architecture doc](../docs/architecture.md).
- The [Worker README](../worker/README.md) and the
  [web app README](../src/app/README.md).

## Decisions

### 501. Choose what one routine run works in

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** A run needs a cloud computer, because agents work only
  there (decision 36). The agent tools already create a workspace whose
  agent starts on a first message. Both options share three assumptions:
  - A run works in a cloud computer. Decision 36 requires this.
  - A run acts as the routine's owner, as in Conductor and Claude.
    Decision 502 decides who may change a routine.
  - A routine has one repository, as a workspace does. Its cloud computer
    still holds the org's other chosen repositories (decision 94).
- **Problem:** No requirement says what a run works in, what starts it, or
  where the user sees its result.
- **Impact if no action:** No plan can start. The user's Conductor
  routines stop on 20 November 2026 with no replacement.
- **Root question:** How does a member get an agent to run a saved task on
  a schedule or a pull request event, and see each run?
- **Options:**
  - **A.** Each run creates a new workspace with its own cloud computer
    and branch. The prompt is its first message. A Routines page lists the
    routines, and each routine lists its runs with links. Durable Object
    alarms run the schedules. The webhook route reads the pull request
    events. Runs never share files or a branch. Each run costs one start.
    Effort: Large.
  - **B.** Each routine keeps one workspace, and each run opens a new
    session there. The runs of a routine take turns. The org keeps one
    cloud computer for each routine. Runs share one branch and one set of
    files, so a pull request run must switch branches under the earlier
    work. Effort: Large.
- **Left out:**
  - A webhook trigger only, with GitHub Actions sending the schedules and
    the pull request events. It fails the goal, because the user's
    routines set their triggers in the app.
  - Runs inside GitHub Actions. Agents work only in the cloud computer, as
    the architecture doc says.
  - One session that gets each run as a new message. The conversation
    grows without end, and parallel pull request runs cannot share one
    turn.
  - Change nothing. Agents create workspaces only from a running turn, so
    nothing can start a run without a person.
- **Wider fix:** None, because this decision chooses a feature, not a fix
  for a class of problems.
- **Previous examples:** No earlier routine work exists in the
  repository, the plans, or past workspaces. Decision 52 let agents
  create workspaces "as Conductor does it". Decision 18 rejected banner
  buttons that send fixed prompts to the agent. Conductor and Claude
  create a fresh workspace or session for each run.
- **Recommendation:** A. It matches Conductor, it reuses the create path
  of the agent tools, and it keeps each run apart from the others.
- **Action:** asked the user, because A and B trade cost against
  isolation, and no requirement covered routines.
- **Chosen:** A, by the user on 8 November 2026.

### 502. Choose who sees and edits a routine

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None.
- **Background:** A run uses the owner's Claude or Codex login and the
  owner's GitHub access, as Conductor runs do. So its commits and pull
  requests show as the owner. Every member already sees every workspace of
  the org (decision 39). The user's screenshot shows "By Cal" on the
  routine.
- **Problem:** No rule says who may see a routine, who may change its
  prompt, or whose logins its runs use.
- **Impact if no action:** A member could change a prompt that then acts
  as another member on GitHub and uses that member's login.
- **Root question:** In whose name does a routine run act, and who
  controls what runs in that name? The options check of 9 November 2026
  wrote this question. The first question, "Who may see and change a
  routine that acts as its owner?", took the owner's name as given.
- **Options:**
  - **A.** Personal routines. Only the creator sees and edits each
    routine. The run workspaces still show to the whole org. Effort:
    Small.
  - **B.** Every member sees each routine, its prompt, and its runs. Only
    the creator edits it. An admin can turn it off or delete it. Effort:
    Small.
  - **C.** Every member sees and edits each routine. A save makes the
    saver the owner, so later runs use the saver's logins. Effort: Small.
  - **D.** Added by the options check: as B, but each run pushes and opens
    pull requests with a GitHub App installation token for the routine's
    repository only. The agent login stays the owner's. Pushes show as
    the app, and a stolen token reaches no other repository. It is an
    exception to decision 50 and to the rule that a workspace sandbox gets
    no installation token. Effort: Medium.
  - **E.** Added by the options check: org routines. An admin saves an
    agent login of the org, such as an API key. Each run uses it and the
    token of D, so no run acts as a member. Every member can then edit
    every routine. It needs a new stored secret with its settings screen,
    and exceptions to decisions 24, 50, and 105. Effort: Large.
- **Left out:** None. The options check brought back the GitHub App
  approach as D, because a run has no sender for decision 50 to follow.
- **Wider fix:** E, from the options check. No run then acts in a
  member's name.
- **Previous examples:** Decision 105 lets other members use the login of
  a session's starter, and it records this as a risk. Decision 116 now
  lets each owner of a login choose whether others may use it. Decision 42
  lets only the owner and the admins archive a workspace.
- **Recommendation:** B. Members already see the run workspaces, and only
  the owner decides what runs on the owner's logins. The options check
  kept B.
- **Action:** asked the user, because the options decide who can act as
  another member, and no requirement covered this.
- **Chosen:** B, by the user on 8 November 2026. The options check came
  after the choice and kept the same recommendation.

### 503. Choose how often routines may start cloud computers

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None.
- **Background:** Every cloud computer of every org runs in the app's one
  Boat account. The record of decision 23 gives that account 200 starts a
  day for all orgs together. A custom cron can fire every minute.
- **Problem:** One routine with a frequent schedule, or one busy
  repository, can use up the starts of every org.
- **Impact if no action:** A cron of `* * * * *` makes 1,440 starts a day.
  Then new workspaces of all orgs fail until the limit resets.
- **Root question:** How do we keep the starts that routines cause, by
  runs and by the restarts of kept run workspaces, from using up the
  starts that people's own work needs? The options check of 9 November
  2026 wrote this question. The first question named only the shared
  starts, and a frequent cron is only one cause.
- **Options:**
  - **A.** No limits of the app, as decisions 8 and 81 chose for
    workspaces. Only the provider's plan limits apply. Effort: Small.
  - **B.** A schedule runs at most once an hour, as Claude's routines
    require. The form refuses a more frequent cron. Pull request events
    have no limit. Effort: Small.
  - **C.** As B, and each routine starts at most 20 runs in an hour. The
    Runs list shows each later event as skipped. Effort: Small.
  - **D.** Added by the options check: as B, and the routine runs of each
    org start at most a set number of workspaces a day, such as 24. The
    Runs list shows a later trigger as skipped, with the reason. A busy
    org can lose pull request runs late in the day. Effort: Medium.
  - **E.** Added by the options check: as B, and the routine runs of all
    orgs stop for the day when the app's Boat account has used a set
    share of its daily starts, such as half. The count includes every
    start, also the restarts of kept run workspaces. The Runs list shows a
    later trigger as skipped. The Worker must count every start of the
    account, and one busy org can use the routine share of all orgs.
    Effort: Medium.
  - **F.** Added by the options check: a pull request event does not start
    a routine when its head branch belongs to a run workspace of that
    routine. Effort: Small. The design already holds this rule as an agent
    call.
  - **G.** Added by the options check: all pushes to one pull request
    within a set time, such as 10 minutes, share one "PR pushed" run,
    which starts after the last push. Such a run starts later, and each
    routine needs a timer for each pull request. Effort: Medium.
- **Left out:** None.
- **Wider fix:** E, from the options check. It limits the starts of every
  trigger, loop, routine, and org. C still lets one routine start 480
  runs a day.
- **Previous examples:** Decision 8 set no limit for workspaces that
  agents create. Decision 23 added limits for each user. Decisions 45 and
  81 removed them.
- **Recommendation:** E, from the options check of 9 November 2026. The
  first recommendation was B. E keeps a share of each day's starts for
  people's own work, whatever the number of routines, orgs, or loops.
  Under B, nine hourly routines, or the restarts of kept run workspaces,
  still use up the day.
- **Action:** asked the user, because B and C add a new refusal, and
  decision 81 chose no limits. Asked again on 9 November 2026, because
  the options check changed the recommendation, and E adds a refusal.
- **Chosen:** B, by the user on 8 November 2026. The user kept B on
  9 November 2026, after the options check recommended E.

### 504. Choose where run workspaces show and how long they stay

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Under decision 501 A, each run adds a workspace. A
  stopped workspace keeps its disk, and the app restarts it near day 14 of
  each stop (decision 43). Archive deletes the cloud computer and keeps
  the chat read-only (decision 16). Conductor hides run workspaces from
  Home behind a filter.
- **Problem:** An hourly routine adds 24 workspaces a day. Each one keeps
  a disk and gets a restart every 14 days, with no end.
- **Impact if no action:** The workspace list fills with runs. The
  restarts of old runs take a larger share of the shared starts each day.
- **Root question:** How long does a run workspace keep its cloud
  computer, so that kept runs do not cost restarts with no end? The
  options check of 9 November 2026 wrote this question. The first
  question also asked where run workspaces show, and the choice of A
  answers that part.
- **Options:**
  - **A.** Run workspaces are normal workspaces, in a section that the
    routine chooses. Each one stays until someone archives it. Effort:
    Small.
  - **B.** The workspace list hides run workspaces. The routine's Runs
    list and a filter of the list show them. Each one stays until someone
    archives it. Effort: Medium.
  - **C.** As B. Near day 14 of a stop, the app archives a run workspace
    that has no uncommitted or unpushed work. This archive replaces the
    restart. Effort: Medium.
  - **D.** As B. When a run ends with no uncommitted or unpushed work, the
    app archives its workspace. Nobody can continue that conversation.
    Effort: Medium.
  - **E.** Added by the options check: as A, so run workspaces stay normal
    workspaces. Before each stop, the app checks a run workspace for
    uncommitted files and unpushed commits, and keeps the result. Near day
    14 of a stop, the app archives a clean run workspace in place of the
    restart. It is an exception to decisions 16 and 43 for run
    workspaces. Effort: Medium.
  - **F.** Added by the options check: as A, and each routine keeps a set
    number of its newest run workspaces, such as 10. When a run starts,
    the app archives the oldest clean run workspace past that number. A
    busy pull request routine then archives its runs within hours.
    Effort: Medium.
  - **G.** Added by the options check: for every workspace, a clean
    workspace gets no restart near day 14 of a stop. The app deletes its
    cloud computer, and the next open starts a new one on its branch, with
    a new linked session. It needs a new workspace state, and it loses
    ignored files and the agent's memory. Effort: Large.
- **Left out:** None.
- **Wider fix:** G, from the options check. It stops the restarts of
  every clean workspace, whatever created it.
- **Previous examples:** Decision 43 rejected an archive near day 14,
  because it loses unpushed work. C, D, E, and F archive only when the
  check finds no such work.
- **Related:** Decision 501. This decision applies only to decision
  501 A. Decision 503 E would also count the restarts of kept run
  workspaces.
- **Recommendation:** E, from the options check of 9 November 2026. The
  first recommendation was C. E keeps the normal list that the user
  chose, and it stops the restarts of clean run workspaces. Under A, the
  runs and restarts of one hourly routine reach 200 starts a day after
  about 100 days.
- **Action:** asked the user, because C and D change the rules of
  decisions 16 and 43 for run workspaces. Asked again on 9 November 2026,
  because the options check changed the recommendation, and E changes
  the same rules.
- **Chosen:** A, by the user on 8 November 2026. Run workspaces stay
  normal workspaces. The user kept A on 9 November 2026, after the
  options check recommended E. The restarts of kept run workspaces stay a
  known cost.

### 505. Choose the branch of a pull request run

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Each new workspace creates its own branch from the
  default branch. The branch name starts with the owner's GitHub login
  (decision 53). The pull request bar finds the pull request of a
  workspace by its branch. A "PR opened" or "PR pushed" run needs the code
  of that pull request.
- **Problem:** No rule says which code a pull request run starts from, or
  where its pushes go.
- **Impact if no action:** The plan must guess. Then a review routine can
  read the default branch and not the pull request.
- **Root question:** How does a pull request run work on the code of its
  pull request, and how do its results get to that pull request? The
  options check of 9 November 2026 wrote this question. The first
  question, "Which code and which branch does a pull request run work
  on?", named a mechanism.
- **Options:**
  - **A.** A new branch that starts from the head commit of the pull
    request. A run for a merged pull request starts from its base branch.
    Pushes go to the run's own branch, unless the prompt says otherwise.
    The run's pull request bar does not show the pull request. Effort:
    Medium.
  - **B.** The pull request's own branch, in a new workspace. A run for a
    merged pull request starts as in A. The bar shows the pull request,
    and pushes update it. Two workspaces can then share one branch.
    Effort: Medium.
  - **C.** As B, but when a workspace already has that branch, the run
    opens a new session there. Each branch keeps one workspace. The run
    can disturb the agent that works there. Effort: Medium.
  - **D.** Added by the options check: as A, and the run records the pull
    request and the event that started it. The first message gives the
    agent the number, the address, and the event. The run's header and its
    row in the Runs list link to the pull request. Effort: Small.
  - **E.** Added by the options check: as A, and the Changes list of a
    pull request run compares with the head commit where the run started.
    The list then shows only the run's own work, not the pull request's.
    The Worker must give the runner a base for each run workspace.
    Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because this decision sets one rule.
- **Previous examples:** Claude's routines start a pull request run from
  its head commit, and they push to a new `claude/` branch.
- **Related:** Decision 501. This decision applies only to decision
  501 A. Decision 506 decides whose pull requests start a run.
- **Recommendation:** D, from the options check of 9 November 2026. The
  first recommendation was A. D keeps A's rule of one workspace for each
  branch, and it tells the agent and the members which pull request
  started the run.
- **Action:** asked the user, because the options trade the pull request
  bar against a shared branch.
- **Chosen:** A, by the user on 8 November 2026. D only adds a record and
  two links to A, so the design takes them as an agent call of
  9 November 2026. E stays out.

### 506. Choose whose pull requests may start a run

Added on 9 November 2026 from a new problem of the options check.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/github/webhook-routing.ts:73`.
- **Background:** A pull request run holds the owner's agent login, the
  owner's GitHub token, and the org's env vars. The owner's GitHub token
  reaches each repository where the owner installed the GitHub App
  (decision 121). The webhook route drops only pull requests from forks.
  Each account with write access can open a pull request from a branch of
  the repository itself. Such accounts include bots, such as Dependabot,
  and people outside the org. The run's agent reads the code and the text
  of the pull request.
- **Problem:** The author of a pull request can write instructions into
  the code or the text that the agent reads. The agent then acts with the
  owner's logins.
- **Impact if no action:** A collaborator outside the org can make a run
  copy the owner's GitHub token, the owner's agent login, or the org's env
  vars.
- **Root question:** How do we stop accounts outside the org from
  controlling a run that holds the owner's logins, while routines still
  serve the wanted pull requests? The options check of 9 November 2026
  wrote this question. The first question, "Whose pull request events may
  start a run that acts in the owner's name?", took a filter on accounts
  as given.
- **Options:**
  - **A.** Every pull request of the repository itself. Write access to
    the repository counts as trust. Bots and people outside the org start
    runs too. Effort: Small.
  - **B.** Only a pull request that a member of the org opened, and only
    an event that a member caused, such as a push. The app matches each
    GitHub account to a member. Bots and people outside the org start no
    run, and a merge by an account outside the org starts no run either.
    The Runs list shows each skipped event with its reason. Effort:
    Small.
  - **C.** As B, and each pull request trigger gets an author filter with
    "is" and "is not", as in Conductor. The owner can add named bots, such
    as Dependabot. Effort: Medium.
  - **D.** As A, but a run for an author outside the org starts without
    the org's env vars and with a GitHub token that can only read. The
    agent login still reaches the sandbox. Such a run can push nothing and
    post no review. It needs a new kind of start. Effort: Large.
  - **E.** Added by the options check: as B, but an author also counts
    when GitHub's `author_association` names the owner of the repository
    or a member of its GitHub organization. Teammates who never joined
    the org then start runs. It trusts accounts that no admin of the org
    invited, and the app must confirm the field with GitHub. Effort:
    Small.
  - **F.** Added by the options check: as B, and an event of any other
    account adds a run that waits for the owner, with Start and Dismiss.
    Only the owner starts it, on the owner's logins, as GitHub Actions
    asks for approval for outside contributors. It needs a new run state,
    a mockup, and protocol text. Effort: Medium.
  - **G.** Added by the options check: as B, and each pull request run
    gets a GitHub App installation token for the routine's repository
    only, in place of the owner's user token. A run that foreign text
    controls then reaches only that repository on GitHub. The run's pushes
    show as the app, so they start no new run. The agent login and the env
    vars stay in reach. It applies decision 502 D to pull request runs,
    and it is an exception to decision 50. Effort: Medium.
- **Left out:**
  - Only pull requests of the routine's owner. B is better on every
    point, because a member with a terminal in a run's cloud computer can
    already read the owner's agent login and GitHub token during a turn.
    Decisions 105 and 121 record this risk, and the share setting of
    decision 116 does not remove it.
  - An instruction or a classifier in the agent that ignores commands in
    the pull request. It fails the goal, because it makes an injection
    less likely but does not stop it.
  - A network allowlist for run sandboxes. It fails the goal, because a
    controlled run can still push a secret to a branch.
  - A first agent without logins that summarizes the pull request for a
    second agent. It fails the goal, because the agent that pushes a fix
    must read the code itself.
- **Wider fix:** G, from the options check. B must know the author and
  the sender, so it is a direct fix. Comments, reviews, and description
  edits by other accounts still reach the agent of a member's run. G
  limits the GitHub reach of every pull request run, whoever wrote the
  text.
- **Previous examples:** Decisions 105 and 121 record that a member with
  a terminal can read the logins of a running turn, so the members of one
  org trust each other. The webhook route already drops pull requests from
  forks.
- **Related:** Decision 502 D and E would narrow what a run holds, and G
  applies 502 D to pull request runs. Decision 505 starts the run on the
  code of the pull request.
- **Recommendation:** B. It keeps the trust line that decisions 105 and
  121 already draw around the members of one org, at a small cost. C, E, or
  F can widen it later. G best protects the codebase. The options check
  kept B.
- **Action:** asked the user, because the options trade the runs for
  bots and collaborators against the exposure of the owner's logins, and
  no requirement covered this.
- **Chosen:** C, by the user on 9 November 2026. The design section "Pull
  request runs" gives the rule and the filter.

### 507. Choose how a pull request run shows and sends its own work

Added on 9 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The mockup `app/routines/run-workspace`.
- **Background:** A pull request run starts its own branch at the head
  commit of the pull request (decision 505 A). Changes and the pull
  request bar compare each branch with the default branch. Option E of
  decision 505, which compares with the head commit, stayed out.
- **Problem:** The run of #482 shows the commits of #482 in Changes, as if
  the run made them. The bar also offers "Create pull request" for a
  branch that holds only those commits.
- **Impact if no action:** A member can open a second pull request with
  another person's work.
- **Root question:** How does a run show only its own work, and send it
  to the branch that it started from, whichever branch that is? The
  options check of 9 November 2026 wrote this question. A merged run
  starts from the base branch of its pull request, which need not be the
  default branch.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Hide "Create pull request" until the branch has commits after
    the head commit. Changes still shows the commits of the pull request.
    The options check found that it fails the goal: after the run's first
    own commit, the link still opens a pull request into the default
    branch with the commits of the pull request. Effort: Medium.
  - **C.** Compare Changes with the head commit, and let "Create pull
    request" open a pull request into the head branch of the pull request.
    A fix of a run then goes into the pull request that it reviewed.
    Effort: Medium.
  - **D.** Added by the options check: every workspace gets a base, the
    branch that its work targets and the commit where its branch starts.
    Changes, its diffs, and "Create pull request" use that base. A normal
    workspace keeps the default branch. An opened or pushed run gets the
    head branch at the head commit, and a merged run gets the base branch
    of its pull request. Each start must pass the base, also a resume and
    the restart near day 14, and the bar must not take GitHub's default
    branch for such a workspace. Effort: Medium.
  - **E.** Added by the options check: the run text names the branch that
    the run's work targets, and the create sets `gh-merge-base` in the Git
    config of the run branch, so that a pull request that the agent opens
    targets it. It changes neither Changes nor the bar, so it goes with C
    or D. Effort: Small.
  - **F.** Added by the options check: as D, and Changes of a pull request
    run shows two groups, the run's own work and the changes of the pull
    request. It needs a second list in the runner's reports and a protocol
    change. Effort: Large.
  - **G.** Added by the user on 9 November 2026: "can we not just set the
    base branch to be the branch rather than main?" Each workspace keeps a
    base branch. It is the default branch for a normal workspace, the head
    branch of the pull request for an opened or pushed run, and the base
    branch of the pull request for a merged run. Changes, its diffs, the
    pull request bar, and "Create pull request" use the base branch. It is
    D without the stored start commit. Effort: Medium.
- **Left out:**
  - Work on the pull request's own branch, option B of decision 505. The
    user chose A, so that no two workspaces share a branch.
  - A bar that shows the pull request of the event itself. The run's own
    work then gets no "Create pull request", and the header already links
    to that pull request.
- **Wider fix:** D, from the options check. It sets the base of every
  workspace, so each later kind of workspace that starts from another
  branch shows and sends only its own work.
- **Previous examples:** None found.
- **Related:** Decision 505 E holds the comparison part of C. Changes uses
  no merge base today (`runner/src/git-index.ts:161`), so a run of a pull
  request behind the default branch shows newer default-branch work as
  reverted. D's start commit removes that case too.
- **Recommendation:** D with E, from the options check of 9 November
  2026. The first recommendation was C. D gives the result of C also for
  a merged run on another base branch, and E stops a duplicate pull
  request that the agent opens itself.
- **Action:** asked the user, because C and D change what Changes and the
  pull request bar show, and no requirement covered it.
- **Chosen:** G, by the user on 9 November 2026. The design section "Pull
  request runs" gives the base branch, the merge base that Changes uses,
  and the starts that keep the base branch.


### 508. Choose how the org keeps a routine whose owner left

Added on 9 November 2026 from the mockups of Milestone 1.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The mockup `app/routines/routine/owner-left`.
- **Background:** When the owner leaves the org, the routine turns off.
  The owner never changes, and only the owner turns a routine on.
- **Problem:** An admin can only delete such a routine. A member must copy
  its triggers and its prompt by hand.
- **Impact if no action:** Teams rebuild routines by hand when people
  leave.
- **Root question:** How does the org keep the work of a routine after its
  owner leaves?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Add Duplicate for each member who can create a routine. The copy
    belongs to that member and starts off. Effort: Medium.
  - **C.** Let an admin give the routine to a member, who accepts it
    first. It breaks the rule that the owner never changes. Effort:
    Medium.
  - **D.** Added by the options check: a member who can create a routine
    takes over a routine whose owner left. It keeps its triggers, its
    prompt, and its runs, and it stays off until the new owner turns it
    on. The first member who acts gets it. Effort: Medium.
  - **E.** Added by the options check: at the leave, the routine moves to
    the admin who gets the workspaces of the member who left (decisions
    39 and 123). It stays off, and that admin can turn it on with their
    own logins or delete it. It replaces the planned trigger that only
    turns the routine off. Effort: Small.
- **Left out:**
  - Runs that go on with the logins of the member who left. They break
    the rule that the owner must be a member of the org.
  - An org routine on an org login, decision 502 E. It breaks the user's
    choice of decision 502 B.
- **Wider fix:** None, because this decision adds one rule or action.
- **Previous examples:** Decision 39 moves the workspaces of a member who
  leaves to an admin.
- **Recommendation:** E, from the options check of 9 November 2026. The
  first recommendation was B. E keeps the routine and its runs in one
  place at the lowest cost, and it follows the rule that already moves
  the workspaces. B can come later as a general Duplicate.
- **Action:** asked the user, because B, D, and E add behaviour that no
  requirement covered.
- **Chosen:** E, by the user on 9 November 2026.

### 509. Choose how the owner runs a failed event again

Added on 9 November 2026 from the mockups of Milestone 1.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The mockup `app/routines/runs/failed`.
- **Background:** A run fails when the owner has no agent login, when the
  owner's GitHub access expired, or when the cloud computer did not
  start. Run now starts a new run without any pull request facts.
- **Problem:** A failed "PR opened" run cannot run again with its pull
  request. A failed start has no recovery action.
- **Impact if no action:** That pull request gets no run until a new event
  arrives.
- **Root question:** How does an event whose run failed still get a run,
  after its cause is gone? The options check of 9 November 2026 wrote this
  question. The first question made the owner the actor, but C needs no
  person.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Add Run again to a failed run, for the owner only. It starts a
    new run with the same trigger facts. Effort: Medium.
  - **C.** Retry a failed start once, without a person. It spends another
    start of the shared daily starts. Effort: Medium.
  - **D.** Added by the options check: Run again, for the owner, on a
    failed run. A pull request run starts again for the same pull request
    at its current head, through the start path of decision 510 B, with
    the fork rule and the author rule of decision 506 C. A schedule run
    works as Run now. Effort: Small with decision 510 B, Medium alone.
  - **E.** Added by the options check: after the owner connects the agent
    login or GitHub again, the app starts the newest failed run of each
    pull request and each schedule of the last 24 hours. It spends starts
    that nobody pressed. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because this decision adds one action.
- **Previous examples:** Try again retries the newest failed turn of a
  session (decision 97). The follow-up item
  `failed-first-start-keeps-workspace.md` will keep a failed first start
  as a workspace with Try again.
- **Recommendation:** D, from the options check of 9 November 2026. The
  first recommendation was B. A review needs the pull request as it is
  now, and D shares one start path with decision 510 B.
- **Action:** asked the user, because B, C, D, and E add behaviour that
  no requirement covered.
- **Chosen:** F, an option of the user on 9 November 2026: "can we create
  the workspace, but then have a manual retry in it". A failed run keeps
  its workspace, and the owner retries inside it. A failed start keeps
  the workspace in its error state with Try again, as option D of
  decision 130 says for every workspace. A run whose owner has no agent
  login keeps its workspace with its first message, its cause, and Try
  again. The create refuses such a first message before any cloud
  computer starts, so that run spends no start. Decisions 512 and 513 ask
  when this comes and how repeated failures stop.

### 510. Choose how the owner tests a pull request routine

Added on 9 November 2026 from the mockups of Milestone 1.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The mockup `app/routines/routine`.
- **Background:** Run now gives the trigger "Run now" and no pull request.
  A review routine often has only pull request triggers.
- **Problem:** Run now cannot test such a routine on a chosen pull
  request.
- **Impact if no action:** An owner cannot test a review routine before a
  real event.
- **Root question:** How does the owner try a pull request routine on a
  real pull request, at a time that the owner chooses? The options check
  of 9 November 2026 wrote this question. The first question named the
  mechanism of B.
- **Options:**
  - **A.** Change nothing. The prompt must work without a pull request.
    Effort: Small.
  - **B.** Run now offers a pull request number and an event when the
    routine has a pull request trigger. The run then starts from that pull
    request, as a pull request run of that event does. It applies the fork
    rule and the author rule of decision 506 C. Effort: Medium.
  - **C.** Hide Run now on a routine that has only pull request triggers.
    The owner then cannot test it. The options check found that it fails
    the goal. Effort: Small.
  - **D.** Added by the options check: Run again, for the owner, on any
    pull request run of the Runs list. It starts a run for that pull
    request at its current head. A first test then needs one real event,
    such as a draft pull request. Effort: Small with decision 509 D,
    Medium alone.
- **Left out:** A preview of the first message for a chosen pull request.
  It shows the text, not the work of the agent.
- **Wider fix:** None, because this decision changes one action.
- **Previous examples:** None found.
- **Related:** Decision 509 D would reuse the start of B.
- **Recommendation:** B. The owner tests the real case before the first
  event. The options check kept B.
- **Action:** asked the user, because B and D add behaviour that no
  requirement covered.
- **Chosen:** C now and B as a follow-up, by the user on 9 November 2026.
  Run now does not show on a routine whose triggers are all pull request
  triggers. The follow-up item `run-now-for-pull-request-routines.md`
  holds B.

### 511. Choose whether a routine may save without a prompt

Added on 9 November 2026 from the mockups of Milestone 1.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The mockup `app/routines/routine/new`.
- **Background:** An empty name saves as "Untitled routine". The plan says
  nothing about an empty prompt.
- **Problem:** A routine without a prompt gives the agent only the trigger
  facts.
- **Impact if no action:** Each run spends a start on no task.
- **Root question:** May a routine save, or run, without a prompt?
- **Options:**
  - **A.** Save and run an empty prompt. Effort: Small.
  - **B.** Keep Save off until the prompt has text. The save route applies
    the same rule, and a prompt of only spaces counts as empty. Effort:
    Small.
  - **C.** Save a routine without a prompt as a draft. It stays off, and
    Run now stays off, until the prompt has text. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because this decision sets one rule.
- **Previous examples:** Send of the composer waits for text or a file.
- **Recommendation:** B. A run without a prompt has no task. The options
  check kept B.
- **Action:** asked the user, because B and C add a refusal, and the
  user's rules keep each new refusal for the user.
- **Chosen:** B, by the user on 9 November 2026.

### 512. Choose when a failed run keeps its workspace

Added on 9 November 2026 from the user's choice of decision 509 F.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** None.
- **Background:** Decision 509 F keeps the workspace of a failed run, with
  Try again inside it. A failed first start removes its workspace today.
  Option D of decision 130, which the user chose on 8 November 2026 as a
  later follow-up, keeps that workspace in its error state for every
  workspace. The follow-up item `failed-first-start-keeps-workspace.md`
  holds that work, and grades it Large. A run whose owner has no agent
  login also needs its first message accepted, so that its first turn
  fails in the chat with Try again.
- **Problem:** Runs cannot keep their workspaces before that Large change
  lands, and Conductor Cloud shuts down on 20 November 2026.
- **Impact if no action:** The plan cannot order its run milestones.
- **Root question:** When, compared with the launch of routines, does
  every failed run keep its workspace with a retry in it, whatever made it
  fail? The options check of 9 November 2026 wrote this question. Decision
  509 F also covers a run whose first message the create refuses, which
  option D of decision 130 does not change.
- **Options:**
  - **A.** In this plan. A new milestone builds option D of decision 130
    for every workspace before the run milestones, and deletes the
    follow-up item. Effort: Large.
  - **B.** After this plan. Runs first fail as the mockups show now: a
    failed row with its cause and a link that fixes it, and no workspace.
    When the follow-up of decision 130 D lands, failed runs keep their
    workspaces. Effort: Small.
  - **C.** In this plan, for run workspaces only. A failed first start of
    a run keeps its workspace with Try again, and every other workspace
    keeps today's removal. The app then has two rules for a failed first
    start. Effort: Medium, and the options check found it closer to Large.
  - **D.** Added by the options check: as B, and the follow-up of decision
    130 D also covers a create that fails its checks before the start: the
    agent login check of today, and a new check of the sender's GitHub
    access. Such a run keeps its workspace with its first message, its
    cause, and Try again, and spends no start. When the follow-up lands,
    the run starter drops its own checks. Effort: Small now, and the
    follow-up grows by a Medium part.
  - **E.** Added by the options check: as D, and until the follow-up lands,
    the owner gets Try again on a failed run in the Runs list. It starts
    the same run again in a new workspace. Effort: Medium.
  - **F.** Added by the options check: as D, and the follow-up starts now in
    its own workspace, beside the run milestones, as Milestone 8n ran
    beside Milestone 8i. Routines do not wait for it. Effort: Large, with
    no delay of the launch.
- **Left out:**
  - Failed rows forever, with no workspace. It breaks the user's choice of
    decision 509 F.
  - Archive the workspace of a failed run, and retry in a new one. The
    archived chat is read-only, so the retry is not in that workspace.
- **Wider fix:** F, from the options check. One rule then covers every
  workspace, also a create that its checks refuse, and the launch does not
  wait.
- **Previous examples:** Decision 130 chose A now and D later. Decision
  210 chose C now and B later.
- **Related:** Decision 513 matters once failed runs keep workspaces.
- **Recommendation:** D, from the options check of 9 November 2026. The
  first recommendation was B. D ships routines as soon as B does, and the
  follow-up then delivers all of decision 509 F, also for a run without an
  agent login. F best protects the codebase.
- **Action:** asked the user, because the options trade the launch of
  routines against the behaviour that the user chose.
- **Chosen:** B, by the user on 9 November 2026. At launch, a failed run
  shows as a failed row with its cause and a link that fixes it, and it
  keeps no workspace. When the follow-up of decision 130 D lands, a run
  whose start fails keeps its workspace with Try again. A run that the
  create checks refuse, such as a run without an agent login, stays a
  failed row, because B does not widen the follow-up.

### 513. Choose how a routine stops after repeated failed runs

Added on 9 November 2026 from the user's choice of decision 509 F.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Under decision 509 F, each failed run keeps a
  workspace, and its cloud computer starts before its first turn fails. A
  cause such as a removed agent login stays until the owner acts.
  Decision 504 A keeps run workspaces as normal workspaces.
- **Problem:** Nothing stops a routine whose runs all fail for one cause
  that only the owner can fix.
- **Impact if no action:** An hourly routine with a lost login adds 24
  workspaces and 24 starts a day, from the shared starts of all orgs,
  until the owner notices.
- **Root question:** How do runs that keep failing for one cause stop
  costing starts and workspaces until a person fixes the cause? The
  options check of 9 November 2026 wrote this question. The first question
  named only the owner, but only an admin can fix a failing startup
  script.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** The routine turns off after three runs in a row fail. The
    routine page says why, and the owner turns it on again. Effort:
    Small.
  - **C.** While a failed run waits for its retry, later triggers of the
    same routine are skipped, with a link to the workspace of that run.
    Effort: Medium.
  - **D.** Keep the check before the create for a missing agent login and
    expired GitHub access. Such a run creates no workspace and fails with
    a link that fixes the cause. Only a failed start keeps its workspace.
    It narrows decision 509 F. Effort: Small.
  - **E.** Added by the options check: as B, but a failure that clears by
    itself does not count, such as a rate limit or a cloud computer that
    the provider still prepared. A failed first turn counts, through the
    design call that tells each run how its first turn ended. It needs a
    mockup of a routine that turned off. Effort: Medium.
- **Left out:**
  - A wait that grows after each failed run, up to one day. A forgotten
    routine still adds a workspace each day.
  - A daily cap of routine starts, option E of decision 503. It breaks the
    user's choice of decision 503 B.
  - A notice to the owner alone. The cost goes on while the owner is away,
    and a notice can join any option later.
- **Wider fix:** E, from the options check. It counts each cause that
  repeats, also one that no check finds, and it does not turn a routine
  off for a provider outage.
- **Previous examples:** Claude's cloud routines skip runs while GitHub
  access is missing, start again by themselves after a reconnect, and turn
  off after 72 hours.
- **Related:** Decision 512. Its option D keeps the checks before the
  start, so a failed check costs no start, and this rule then counts the
  other causes. The design call "A failed run shows its cause, and the
  routine stays on" changes when B or E is chosen.
- **Recommendation:** E, from the options check of 9 November 2026. The
  first recommendation was B. E stops a cause that repeats, also a login
  that the provider refuses, and it does not stop a routine for a passing
  failure.
- **Action:** asked the user, because B and C add a rule that stops runs,
  and D narrows the user's choice of decision 509 F.
- **Chosen:** B, by the user on 9 November 2026. Every failed run counts,
  also a failed first turn and a failure that clears by itself.

### 514. Choose whether a run's agent may ask for a command on a Mac

Added on 9 November 2026 from the docs of Milestone 2.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** None. The rules are in `docs/protocol/agent-tools.md`,
  "Mac commands", and in `docs/protocol/routine-runs.md`.
- **Terms:**
  - **Mac command request:** an agent asks to run a command on the Mac of
    the person who sent its turn. The Mac app asks that person first.
  - **Always allow:** a choice that a person saves in the Mac app. A later
    request with the same command text then runs without a question.
- **Background:** The owner of a routine is the sender of the first
  message of each run (decision 501 A). A Mac command request goes to the
  Mac of the sender of the turn (decision 62). The agent of a pull request
  run reads text that other GitHub accounts write.
- **Problem:** Text in a pull request can make the agent of a run ask for a
  command on the owner's Mac. When the owner chose Always allow for that
  command, it runs without a question, in a folder that the request names.
- **Impact if no action:** A GitHub account outside the org can run an
  always-allowed command on the owner's Mac.
- **Root question:** When no person sent a turn, how does a member's Mac
  run only the commands that the member allowed for such a turn? The
  options check of 9 November 2026 wrote this question. A workspace that
  a run's agent creates also sends its first turn as the owner
  (`worker/tools/create.ts:34`).
- **Options:**
  - **A.** Record it as an open risk in `docs/protocol/routines.md`, and
    change nothing else. Effort: Small.
  - **B.** The first turn of a run gets a refusal that says that runs
    cannot use a Mac. Later messages that members send in the run
    workspace keep the normal rule. A workspace that the run's agent
    creates still reaches the owner's Mac. Effort: Medium.
  - **C.** Each request from the first turn of a run asks, also for an
    always-allowed command. An older Mac app ignores the new field and
    still runs an always-allowed command, and a waiting request has no
    time limit of its own. Effort: Medium.
  - **D.** Added by the options check: each message records whether a
    person started it. A message that a member sends counts. The first
    message of a workspace that the agent tools create copies the record
    of the calling turn. The Mac route serves a turn only when a person
    started its first message, and refuses every other turn with its
    reason. It needs a field on stored messages and a change to the
    create path of the agent tools. Effort: Medium.
  - **E.** Added by the options check: the Mac route refuses each request
    from a run workspace, and from each workspace that its agent created,
    whoever sends the turn. No member can use a Mac there. Effort: Medium.
  - **F.** Added by the options check: Always allow covers the command
    text in one workspace only. A run workspace then has no saved
    command, so each request asks. It changes the Mac app, This Mac, a
    mockup, and protocol text, and an older Mac app keeps the old scope.
    Effort: Medium.
  - **G.** Added by the options check: as D, and the routine page gets a
    switch, "Runs can ask for commands on my Mac", off by default. Effort:
    Large.
- **Left out:**
  - Refuse the create call of the agent tools in a turn that no person
    started. D closes the same path to the Mac and keeps the create call.
  - The rule for pull request runs only. A scheduled run can read pull
    requests too, and no person watches it.
  - An instruction in the run text not to use a Mac. Pull request text can
    override it.
- **Wider fix:** D, from the options check. It gives a Mac only to a turn
  that a person started, so a later path without a person gets no Mac.
- **Previous examples:** None found.
- **Recommendation:** D, from the options check of 9 November 2026. The
  first recommendation was B. D refuses what B refuses at about the same
  cost, and it also closes the path through a workspace that the run's
  agent creates.

- **Action:** ask the user, because B adds a new refusal, and the user's
  rules keep each new refusal for the user.

## Design



The design below is the agent's, of 9 November 2026, unless a decision
number names the user's choice. The user can override any part of it.

### What the user sees

- The sidebar of each org gets a Routines link below New workspace. The
  phone list of the org gets the same link.
- The Routines page lists the routines of the org. Each row shows the
  name, the repository, the triggers, the on or off state, the owner, and
  the last run.
- New routine opens an empty routine page. The routine page holds the
  name, an Active switch, the repository, the section of the run
  workspaces, "By" and the owner, the Triggers list with Add trigger, the
  prompt with the model picker, Save, Run now, and Delete.
- Add trigger offers Hourly, Daily, Weekdays, Weekly, and Custom under
  "Scheduled", and PR opened, PR pushed, and PR merged under "GitHub".
- A pull request trigger can have an author filter with an "is" list and
  an "is not" list of GitHub accounts (decision 506).
- Hourly asks for a minute. Daily and Weekdays ask for a time. Weekly asks
  for a day and a time. Custom asks for a cron expression. Each routine
  has one time zone, which the page shows and the owner can change.
- A desktop shows the Runs list in a right column. A phone shows it below
  the form. Each run shows its time, its trigger, its state, and a link
  to its workspace. A failed run shows its cause.
- A run workspace is a normal workspace in the routine's section
  (decision 504). Its header names the routine and links to it.

### Data

- Migration `routines`: one row for each routine. Columns: `id`,
  `org_id` with a cascade from `orgs`, `owner_user_id` that references
  `users`, `name`, `repository_id`, `section_id`, `prompt`, `agent`,
  `model`, `effort`, `active`, `inactive_reason`, `time_zone`,
  `triggers_json`, `next_run_at`, `created_at`, and `updated_at`.
  - The owner references `users`, not `org_members`. Reason: a routine
    stays, turned off, after its owner leaves. A key to `org_members`
    would either block the leave or delete the routine.
  - `triggers_json` holds the trigger list, with the author filter of
    each pull request trigger. Reason: the app always reads and writes the
    triggers with their routine. The pull request dispatch
    filters the list in code after a query by repository.
- Migration `routine_runs`: one row for each run. Columns: `id`,
  `routine_id` with a cascade from `routines`, `org_id`, `run_key` with a
  unique index, `message_id`, `trigger_json`, `state`, `workspace_id`,
  `error_code`, `error_message`, `created_at`, and `updated_at`.
  - A skipped run has the state `skipped`, and its reason in
    `error_code` and `error_message`.
  - `workspace_id` has no foreign key. Reason: a failed start removes its
    workspace row, and the run keeps the ID to read the failure. A key
    with `ON DELETE SET NULL` would lose it.
  - `run_key` makes each run start once. A schedule uses
    `schedule:<routine>:<time>`, a pull request event uses
    `github:<routine>:<delivery>`, and Run now uses
    `manual:<routine>:<request>`.
  - `message_id` is the stable ID of the first message. A retry passes the
    same ID, so `createWorkspace` joins the first create, as its key of
    org, sender, and message ID already does.
- The leave batch of `worker/members/member-data.ts`, which moves the
  workspaces of a member who leaves, also moves that member's routines in
  that org to the same new owner (decision 508 E). Each moved routine
  turns off with the reason `owner_left`, and it keeps the name of the
  member who left for the routine page.
- `workspace_creation_attempts` gets nullable `error_code` and
  `error_message` columns. The start failure writes them when it marks the
  attempt failed. Reason: the workspace object clears its result after a
  failed start, so D1 keeps no cause today.
- `workspace_creation_plans` gets a nullable `base_branch` and
  `start_sha`. Reason: `joinCreation` rebuilds each job from the plan row,
  so a base only in memory gets lost.
- `workspaces` gets a nullable `base_branch`. Null means the default
  branch of the repository. Reason: a resume and the restart near day 14
  pass the default branch today, at `worker/lifecycle/workspace-resume.ts:46`
  and `worker/lifecycle/disk-retention.ts:113`, so a base that only the
  create knows gets lost at the next start (decision 507 G).
- The org purge needs no change. The cascades from `orgs` remove the
  routines and their runs, and no new key points to `org_members`.
- Each migration takes a free minute in the range of its milestone. The
  milestones add their rows to the range table of `migrations/README.md`.

### Runs

- One run starter in `worker/routines/` starts a stored run. It is
  idempotent, so each caller can call it again for the same run.
  1. It reads the routine, the owner, and the org. It stops with no run
     when the owner is no member, or the owner or the org is suspended or
     deleted. A schedule or a pull request run also stops when the routine
     is off. Run now works while the routine is off, so that the owner can
     test a routine before turning it on.
  2. It checks the owner's agent login for the routine's agent and the
     owner's GitHub connection. A missing login fails the run with
     `agent_login_required`. Expired GitHub access fails it with
     `github_reconnect_required`. Reason: the run fails before it spends
     a start, and the Runs list names the real cause. Today a lost GitHub
     connection shows only as a failed fetch.
  3. It calls `createWorkspace` with the routine's owner as the owner and
     the sender, the routine's repository and section, and a first
     message with the run's message ID, the routine's model, and the run
     text. Then it calls `acceptLifecycleFirstMessage`, as the agent tools
     do. It does not wait for the start, because the new workspace runs
     its own start.
  4. It stores the workspace ID. When `createWorkspace` throws, it stores
     the failure code and message.
- A failed run keeps no workspace at launch (decision 512 B). When the
  follow-up of decision 130 D lands, a run whose start fails keeps its
  workspace in its error state with Try again (decision 509 F).
- A routine turns off after three runs in a row fail (decision 513 B).
  - A run counts as failed when the run row failed, when its start
    failed, or when its first turn failed. A run whose first turn
    finished resets the count. A skipped run and a queued run do not
    count.
  - `routines.failed_runs_in_a_row` holds the count. At three, the routine
    turns off with the reason `failed_runs`, and its routine page says
    why. Only the owner turns it on again, and that resets the count.
- The run text is the prompt, a separator line, and the trigger facts:
  the routine name, the trigger, and for a pull request its number, its
  address, its head branch with the head commit, the branch that it
  merges into, and the branch that the run's own work goes to. The text
  copies no title or body of a pull request.
- The state of a run comes from three places, in this order:
  - The run row: `queued` before a workspace exists, `failed` with its
    cause, or `skipped` with its reason.
  - The workspace row: its state, such as starting, working, input,
    unread, ready, stopped, error, or archived.
  - The creation attempt: a failed start that removed its workspace gives
    `failed` with the stored code and message.
  - The first turn: the workspace tells the run how its first turn ended.
    A failed first turn shows the run as `failed` with its cause, not as
    unread or ready. Reason: a failed turn counts as output for the
    workspace state today, so the run would hide the failure. The options
    check of decisions 512 and 513 found this.

- Run now posts a run with a request ID from the page. The route waits for
  the run starter and returns the run.
- The workspace view gets `routine`: the ID and the name of the routine of
  its run, or null. A join from `routine_runs` gives it, so the lifecycle
  stores nothing new for it.

### Schedules

- A second Cron Trigger, `* * * * *`, runs beside the 15-minute one.
  `scheduled` dispatches on the cron expression of the event.
- Each minute, the scan reads the routines whose `next_run_at` has
  passed. The query joins the org and the owner, and skips a deleted or
  suspended org and a suspended owner.
- For each due routine, one D1 batch moves `next_run_at` to the next time
  after now, only when it still holds the old value, and stores the run
  with its schedule key. Then the scan calls the run starter.
  - Missed times give one run. Reason: after an outage, one late run
    does the work, and a burst of runs only spends starts.
  - A routine of a restored org runs once for its missed times, under the
    same rule.
- The scan also calls the run starter again for each queued run older
  than one minute. A queued run that cannot start, because its owner left
  or is suspended, or its org is suspended or deleted, becomes skipped
  with that reason. This covers a Worker that stopped between the store
  and the create, and a webhook whose background start did not end.
- The scan handles at most 50 routines and 50 queued runs each minute.
  The rest wait for the next minute.
- The app computes the next time with `croner`, in the routine's time
  zone. Reason: it has no dependencies, it handles time zones and summer
  time through `Intl`, and it runs in a Worker. A preset is stored as its
  cron expression, so one rule covers every schedule.
- A custom cron needs five fields, and its minute field must name one
  minute. That rule is the "at most once an hour" of decision 503. Each
  preset meets it already.
- A save, an Active change, and a time zone change compute
  `next_run_at` again. An inactive routine, or one without a schedule,
  has none.

### Pull request runs

- The GitHub App already sends `pull_request` events, so it needs no new
  setting.
- `webhookRoute` also reads `action`, `number`, `merged`, `head.sha`,
  `base.ref`, and `html_url`. A pull request from a fork still gives no
  route, so it starts no run.
- `opened` is "PR opened". `synchronize` is "PR pushed". `closed` with
  `merged` true is "PR merged". Other actions start no run.
- `handleGitHubWebhook` gets a `pullRequest` callback after
  `recordDelivery`. It runs in its own error boundary. Reason: one failed
  banner refresh must not skip a run, and one failed run must not skip a
  refresh. The follow-up item `github-push-refresh-isolation.md` covers
  the same class for the other consumers.
- The callback finds the active routines with a matching trigger for the
  repository and its installation. It skips each routine that has a run
  workspace on the head branch of the pull request. Reason: a run that
  opens or pushes to its own pull request must not start the routine
  again.
- It also skips an event whose sender is the routine's owner while a run
  of the same routine for the same pull request still starts or works.
  Reason: a run pushes with the owner's token. When its prompt tells it to
  push to the pull request that started it, that push must not start the
  routine again. The options check of decision 506 found this loop.
- The callback stores each run with its delivery key, and answers GitHub
  at once. It starts the runs in the background of the request. The
  minute scan starts each run that the background did not start. Reason:
  GitHub waits only 10 seconds for an answer.
- The run of an opened or pushed pull request creates its branch from the
  head commit of the event (decision 505). Its base branch is the head
  branch of the pull request (decision 507 G). The fetch phase fetches
  that branch into its remote-tracking ref `refs/remotes/origin/<head
  branch>`, as the start fetches the default branch today. The branch
  phase creates the branch at the head commit of the event. When that
  commit is missing, it uses the fetched head. A pull request from a fork
  never starts a run, so its head branch is always in the repository.
  Reason for the remote-tracking ref: the archive check counts each commit
  that no remote ref holds as unpushed, at `worker/app-api/archive.ts:38`.
- The base branch of a workspace sets what it compares with and where its
  work goes:
  - The runner gets the base branch at each start, in place of the default
    branch, so Changes and each diff compare with it.
  - Changes compares from the merge base of the branch and the base
    branch. Reason: the head branch of a pull request can move while a run
    works, and a plain comparison would show the newer commits as
    reverted. For a normal workspace, the merge base gives the same list
    as today while the default branch has not moved.
  - The pull request bar names the base branch, and "Create pull request"
    opens a pull request into it. So the work of a run goes into the pull
    request that started it.
  - The create sets `gh-merge-base` in the Git config of the run branch to
    the base branch. So a pull request that the agent opens with `gh`
    targets it too, once `gh` has a login.
  - The run text names the base branch as the branch that the run's own
    work goes to. It calls the base of the pull request the branch that
    the pull request merges into, so that "base" names one branch only.
- The run row in the Runs list and the header of a pull request run link
  to the pull request, from the facts of the run. This adds option D of
  decision 505 to the chosen A.
- The author rule of decision 506 C decides which events start a run.
  - Each pull request trigger can have an author filter with an "is"
    list, an "is not" list, or both. Each list holds GitHub accounts.
  - An event starts a run only when the author of its pull request passes
    the filter. An author passes "is" when the list names the author, and
    passes "is not" when the list does not name the author.
  - The author and the sender of the event must each be a member of the
    org, or an account that the "is" list names. The sender is the
    account that caused the event, such as the pusher of new commits or
    the account that merged. So a bot, such as Dependabot, starts runs
    only when the owner names it in "is".
  - The app matches accounts by their GitHub account ID, not by their
    login. The form takes logins, and the Worker resolves each login to
    its account ID when it saves the routine. Reason: a GitHub login can
    be renamed and then taken by another account. Decision 78 matches
    invitations by email for the same reason.
  - The Runs list shows a skipped run, with its reason, for an event
    whose author or sender is neither a member nor named. It shows
    nothing for an author that the owner's filter leaves out. Reason: the
    owner chose that exclusion, and a row for each such event is noise.
- The run of a merged pull request creates its branch from the base
  branch of the pull request, and that branch is its base branch.
- The start step label says "Fetching the pull request" or "Fetching the
  base branch" for such a run. The branch name keeps the rule of
  decision 53.

### Access

- Every member sees every routine of the org and its runs (decision 502).
- Every member who can create a workspace can create a routine. The
  creator is its owner. The owner changes only when the owner leaves the
  org: the routine then moves, turned off, to the admin who gets the
  workspaces of that member (decision 508 E).
- Only the owner changes a routine, turns it on, and uses Run now. Run now
  does not show on a routine whose triggers are all pull request triggers
  (decision 510 C).
- Save stays off until the prompt has text, and the Worker refuses a
  routine whose prompt is empty or holds only spaces (decision 511 B).
- An admin can turn a routine off and delete it. The owner can also
  delete it.
- The org gate already refuses each write in a suspended org.
- A deleted routine keeps its run workspaces, because they are normal
  workspaces (decision 504).

### Web app

- `src/app/router.ts` gets `/orgs/<org>/routines`,
  `/orgs/<org>/routines/new`, and `/orgs/<org>/routines/<routine>`.
  `OrgRoutes` gets a case for each in `screenOf` and `listCurrent`.
- The org model gets a routines resource and a routine resource with its
  runs, with actions in the style of `section-actions.ts`. The dev fake
  and `src/test-support/fake-core-routes.ts` get the same routes.
- The routine page reuses `src/shell/ui/ModelPicker.tsx`, the repository
  menu of New workspace, `useSavedDraft`, and `ActionButton` with
  `keepFocus`. The Active control is the `Switch` of `@firna/ui/switch`.
- Add trigger is one flat menu with two labelled groups. Reason: neither
  `@firna/ui` nor the app's `Menu` has submenus, and two groups give the
  same choice.
- Times use selects for the hour and the minute. Reason: `@firna/ui` has
  no time input. The mockups confirm the control.
- The author filter takes GitHub logins, and it offers the org's members
  as suggestions. The mockups confirm the control.
- The Runs list reads the runs again every 10 seconds while the routine
  page shows, and when the page gets the focus. Reason: the app has no
  event stream for an org list.

### Design calls

The brainstorm report of 8 November 2026 gave these calls. The user
answered the decisions of that report and changed none of the calls.

- Runs use the owner's agent login and GitHub access. Reason: decision 105
  ties a session to its starter, and decision 50 ties pushes to the
  sender.
- The triggers are the eight of the user's screenshots, plus Run now.
  Reason: the owner can test a routine at once.
- This change adds no webhook trigger. Reason: the screenshots do not show
  one, and it needs a secret address.
- The first version has no filters for label or base branch. Reason:
  Conductor added them nine days after its first routines. The author
  filter came in with the user's choice of decision 506 C.
- Pull requests from forks never start a run. Reason: their code is
  untrusted, and a run holds the owner's GitHub access and the org's env
  vars.
- A routine never starts a run for a pull request on the branch of one of
  its own runs. Reason: this stops a run from starting itself.
- Each routine has one time zone, and a custom cron uses it too. Reason:
  "Daily at 9:00" must mean the owner's 9:00.
- A late schedule starts one run, not one for each missed time.
- The first message of a run is the prompt and the trigger facts.
- A failed run shows its cause. The routine stays on until three runs in
  a row fail, as decision 513 B later chose.

- A suspended owner or org gets no runs. When the owner leaves the org,
  the routine turns off. Decision 508 E later moved it to an admin too.
- A Routines link goes in the sidebar, as in Conductor. The mockups come
  before any code.
- A new protocol doc, `docs/protocol/routines.md`, holds the requirements.
- The plan builds Run now and schedules first, then the pull request
  triggers, so that schedules can ship sooner.

These calls of 9 November 2026 come from the code searches of this plan:

- The minute Cron Trigger and a D1 scan run the schedules, not a Durable
  Object alarm for each routine. Reason: a new kind of object on the one
  `Workspace` class needs code in `worker/workspace.ts` and
  `worker/workspace-lifecycle.ts`, which have 298 and 296 of their 300
  lines. It also needs hooks for org deletion and Restore. The scan reads
  the org and owner state at each run, so it needs no hooks. Decision
  501 A named Durable Object alarms in its text, but the user's choice
  covers a new workspace for each run, not the timer.
- A run starts its session on the owner's own login, so the share setting
  of decision 116 does not block it. A later message of another member in
  a run workspace follows decision 116, as in any workspace.
- Only the owner uses Run now. Reason: a run spends the owner's logins.
- Run now works while the routine is off. Reason: the owner can test a
  routine before its triggers start runs.
- A routine can have no trigger. Run now still works, because decision
  510 C hides Run now only when every trigger is a pull request trigger.
- An empty name saves as "Untitled routine", as in Conductor.
- The owner's GitHub connection and agent login are checked before each
  create, so a run fails before it spends a start.
- `croner` computes the next time of each schedule.
- The routine dispatch of a webhook runs in its own error boundary.
- A run text copies no title or body of a pull request. Reason: the
  agent reads the pull request itself, and the facts stay short.
- The loop guard also skips an event that the owner sent while a run of
  the same routine for the same pull request still works. Reason: the
  run's own push to that pull request has the owner as its sender.
- The pull request of a run links from its row and from the header of its
  workspace. Reason: the options check recommended option D of decision
  205, and its parts add to the chosen A without a change to it.
- A pull request run fetches its head branch into a remote-tracking ref,
  so that the archive check counts no commit of the pull request as
  unpushed.
- The pull request bar shows both branch names, each cut with an ellipsis
  when the column is narrow, with the full name as a tooltip. Reason: it
  keeps one bar layout for every workspace.

- Changes compares from the merge base of a branch and its base branch,
  for every workspace. Reason: the base branch of a run can move while the
  run works. The follow-up item `changes-base-stale-default-branch.md`
  keeps the separate problem of an old local default branch.
- An author filter matches GitHub account IDs, which the Worker resolves
  from the logins at each save. Reason: a login can change owner.
- The Runs list shows a skipped run for an author or a sender outside the
  org, and nothing for an author that the owner's filter leaves out.

These calls of 9 November 2026 come from the mockups of Milestone 1:

- "Author is" can hold the entry "Members of <org>". An empty "Author is"
  means members only. When the owner adds a first account to an empty
  "Author is", the list adds "Members of <org>" first, so the members'
  pull requests still start runs. The owner can remove that entry to
  limit runs to the named accounts. Reason: a bot in "Author is" would
  otherwise stop every run of the members, and nothing would say so.
- A suspended org shows its Routines link and read-only routine pages
  with the org notice and no actions. Reason: an org suspension takes
  away no access to read.
- The Runs list shows the newest 50 runs, and "Show older runs" when older
  runs exist. Reason: an hourly routine adds 24 runs a day.
- A phone shows the routine page in two tabs, Routine and Runs. Reason: a
  member who reads runs must not scroll past the whole form.
- A new routine starts active, with the first repository of the org, the
  General section, and the default model of the owner.
- Save stays off while nothing changed and while the form refuses a cron.
- An admin who is not the owner sees Turn off only while the routine is
  on.
- Times use the 24-hour clock, with an hour select and a minute select.
- A run workspace shows "Run of <routine> for #<number>" on a line under
  its header, with both links.
- The start step of a pull request run says "Fetching pull request
  #<number> of <repository>".
- The mockups at `app/routines` hold the copy of each state, each failure,
  and each skip. Milestones 7 to 9 take the copy from there.

These calls of 9 November 2026 come from the docs of Milestone 2:

- A queued run whose routine is off becomes skipped with that reason, as
  for the other reasons why a queued run cannot start.
- Deleting a section moves its routines to General, as it moves its
  workspaces.
- When the repository of a routine stops being a chosen repository of the
  org, the routine turns off, and its page says why. Reason: no run of it
  can succeed.
- The author filter decides before the trust rule. An event whose author
  the filter leaves out gives no row.
- The start step of an opened or pushed run says "Fetching pull request
  #<number> of <repository>", and a merged run says "Fetching <branch> of
  <repository>".
- The loop guard skips while a run of the same routine for the same pull
  request is queued, starting, working, or waiting for input.
- After its routine is deleted, a run workspace shows no routine line.
- A queued run that cannot start, because its owner left or is suspended,
  or its org is suspended or deleted, becomes skipped with that reason.
  The scan then stops retrying it. Reason: the rule that such an owner or
  org gets no runs, and a run that stays queued says nothing.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw every screen and state of routines, each in a phone and a desktop
variant, and one flow. Each page holds five screens or fewer.

- [x] Add the Routines link to the desktop sidebar and to the phone list
      of the org, with a `routines` value for the current link of the
      sidebar.
- [x] Draw the Routines page under `app/routines`: the routines of the org
      with their triggers, state, owner, and last run. Add the empty
      state as a variant.
- [x] Draw the routine page under `app/routines/routine`: the owner's view
      of a saved routine with its triggers and its runs. Add variants for
      a new routine with "No runs yet", a member's read-only view, an
      admin's view with Turn off and Delete, and a routine that turned off
      because its owner left.
- [x] Draw the triggers under `app/routines/triggers`: the open Add
      trigger menu with its two groups, the Hourly, Daily, and Weekly
      editors with the time zone, a custom cron that the form refuses
      because it runs more than once an hour, and the author filter of a
      pull request trigger with its "is" and "is not" lists.
- [x] Draw the Runs list under `app/routines/runs`: queued, starting,
      working, needs input, finished, and archived runs, a failed run for
      each cause: no agent login, expired GitHub access, and a failed
      start, and a skipped run whose author is outside the org.
- [x] Draw the run workspace under `app/routines/run-workspace`: the
      header with the links to its routine and to its pull request, and
      the first message with the trigger facts of a pull request.
- [x] Add the flow "Create a routine": the new routine page, the saved
      routine, Run now, and the run workspace.
- [x] Draw read-only routine pages for a suspended org under
      `app/orgs/suspended/routines`, with the org notice and no actions.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/src/paths.ts`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at both
      sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockups raised decisions 507 to 513, which the
      user answered on 9 November 2026, and the design calls of the
      mockups. The mockups draw each answer.
- [x] Draw the answers: the base branch of a pull request run (507 G), a
      routine that moved to an admin (508 E), no Run now on a routine with
      only pull request triggers (510 C), Save off without a prompt
      (511 B), and a routine that turned off after three failed runs
      under `app/routines/routine/turned-off` (513 B).

Milestone completed on 9 November 2026. A UI implementor subagent drew
the screens in seven rounds. The orchestrator re-ran the mockup, lint,
format, file-length, and export checks after each round, and looked at
the screenshots.


Evidence: `.context/routines/m1-ui-implementor-report.md`, the check logs
`.context/routines/m1-orchestrator-checks.log` and
`.context/routines/m1-orchestrator-checks-r2.log`, and the screenshots in
`.context/routines/m1-screens/`.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for routines, so that
the code milestones can follow them.

- [x] Write `docs/protocol/routines.md`: routines, triggers, runs, the run
      text, access, the schedule limit, a member who leaves, suspensions,
      and decisions 501 to 513 with their rejected options. Keep it near
      250 lines, and split it into linked pages if it passes that. State
      the author rule and the author filter of decision 506 C, the base
      branch of decision 507 G, and the turn-off after three failed runs
      of decision 513 B.

- [x] Record the risks that stay open in `docs/protocol/routines.md`, as
      `access-and-security.md` does for decisions 105 and 121. Comments,
      reviews, and description edits by other accounts reach the agent of
      a pull request run, and the run holds the owner's logins and the
      org's env vars.
- [x] Update `docs/protocol/workspaces-and-sandboxes.md`: the branch of a
      pull request run and its start step (decision 505), and the base
      branch of each workspace, which Changes compares with from the merge
      base (decision 507 G).
- [x] Update `docs/protocol/github-banner.md`: the pull request webhooks
      also start routine runs, and the bar names the base branch of the
      workspace and opens "Create pull request" into it (decision 507 G).
- [x] Read the Terms in `src/marketing/terms.ts` and the Privacy notice in
      `src/marketing/privacy.ts` in full. Update each sentence that
      restates a fact that this milestone changes, such as how agents run
      on a member's logins.
- [x] Update `docs/protocol/orgs-and-members.md` and
      `docs/protocol/operator-actions.md`: the routines of a member who
      leaves move, turned off, with the workspaces (decision 508 E), and a
      suspended user or org gets no runs.

- [x] Update `docs/architecture.md`: the terms, the minute Cron Trigger,
      a flow for routine runs, routines in "Where data lives", and the new
      protocol doc in the list.
- [x] Add routines to the feature list and the docs list of `README.md`.
- [x] Check each relative link of each changed Markdown file.

Milestone completed on 9 November 2026. A docs implementor subagent wrote
`docs/protocol/routines.md`, `routine-runs.md`, `pull-request-runs.md`,
and `base-branches.md`, and updated the other docs and both legal pages.
Its report is in `.context/routines/reports/m2-docs.md`.

## Milestone 3: Routine records and routes

Depends on: 2

Store routines and serve their routes with the access rules. Nothing runs
yet.

- [x] Add the migration with `routines` and `routine_runs`, in the range
      `202611090000`–`202611090059`. Add
      the row to the range table of `migrations/README.md`. Add the new
      tables to the reset list of `worker/test-support/harness.ts`.
- [x] Add `src/shared/routines.ts` with the paths and the routine,
      trigger, run, request, and response types.
- [x] Add `croner` with `npm install`. Add the schedule rules: the trigger
      list, the five-field cron with one minute, the time zone, and the
      next time.
  - [x] Test the next time of each preset and of a custom cron across a
        change of summer time.
  - [x] Test the refusal of a cron with two minutes, of a six-field cron,
        and of an unknown time zone.
- [x] Resolve the logins of each author filter to GitHub account IDs when
      a routine saves. Refuse a login that names no GitHub account.
  - [x] Test a save with a member, a bot, and an unknown login.
- [x] Serve the list, read, create, update, and delete routes behind the
      app gate. Check the repository, the section, and the model as New
      workspace does. Apply the access rules of decision 502.
  - [x] Test that a member reads, that only the owner changes a routine
        and turns it on, and that an admin turns it off and deletes it.
  - [x] Test that a leave moves that owner's routines in that org, turned
        off, to the member who gets the workspaces.
  - [x] Test that a save with an empty prompt, or a prompt of only
        spaces, gets the refusal.
- [x] Add the routines of the member who leaves to the leave batch of
      `worker/members/member-data.ts` (decision 508 E).
- [x] Move the routines of a deleted section to General, and turn off each
      routine whose repository stops being a chosen repository of the org,
      with its reason.
  - [x] Test both moves.

- [x] Add the routines area to the Worker README.

Milestone completed on 9 November 2026. A Codex non-ui implementor
session built it. The orchestrator re-ran the targeted tests of
`worker/routines`, `worker/members`, and `worker/app-api` (79 passed) and
the typecheck, lint, format, file-length, and export checks. The handoff
is in `.context/routines/reports/m3-worker.md`.

## Milestone 4: Runs and Run now

Depends on: 3

Start a run as a new workspace, and let the owner start one by hand.

- [x] Add the migration with the error columns of
      `workspace_creation_attempts`, in the range
      `202611090100`–`202611090159`. Write them in the start failure.
- [x] Add the run starter: the checks, the create with the stable message
      ID, the run text, and the stored workspace or failure.
  - [x] Test that a run creates its workspace with the owner, the
        repository, the section, and the model of the routine.
  - [x] Test that a repeat of one run key gives one run and one
        workspace.
  - [x] Test that a missing agent login and expired GitHub access each
        fail the run with their code, before any create.
  - [x] Test that a failed start shows the run as failed with its stored
        cause after the app removes the workspace.
- [x] Skip a queued run that cannot start, with its reason: its routine
      is off, its owner left or is suspended, or its org is suspended or
      deleted.
- [x] Count the failed runs in a row of each routine, from the run row,
      the start, and the first turn, and turn the routine off at three
      (decision 513 B).
  - [x] Test that three failed runs in a row turn the routine off with its
        reason, that a finished first turn resets the count, and that a
        skipped run does not count.

- [x] Serve Run now, which accepts only the owner, and the runs list with
      the state of each run.
- [x] Add `routine` to the workspace view.
- [x] Update the Worker README.

Milestone completed on 9 November 2026. A Codex non-ui implementor
session built it. It changed the exact expectations of four existing chat
tests to hold the new `routine: null` field and the stored error of a
failed turn; no assertion got looser. The orchestrator re-ran 180 tests
of `worker/routines`, `worker/chat`, and the changed tests, and the
typecheck, lint, format, file-length, and export checks. The handoff is in
`.context/routines/reports/m4-worker.md`.

## Milestone 5: Schedules

Depends on: 4

Run the schedules from the minute scan.

- [x] Add the minute Cron Trigger to `wrangler.jsonc`, and dispatch
      `scheduled` on the cron expression of the event.
- [x] Add the scan: the due routines, the batch that claims each due time,
      the run starter, the queued runs older than one minute, and the
      limit of 50 of each.
  - [x] Test with a fixed clock that a due routine runs once, that two
        scans in one minute give one run, and that missed times give one
        run.
  - [x] Test that a suspended owner, a suspended org, and a deleted org
        get no run, and that a restored org runs once.
- [x] Compute `next_run_at` again at each save, Active change, and time
      zone change.
- [x] Update the Worker README, which names the Cron Trigger.

Milestone completed on 9 November 2026. A Codex non-ui implementor
session built it. The orchestrator re-ran 87 tests of `worker/routines`,
`worker/scheduled.test.ts`, and `worker/members`, and the typecheck, lint,
format, file-length, and export checks. The handoff is in
`.context/routines/reports/m5-worker.md`.

## Milestone 6: Pull request runs

Depends on: 4

Start runs from pull request events, on a branch from the pull request.

- [x] Add the migration with `base_branch` and `start_sha` on
      `workspace_creation_plans`, and `base_branch` on `workspaces`, in
      the range `202611090200`–`202611090259`.
- [x] Let a create start its branch from a base that only the Worker
      passes: the plan columns, the fetch of the base branch, the branch
      at the head commit, the `gh-merge-base` setting, and the step
      labels.
  - [x] Test a create from the head of a pull request, and a create from
        the base branch after a merge, with the fake Git server.
- [x] Keep the base branch at each start: the create, a resume, and the
      restart near day 14 give it to the runner.
  - [x] Test that a resumed run workspace still compares with the head
        branch of its pull request.
- [x] Let the runner compare Changes and each diff from the merge base of
      the branch and its base branch.
  - [x] Test that a new commit on the base branch does not show as
        reverted in Changes.
- [x] Add the base branch to the workspace view and to the state of the
      pull request bar.

- [x] Read the action, the number, `merged`, the head commit, the base
      branch, the address, the author, and the sender in `webhookRoute`.
- [x] Add the `pullRequest` callback with its own error boundary. Find the
      matching routines, skip a routine with a run workspace on the head
      branch, apply the author rule and the author filter of decision
      506 C, store each run or skipped run with its delivery key, and
      start the runs in the background.
  - [x] Test with signed recorded payloads, in a new test file, that each
        of the three events starts a run.
  - [x] Test that another action, a fork, a repeated delivery, a run's
        own branch, and the owner's push during a run for the same pull
        request start no run.
  - [x] Test that a failed banner refresh still starts the run.
  - [x] Test that an author or a sender outside the org gives a skipped
        run with its reason, that a bot in "is" starts a run, and that an
        author in "is not" starts no run and adds no row.
- [x] Update the GitHub README and the Worker README.

Milestone completed on 10 November 2026. A Codex non-ui implementor
session built it. It changed the exact expectations of existing tests for
the intended behaviour: three view replies now hold `baseBranch`, and two
fetch commands of the create name the remote-tracking ref. The
orchestrator re-ran 266 Worker tests of `worker/github`, `worker/routines`,
`worker/lifecycle`, `worker/app-api`, and `worker/scheduled.test.ts`, the
runner's typecheck and 123 tests, and the typecheck, lint, format,
file-length, and export checks. The handoff is in
`.context/routines/reports/m6-worker.md`.

## Milestone 7: Routines list and sidebar link

Tags: ui

Depends on: 3

Let members find the routines of their org.

- [x] Add the three routes to the router and to `OrgRoutes`.
- [x] Add the Routines link to the desktop sidebar and to the phone list.
- [x] Add the routines resource and its reader to the org model, and the
      routes to the dev fake and the test fake.
- [x] Build the Routines page and its empty state from the mockup.
  - [x] Test that the link opens the page, and that the page lists the
        routines of the API.
- [x] Capture again the marketing pictures that show the sidebar, as
      `src/marketing/README.md` says, so that they show the Routines link.
- [x] Update the web app README.

Milestone completed on 10 November 2026. A UI implementor subagent built
it. It also fixed the New workspace row, which lost its styles when
Milestone 1 renamed two classes of the shared mockup CSS, and the link
role of the shared test helper, so that link queries can fail. The
orchestrator re-ran the 562 tests of `src` and the typecheck, lint,
format, file-length, and export checks. The handoff is in
`.context/routines/reports/m7-ui.md`. The follow-up item
`age-format-weeks.md` holds its open question about "14d" and "2w".

## Milestone 8: Routine page

Tags: ui

Depends on: 7

Let the owner create and change a routine.

- [x] Build the routine page from the mockup: the name, the Active
      switch, the repository, the section, the owner, the prompt with the
      model picker, Save, and Delete.
- [x] Build the Triggers list with the Add trigger menu, the schedule
      editors, the time zone, the refusal of a cron, and the author filter
      of each pull request trigger with the refusal of an unknown login.
- [x] Show the read-only view to a member, and Turn off and Delete to an
      admin.
  - [x] Test a save of each trigger kind, the refusal of a cron, and the
        views of the owner, a member, and an admin.
- [x] Update the web app README.

Milestone completed on 10 November 2026. A UI implementor subagent built
it. The orchestrator re-ran the 575 tests of `src` and the typecheck,
lint, format, file-length, and export checks. The handoff is in
`.context/routines/reports/m8-ui.md`. Its two items became Milestones 8a
and 8b.

## Milestone 8a: Mockup gaps of the routine page

Tags: mockup

Depends on: 8

The app found a state that the mockups do not draw. Agent call of
10 November 2026: Delete asks first, as Delete org and Remove member do,
because a deleted routine cannot come back. The mockups drew Delete but
not what it does, so this fills a gap and contradicts no screen.

- [x] Draw the Delete question of the routine page: "Delete <name>? Its
      triggers and prompt are deleted. Its run workspaces stay.", with
      Cancel and Delete routine, at both sizes.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.

Milestone completed on 10 November 2026. The UI implementor subagent drew
the question on the new page `app/routines/routine/delete`. The
orchestrator re-ran the mockup check and the static checks.

## Milestone 8b: The refused login in the refusal

Depends on: 8

Agent call of 10 November 2026: the refusal of an unknown login names
that login in its own field, so that the page can mark its chip and open
its filter, as the mockups draw it. The mockups are the spec, and the
message text alone cannot tell the page which chip to mark.

- [x] Add an optional field to the shared error body, and let the routine
      save put the refused login and its trigger in it.
  - [x] Test that a save with an unknown login returns that login and
        its trigger in the field.
- [x] Update the READMEs of the areas that change.

Milestone completed on 10 November 2026. A Codex non-ui implementor
session added the optional `details` field to the shared error body. The
orchestrator re-ran 62 tests of `worker/routines` and `worker/http` and
the static checks. The handoff is in `.context/routines/reports/m8b-worker.md`.

## Milestone 9: Runs list and run workspaces

Tags: ui

Depends on: 4, 6, 8, 8a, 8b

Show the runs, and let the owner start one.

- [x] Build the Runs list from the mockup, with each state, each cause of
      a failure, each skipped run with its reason, and the links to the
      run workspaces.
- [x] Add Run now for the owner. Read the runs again every 10 seconds
      while the page shows, and when the page gets the focus.
- [x] Show the routine link in the header of a run workspace, and the
      pull request link for a pull request run, in the header and in the
      Runs list.
- [x] Let the pull request bar name the base branch of the workspace, and
      open "Create pull request" into it.
- [x] Mark the chip of a refused login and open its filter, from the field
      of Milestone 8b.

  - [x] Test Run now, the states of the runs, and the header links.
- [x] Update the web app README.

The UI implementor built Milestone 9 on 10 November 2026, and the
orchestrator re-ran the 592 tests of `src` and the static checks. Two
parts wait for API fields: the pull request link of the run line, and the
account login in the reason of a skipped run. Milestones 9a and 9b add
them. The handoff is in `.context/routines/reports/m9-ui.md`. The
follow-up item `dev-fake-chat-for-new-workspaces.md` holds the dev fake
gap.

## Milestone 9a: The pull request of a run and the account of a skip

Depends on: 9

Agent call of 10 November 2026: the API gives the two fields that the
protocol and the mockups need. `docs/protocol/routine-runs.md` asks for
the pull request link in the run line, and the mockups name the account
of a skip, so that the owner knows which account to add to "Author is".

- [x] Add the number and the address of the pull request of a run to the
      routine of the workspace view.
- [x] Store the login of the author or the sender that a skip names, and
      return it with the skipped run.
  - [x] Test both fields.
- [x] Update the READMEs of the areas that change.

Milestone completed on 10 November 2026. A Codex non-ui implementor
session added the fields. The orchestrator re-ran 93 tests of
`worker/routines` and `worker/github` and the static checks. The handoff
is in `.context/routines/reports/m9a-worker.md`.

## Milestone 9b: The pull request link and the skip words

Tags: ui

Depends on: 9a

- [x] Show "for #<number>" with its link in the run line of a pull request
      run.
- [x] Show the words of a skipped run with the account login, as the
      mockups write them.
  - [x] Test both.

Milestone completed on 10 November 2026, and with it the open TODOs of
Milestone 9. The UI implementor subagent built it. The orchestrator
re-ran the 596 tests of `src` and the static checks. The handoff is in
`.context/routines/reports/m9b-ui.md`.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

Prove the whole change, review it, and open the pull request.

- [ ] Smoke-test with the browser harness of
      `worker/chat/integration/run-browser-harness.mjs`: create a routine,
      use Run now, and open the run workspace.
- [ ] Change `TERMS_VERSION` in `src/shared/terms.ts`, because Milestone 2
      changed the Terms for routines, so that each user accepts them again.
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

- [ ] On the deployment, create a routine with a Daily trigger, and see
      one run at its time. Use Run now. Open a pull request in a chosen
      repository, and see a "PR opened" run.
