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

This change does not cover a webhook trigger, filters for pull request
triggers, notifications, or routines across several repositories. The
design calls below give the reasons.

Open decisions: 203, 204, and 206. The options check of 9 November 2026
changed the recommendations of 203 and 204 after the user's choice, so
the user's choices stay in force until the user answers again. Decision
203 blocks only a start limit that Milestone 5 would add. Decision 204
blocks only a retention rule that a new milestone would add. Decision 206
blocks the pull request dispatch of Milestone 6.

The decisions of this plan take the numbers from 201. The decisions of
`plans/boat-native-remote-workspaces.md` reached 146 on 9 November 2026,
and that plan still adds decisions. A separate block keeps each number in
the protocol docs the name of one record.

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

### 201. Choose what one routine run works in

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
    Decision 202 decides who may change a routine.
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

### 202. Choose who sees and edits a routine

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

### 203. Choose how often routines may start cloud computers

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
- **Chosen:** B, by the user on 8 November 2026. B stays in force until
  the user answers the question of 9 November 2026.

### 204. Choose where run workspaces show and how long they stay

Added on 8 November 2026 from the routines brainstorm.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Under decision 201 A, each run adds a workspace. A
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
- **Related:** Decision 201. This decision applies only to decision
  201 A. Decision 203 E would also count the restarts of kept run
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
  normal workspaces. A stays in force until the user answers the
  question of 9 November 2026.

### 205. Choose the branch of a pull request run

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
- **Related:** Decision 201. This decision applies only to decision
  201 A. Decision 206 decides whose pull requests start a run.
- **Recommendation:** D, from the options check of 9 November 2026. The
  first recommendation was A. D keeps A's rule of one workspace for each
  branch, and it tells the agent and the members which pull request
  started the run.
- **Action:** asked the user, because the options trade the pull request
  bar against a shared branch.
- **Chosen:** A, by the user on 8 November 2026. D only adds a record and
  two links to A, so the design takes them as an agent call of
  9 November 2026. E stays out.

### 206. Choose whose pull requests may start a run

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
    vars stay in reach. It applies decision 202 D to pull request runs,
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
- **Related:** Decision 202 D and E would narrow what a run holds, and G
  applies 202 D to pull request runs. Decision 205 starts the run on the
  code of the pull request.
- **Recommendation:** B. It keeps the trust line that decisions 105 and
  121 already draw around the members of one org, at a small cost. C, E, or
  F can widen it later. G best protects the codebase. The options check
  kept B.
- **Action:** ask the user, because the options trade the runs for bots
  and collaborators against the exposure of the owner's logins, and no
  requirement covers this.

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
- Hourly asks for a minute. Daily and Weekdays ask for a time. Weekly asks
  for a day and a time. Custom asks for a cron expression. Each routine
  has one time zone, which the page shows and the owner can change.
- A desktop shows the Runs list in a right column. A phone shows it below
  the form. Each run shows its time, its trigger, its state, and a link
  to its workspace. A failed run shows its cause.
- A run workspace is a normal workspace in the routine's section
  (decision 204). Its header names the routine and links to it.

### Data

- Migration `routines`: one row for each routine. Columns: `id`,
  `org_id` with a cascade from `orgs`, `owner_user_id` that references
  `users`, `name`, `repository_id`, `section_id`, `prompt`, `agent`,
  `model`, `effort`, `active`, `inactive_reason`, `time_zone`,
  `triggers_json`, `next_run_at`, `created_at`, and `updated_at`.
  - The owner references `users`, not `org_members`. Reason: a routine
    stays, turned off, after its owner leaves. A key to `org_members`
    would either block the leave or delete the routine.
  - `triggers_json` holds the trigger list. Reason: the app always reads
    and writes the triggers with their routine. The pull request dispatch
    filters the list in code after a query by repository.
- Migration `routine_runs`: one row for each run. Columns: `id`,
  `routine_id` with a cascade from `routines`, `org_id`, `run_key` with a
  unique index, `message_id`, `trigger_json`, `state`, `workspace_id`,
  `error_code`, `error_message`, `created_at`, and `updated_at`.
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
- A D1 trigger `AFTER DELETE ON org_members` turns off the routines of
  that owner in that org with the reason `owner_left`, as
  `202611071402_departed_member_invites.sql` does for invitations.
- `workspace_creation_attempts` gets nullable `error_code` and
  `error_message` columns. The start failure writes them when it marks the
  attempt failed. Reason: the workspace object clears its result after a
  failed start, so D1 keeps no cause today.
- `workspace_creation_plans` gets a nullable `base_ref` and `base_sha`.
  Reason: `joinCreation` rebuilds each job from the plan row, so a base
  only in memory gets lost.
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
- The run text is the prompt, a separator line, and the trigger facts:
  the routine name, the trigger, and for a pull request its number, its
  address, its head branch with the head commit, and its base branch. The
  text copies no title or body of a pull request.
- The state of a run comes from three places, in this order:
  - The run row: `queued` before a workspace exists, or `failed` with its
    cause.
  - The workspace row: its state, such as starting, working, input,
    unread, ready, stopped, error, or archived.
  - The creation attempt: a failed start that removed its workspace gives
    `failed` with the stored code and message.
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
  than one minute. This covers a Worker that stopped between the store
  and the create, and a webhook whose background start did not end.
- The scan handles at most 50 routines and 50 queued runs each minute.
  The rest wait for the next minute.
- The app computes the next time with `croner`, in the routine's time
  zone. Reason: it has no dependencies, it handles time zones and summer
  time through `Intl`, and it runs in a Worker. A preset is stored as its
  cron expression, so one rule covers every schedule.
- A custom cron needs five fields, and its minute field must name one
  minute. That rule is the "at most once an hour" of decision 203. Each
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
  routine again. The options check of decision 206 found this loop.
- The callback stores each run with its delivery key, and answers GitHub
  at once. It starts the runs in the background of the request. The
  minute scan starts each run that the background did not start. Reason:
  GitHub waits only 10 seconds for an answer.
- The run of an opened or pushed pull request creates its branch from the
  head commit of the event (decision 205). The fetch phase fetches
  `refs/pull/<number>/head` into the remote-tracking ref
  `refs/remotes/origin/pull/<number>`. The branch phase creates the
  branch at the head commit of the event. When that commit is missing, it
  uses the fetched head. Reason for the remote-tracking ref: the archive
  check counts each commit that no remote ref holds as unpushed, at
  `worker/app-api/archive.ts:38`, so a fetch into `FETCH_HEAD` alone
  would show the commits of the pull request as unpushed work.
- The run row in the Runs list and the header of a pull request run link
  to the pull request, from the facts of the run. This adds option D of
  decision 205 to the chosen A.
- Decision 206 decides whose pull request events start a run. It is open,
  so the dispatch TODOs of Milestone 6 wait for its answer.
- The run of a merged pull request creates its branch from the base
  branch of the pull request.
- The start step label says "Fetching the pull request" or "Fetching the
  base branch" for such a run. The branch name keeps the rule of
  decision 53.

### Access

- Every member sees every routine of the org and its runs (decision 202).
- Every member who can create a workspace can create a routine. The
  creator is its owner, and the owner never changes.
- Only the owner changes a routine, turns it on, and uses Run now.
- An admin can turn a routine off and delete it. The owner can also
  delete it.
- The org gate already refuses each write in a suspended org.
- A deleted routine keeps its run workspaces, because they are normal
  workspaces (decision 204).

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
- The first version has no filters for label, author, or base branch.
  Reason: Conductor added them nine days after its first routines.
- Pull requests from forks never start a run. Reason: their code is
  untrusted, and a run holds the owner's GitHub access and the org's env
  vars.
- A routine never starts a run for a pull request on the branch of one of
  its own runs. Reason: this stops a run from starting itself.
- Each routine has one time zone, and a custom cron uses it too. Reason:
  "Daily at 9:00" must mean the owner's 9:00.
- A late schedule starts one run, not one for each missed time.
- The first message of a run is the prompt and the trigger facts.
- A failed run shows its cause, and the routine stays on.
- A suspended owner or org gets no runs. When the owner leaves the org,
  the routine turns off.
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
  201 A named Durable Object alarms in its text, but the user's choice
  covers a new workspace for each run, not the timer.
- A run starts its session on the owner's own login, so the share setting
  of decision 116 does not block it. A later message of another member in
  a run workspace follows decision 116, as in any workspace.
- Only the owner uses Run now. Reason: a run spends the owner's logins.
- Run now works while the routine is off. Reason: the owner can test a
  routine before its triggers start runs.
- A routine can have no trigger. Run now still works.
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
- A pull request run fetches the head into a remote-tracking ref, so that
  the archive check counts no commit of the pull request as unpushed.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw every screen and state of routines, each in a phone and a desktop
variant, and one flow. Each page holds five screens or fewer.

- [ ] Add the Routines link to the desktop sidebar and to the phone list
      of the org, with a `routines` value for the current link of the
      sidebar.
- [ ] Draw the Routines page under `app/routines`: the routines of the org
      with their triggers, state, owner, and last run. Add the empty
      state as a variant.
- [ ] Draw the routine page under `app/routines/routine`: the owner's view
      of a saved routine with its triggers and its runs. Add variants for
      a new routine with "No runs yet", a member's read-only view, an
      admin's view with Turn off and Delete, and a routine that turned off
      because its owner left.
- [ ] Draw the triggers under `app/routines/triggers`: the open Add
      trigger menu with its two groups, the Hourly, Daily, and Weekly
      editors with the time zone, and a custom cron that the form refuses
      because it runs more than once an hour.
- [ ] Draw the Runs list under `app/routines/runs`: queued, starting,
      working, needs input, finished, and archived runs, and a failed run
      for each cause: no agent login, expired GitHub access, and a failed
      start.
- [ ] Draw the run workspace under `app/routines/run-workspace`: the
      header with the links to its routine and to its pull request, and
      the first message with the trigger facts of a pull request.
- [ ] Add the flow "Create a routine": the new routine page, the saved
      routine, Run now, and the run workspace.
- [ ] Update `docs/mockups/catalogue.md` and `docs/mockups/src/paths.ts`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at both
      sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for routines, so that
the code milestones can follow them.

- [ ] Write `docs/protocol/routines.md`: routines, triggers, runs, the run
      text, access, the schedule limit, a member who leaves, suspensions,
      and decisions 201 to 206 with their rejected options. Keep it near
      250 lines. The rule for the authors of pull requests waits for the
      answer to decision 206.
- [ ] Record the risks that stay open in `docs/protocol/routines.md`, as
      `access-and-security.md` does for decisions 105 and 121. Comments,
      reviews, and description edits by other accounts reach the agent of
      a pull request run, and the run holds the owner's logins and the
      org's env vars.
- [ ] Update `docs/protocol/workspaces-and-sandboxes.md`: the branch of a
      pull request run and its start step (decision 205).
- [ ] Update `docs/protocol/github-banner.md`: the pull request webhooks
      also start routine runs.
- [ ] Update `docs/protocol/orgs-and-members.md` and
      `docs/protocol/operator-actions.md`: a member who leaves turns off
      their routines, and a suspended user or org gets no runs.
- [ ] Update `docs/architecture.md`: the terms, the minute Cron Trigger,
      a flow for routine runs, routines in "Where data lives", and the new
      protocol doc in the list.
- [ ] Add routines to the feature list and the docs list of `README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Routine records and routes

Depends on: 2

Store routines and serve their routes with the access rules. Nothing runs
yet.

- [ ] Add the migration with `routines`, `routine_runs`, and the
      owner-left trigger, in the range `202611090000`–`202611090059`. Add
      the row to the range table of `migrations/README.md`. Add the new
      tables to the reset list of `worker/test-support/harness.ts`.
- [ ] Add `src/shared/routines.ts` with the paths and the routine,
      trigger, run, request, and response types.
- [ ] Add `croner` with `npm install`. Add the schedule rules: the trigger
      list, the five-field cron with one minute, the time zone, and the
      next time.
  - [ ] Test the next time of each preset and of a custom cron across a
        change of summer time.
  - [ ] Test the refusal of a cron with two minutes, of a six-field cron,
        and of an unknown time zone.
- [ ] Serve the list, read, create, update, and delete routes behind the
      app gate. Check the repository, the section, and the model as New
      workspace does. Apply the access rules of decision 202.
  - [ ] Test that a member reads, that only the owner changes a routine
        and turns it on, and that an admin turns it off and deletes it.
  - [ ] Test that a leave turns off that owner's routines in that org
        only.
- [ ] Add the routines area to the Worker README.

## Milestone 4: Runs and Run now

Depends on: 3

Start a run as a new workspace, and let the owner start one by hand.

- [ ] Add the migration with the error columns of
      `workspace_creation_attempts`, in the range
      `202611090100`–`202611090159`. Write them in the start failure.
- [ ] Add the run starter: the checks, the create with the stable message
      ID, the run text, and the stored workspace or failure.
  - [ ] Test that a run creates its workspace with the owner, the
        repository, the section, and the model of the routine.
  - [ ] Test that a repeat of one run key gives one run and one
        workspace.
  - [ ] Test that a missing agent login and expired GitHub access each
        fail the run with their code, before any create.
  - [ ] Test that a failed start shows the run as failed with its stored
        cause after the app removes the workspace.
- [ ] Serve Run now, which accepts only the owner, and the runs list with
      the state of each run.
- [ ] Add `routine` to the workspace view.
- [ ] Update the Worker README.

## Milestone 5: Schedules

Depends on: 4

Run the schedules from the minute scan.

- [ ] Add the minute Cron Trigger to `wrangler.jsonc`, and dispatch
      `scheduled` on the cron expression of the event.
- [ ] Add the scan: the due routines, the batch that claims each due time,
      the run starter, the queued runs older than one minute, and the
      limit of 50 of each.
  - [ ] Test with a fixed clock that a due routine runs once, that two
        scans in one minute give one run, and that missed times give one
        run.
  - [ ] Test that a suspended owner, a suspended org, and a deleted org
        get no run, and that a restored org runs once.
- [ ] Compute `next_run_at` again at each save, Active change, and time
      zone change.
- [ ] Update the Worker README, which names the Cron Trigger.

## Milestone 6: Pull request runs

Depends on: 4

Start runs from pull request events, on a branch from the pull request.

- [ ] Add the migration with `base_ref` and `base_sha` on
      `workspace_creation_plans`, in the range
      `202611090200`–`202611090259`.
- [ ] Let a create start its branch from a base that only the Worker
      passes: the plan columns, the fetch of the ref, the branch at the
      head commit, and the step labels.
  - [ ] Test a create from the head of a pull request, and a create from
        the base branch after a merge, with the fake Git server.
- [ ] Read the action, the number, `merged`, the head commit, the base
      branch, and the address in `webhookRoute`.
- [ ] Add the `pullRequest` callback with its own error boundary. Find the
      matching routines, skip a routine with a run workspace on the head
      branch, apply the author rule of decision 206, store each run with
      its delivery key, and start the runs in the background. This TODO
      waits for the answer to decision 206.
  - [ ] Test with signed recorded payloads, in a new test file, that each
        of the three events starts a run.
  - [ ] Test that another action, a fork, a repeated delivery, a run's
        own branch, and the owner's push during a run for the same pull
        request start no run.
  - [ ] Test that a failed banner refresh still starts the run.
- [ ] Update the GitHub README and the Worker README.

## Milestone 7: Routines list and sidebar link

Tags: ui

Depends on: 3

Let members find the routines of their org.

- [ ] Add the three routes to the router and to `OrgRoutes`.
- [ ] Add the Routines link to the desktop sidebar and to the phone list.
- [ ] Add the routines resource and its reader to the org model, and the
      routes to the dev fake and the test fake.
- [ ] Build the Routines page and its empty state from the mockup.
  - [ ] Test that the link opens the page, and that the page lists the
        routines of the API.
- [ ] Update the web app README.

## Milestone 8: Routine page

Tags: ui

Depends on: 7

Let the owner create and change a routine.

- [ ] Build the routine page from the mockup: the name, the Active
      switch, the repository, the section, the owner, the prompt with the
      model picker, Save, and Delete.
- [ ] Build the Triggers list with the Add trigger menu, the schedule
      editors, the time zone, and the refusal of a cron.
- [ ] Show the read-only view to a member, and Turn off and Delete to an
      admin.
  - [ ] Test a save of each trigger kind, the refusal of a cron, and the
        views of the owner, a member, and an admin.
- [ ] Update the web app README.

## Milestone 9: Runs list and run workspaces

Tags: ui

Depends on: 4, 8

Show the runs, and let the owner start one.

- [ ] Build the Runs list from the mockup, with each state, each cause of
      a failure, and the links to the run workspaces.
- [ ] Add Run now for the owner. Read the runs again every 10 seconds
      while the page shows, and when the page gets the focus.
- [ ] Show the routine link in the header of a run workspace, and the
      pull request link for a pull request run, in the header and in the
      Runs list.
  - [ ] Test Run now, the states of the runs, and the header links.
- [ ] Update the web app README.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

Prove the whole change, review it, and open the pull request.

- [ ] Smoke-test with the browser harness of
      `worker/chat/integration/run-browser-harness.mjs`: create a routine,
      use Run now, and open the run workspace.
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
