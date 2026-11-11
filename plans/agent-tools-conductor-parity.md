# Agent tools: Conductor CLI parity

Status: Active. On branch `calummoore/untitled-v3`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The workspace tools, the MCP server and the `conductive` CLI in each cloud
computer, give agents ten calls. Conductor's `conductor` CLI gives its
agents about thirty commands. So Conductive agents can hand out work, but
they cannot manage it: they cannot stop a turn, close or rename a session,
archive or move a workspace, manage sections, or open a preview. This
change adds a call for each Conductor command whose feature Conductive
already has (decision 277). The new calls keep the names of our pattern
(decision 278). A stop by an agent names the sending session with a session chip
(decision 279).

The change does not cover these things:

- Env vars for one workspace, and fast mode. Conductive does not have
  these features yet. Fast mode is planned.
- Routines. Conductor refuses the workspace token for its routine
  commands, so its agents cannot use them either.
- Cursor and ACP agents. Decision 19 offers Claude and Codex.
- Conductor's MCP tools for terminal output, diffs, and diff comments,
  because they are not CLI commands.
- Personal sections, a restore call, and a reassign call. Conductive's
  sections belong to the org, and Conductor's CLI has no restore or
  reassign command.
- A base branch for `create_workspace`. The paused plan that adds "Start
  from" to New workspace owns branch starts (decision 281 C). Decision
  280 B, a check of the branch before the create, waits for it in
  `plans/follow-ups/agent-branch-choice-check.md`.

Contract owners:

- [Agent tools](../docs/protocol/agent-tools.md) and
  [Session calls](../docs/protocol/session-calls.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md)
  and [Session transcripts](../docs/protocol/session-transcripts.md), for
  the stop line.
- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md) and
  [Isolation](../docs/protocol/isolation.md).
- The [tools README](../tools/README.md) and the
  [Worker tools README](../worker/tools/README.md).

Decision numbers 277 to 281 were the next free numbers on 11 November
2026. Renumber them before the pull request when `origin/main` uses them
by then, as `plans/follow-ups/decision-numbers-across-plans.md` says.
The brainstorm notes are in `.context/conductor-cli-parity/brainstorm.md`.
The options check of 11 November 2026 ran over decisions 277 to 280. Its
report is in `.context/agent-tools-conductor-parity/options-check.md`.
Cal answered decisions 277 to 281 on 11 November 2026.
Cal approved the plan on 11 November 2026, in the words "impl all plan
milestones". A `default orchestrator` session in this workspace runs the
milestones by delegation.
Cal chose 282 C and 283 F on 11 November 2026, in the words
"282 = C" and "283 = F". The implementation continues with those choices.

## Decisions

### 277. Which Conductor commands the workspace tools gain

Added on 11 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agent-tools.md`, section "Workspace tools"
- **Terms:**
  - **Sender:** the member whose message started the calling agent turn. Each tool call acts for that member and follows that member's rights in the app.
  - **Base branch:** the branch that a workspace's work targets. Its changes and its pull request compare against it.
- **Background:** Most missing Conductor commands wrap actions that members already have in the app. A few need features that Conductive lacks: a base branch choice at create, env vars for one workspace, and fast mode. Each new call acts for the sender. The brainstorm gave each new call the reach of the whole org, as the session calls have (decision 257 D). That reach was an agent call, and decision 257 D covers only the four session calls.
- **Problem:** Conductive agents cannot manage the work that they start.
- **Impact if no action:** Agents hand out work, but a person must tidy and stop it by hand.
- **Root question:** Which Conductor CLI abilities should Conductive agents get, given that some of them need features that Conductive does not have?
- **Options:**
  - **A.** Each command whose app action exists: 14 new calls plus options on the existing calls. The brainstorm message said 15, but its table held 14. Each call follows the app's rule for its action. Effort: Large.
  - **B.** A, plus a base branch for `create_workspace`. The base branch rules of pull request runs already exist. This changes decision 507 G for agent-made workspaces. Effort: Large.
  - **C.** B, plus env vars for one workspace and fast mode. Effort: Large, about twice B.
  - **D.** Only the core of delegation: the reads of one workspace and one session, stop, close, both renames, archive, and the list filters. Effort: Large, about half of A.
  - **E.** B, with a smaller reach for the two calls that act on the whole org's work. `archive_workspace` acts only on the calling workspace and on the workspaces that it created, which the Worker records in `created_by_workspace_id`. `delete_section` stays out. The other calls keep the reach of the org. An agent then cannot archive a workspace that it did not create, and a second reach rule sits beside decision 257 D. Effort: Large.
- **Left out:**
  - Routines, because Conductor refuses the workspace token for routine commands.
  - Cursor and ACP agents, because decision 19 offers Claude and Codex.
  - Conductor's MCP tools, because they are not CLI commands.
  - Personal sections, because Conductive's sections belong to the org.
  - `auth` and `--channel`, because the runner gives the token and our tools return web links.
  - One generic call that acts as the sender on each route of the app, because it breaks the rule that the workspace token allows only its listed calls.
  - An approval by a member for each call that ends work, because the work then waits for a person.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** Decision 257 D gave the session calls the whole org. Decision 52 chose the create and list calls "as Conductor does it".
- **Related:** Decision 279 applies to the stop call, which each option holds. Decisions 280 and 281 follow from the base branch of B.
- **Recommendation:** E, from the options check. Decision 42 limits Archive because the app deletes the cloud computer 14 days after it. With the reach of the org, text that steers a pull request run of an admin could archive every workspace of the org. E still lets an agent tidy the work that it handed out. The first recommendation was B.
- **Action:** ask the user, because E changes the choice of B, and the reach of the new writes was an agent call that no decision covers.
- **Chosen:** B, by Cal on 11 November 2026: "1 = B". After the options check, Cal chose A on the same day, in the words "227 = A". No decision 227 exists, so the working agent read it as 277, and 281 C agrees. So this plan adds no base branch, and `archive_workspace` and `delete_section` keep the reach of the org.

### 278. Whether the new calls use Conductor's command names

Added on 11 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `tools/cli.ts`, `tools/session-cli.ts`, and `tools/mcp-tools.ts`
- **Background:** Our CLI uses plural nouns, such as `conductive sessions send`. Our MCP tools use verbs, such as `send_message`. Conductor's CLI uses singular nouns, such as `conductor message create --session`.
- **Problem:** "Align" can mean the same abilities or the same names.
- **Impact if no action:** A guess can rename every command for nothing, or miss the user's intent.
- **Root question:** Should Conductive agents use the same command names as Conductor agents?
- **Options:**
  - **A.** Keep our names. New calls follow our pattern. Effort: Small.
  - **B.** Rename the CLI to Conductor's commands and flags. Keep the MCP names. Effort: Medium.
  - **C.** B, and rename the MCP tools to match. Effort: Medium.
  - **D.** Keep our names, and add Conductor's names as aliases. Effort: Medium.
  - **E.** Keep our names, and add a second program, `conductor`, to the cloud computer. It takes Conductor's commands and flags and calls the same routes. Prompts and skills that name `conductor` commands then work. It must follow each change of Conductor's CLI, and the image holds the name of another product. Effort: Medium. Added by the options check.
  - **F.** Keep our names, and teach the shared skills of `futex-ai/skills` the `conductive` commands for a Conductive cloud computer. The change is outside this repository. Effort: Medium. Added by the options check.
- **Left out:** None.
- **Wider fix:** None. This is a design choice.
- **Previous examples:** Decision 52 matched Conductor's abilities, not its names.
- **Related:** None.
- **Recommendation:** A. Agents learn the tools from their descriptions and help, so names matter little.
- **Action:** ask the user, because the request allowed both readings.
- **Chosen:** A, by Cal on 11 November 2026: "2 = A".

### 279. How the chat names a stop by an agent

Added on 11 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/messages-and-attachments.md`, the Stop rules, and `src/shared/transcript/turn-words.ts`
- **Terms:**
  - **Stop line:** the line in the chat after a stopped turn, such as "Priya stopped the agent". The Worker records who pressed Stop.
- **Background:** `stop_session` stops the running turn of a session. Messages from agents end with a `Sent by:` line and a session chip (decisions 259 and 261).
- **Problem:** With a stop by an agent, the stop line names a member who pressed nothing.
- **Impact if no action:** Members believe that a colleague stopped their agent.
- **Root question:** How do members know that an agent stopped a turn?
- **Options:**
  - **A.** Name the sender, as if the sender pressed Stop. Effort: Small.
  - **B.** Name the sending session with a session chip, such as "Stopped from" and the chip. This needs a stored field, new chat words, and a mockup. Effort: Medium.
  - **C.** Name both, such as "Cal's agent stopped the agent from" and the chip. Effort: Medium.
- **Left out:** A stop through a message that asks the agent to stop, because it does not stop a turn that ignores it.
- **Wider fix:** None. This is a design choice.
- **Previous examples:** Decision 72 names the member who pressed Stop. Decision 259 marks each message from an agent.
- **Related:** Decision 277: each option holds `stop_session`.
- **Recommendation:** B. It tells the truth with the same chip as the `Sent by:` line.
- **Action:** ask the user, because the options change what the chat shows.
- **Chosen:** B, by Cal on 11 November 2026: "3 = B".

### 280. A base branch that does not exist

Added on 11 November 2026 while planning, from decision 277 B. Changed on
the same day by the options check, which widened the root question and
added D and E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/default-branch-command.ts:36`, which fetches the base branch at the first start, `worker/lifecycle/workspace-start.ts`, and `worker/lifecycle/workspaces.ts`.
- **Terms:**
  - **Failed first start:** a create whose first start fails. The app keeps the workspace and its first message, and the workspace waits for Try again.
- **Background:** With decision 277 B, `create_workspace` takes a base branch. The first start fetches that branch from GitHub, as it does for a pull request run. The Worker has no call that checks a branch before the start. `create_workspace` waits for the creation. A failed first start gives the agent only `workspace_start_failed`, with no cause and no link to the kept workspace. Only the owner or an admin can archive the kept workspace (decision 42).
- **Problem:** A wrong branch name makes a workspace that fails at once and stays in the error state. Each retry of the same call makes one more, and the agent does not learn why.
- **Impact if no action:** Wrong names leave failed workspaces in the list until an owner or an admin archives them.
- **Root question:** How does a create call with a base branch that GitHub does not have tell the agent the cause, and leave no failed workspace behind?
- **Shared part of each option:** the Worker refuses a name that is not a valid Git branch name, such as a name with `*`. Reason: the start puts the name into a fetch refspec, and `*` there fetches every branch. A base branch that equals the default branch counts as no base branch, so an empty repository still works.
- **Options:**
  - **A.** No check before the create. The first start fails, the create call reports it, and the failed workspace stays, as for each failed first start. The reply names no cause until E is built. Effort: Small.
  - **B.** The Worker asks GitHub for the branch before the create, with the GitHub token of the sender. An unknown branch gets a refusal with a named error, and no workspace starts. When GitHub cannot answer, the create goes on, and the start decides, as in A. It adds a GitHub call and a rejection. Effort: Medium.
  - **C.** The Worker archives a workspace at once when its first start fails because the base branch is missing. The agent still gets the cause. It changes the rule that a failed first start keeps its workspace. Effort: Medium.
  - **D.** A, and the description of `create_workspace` and the CLI help tell the agent to check the branch first with `git ls-remote`. It adds no rejection. An agent can skip the check. Effort: Small.
  - **E.** A, and a failed create names its cause. The fetch step checks the branch first and ends with its own error code, such as `base_branch_not_found`. The create reply gives that code and the link of the kept workspace. The failed workspace still stays. Effort: Medium.
- **Left out:**
  - A fallback to the default branch, because the workspace would target a branch that the agent did not name.
  - A push of the missing branch from the default branch, because a typo would add a branch on GitHub that nobody asked for.
  - A create that waits until the branch exists, because a typo would hold the call until the start limit ends.
  - A workspace that shows only after its fetch succeeds, because it changes decision 91 for every create.
- **Wider fix:** B, built as one Worker check that a branch exists for a member. Other branch features can use the same check.
- **Previous examples:** A pull request run takes its branch from the GitHub event, so it needs no check.
- **Related:** Decisions 277 B and 281.
- **Recommendation:** B. A refusal before the create leaves no failed workspace, and the agent learns the cause at once.
- **Action:** ask the user, because B adds a GitHub call and a rejection, and C changes a rule in force.
- **Chosen:** B, by Cal on 11 November 2026: "280 = B". With decision 281 C, this plan adds no base branch. So B applies to the change that lets agents choose a branch. `plans/follow-ups/agent-branch-choice-check.md` records it with the shared part of each option.

### 281. How the base branch fits the plan to start from GitHub

Added on 11 November 2026 from the options check of decisions 277 to 280.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/base-branches.md`, and `plans/start-from-github.md` on the branch `calummoore/new-chat-start-from-brainstorm`.
- **Terms:**
  - **Start-from plan:** an active plan that adds "Start from" to New workspace for GitHub branches, pull requests, and issues. Its workspace "[blocked] New chat start from brainstorm" sleeps.
- **Background:** On `main`, a pull request run stores its base branch at the create (decision 507 G). Decision 216 D of the start-from plan, which Cal chose on 10 November 2026, makes the target branch follow the live base of the open pull request. That plan rejected a base that the create stores, because it goes stale when GitHub changes the base. It also adds an agent tool that changes the target branch.
- **Problem:** Decision 277 B stores the base branch of an agent's create, as pull request runs do. The start-from plan rejects that model for its own creates.
- **Impact if no action:** The plan that merges second must rework the base branch, and the two plans can build two rules for one branch.
- **Root question:** Which rule gives the target branch of a workspace that an agent creates on another branch?
- **Options:**
  - **A.** Store the base at the create, as pull request runs do on `main` today. The start-from plan reconciles when it resumes. It must handle stored bases anyway, because pull request runs store one. Effort: Medium.
  - **B.** Follow decision 216 D now. The new workspace starts from the named branch. Its target is the base of its open pull request, else the named branch. This builds part of the start-from plan here. Effort: Large.
  - **C.** Leave the base branch to the start-from plan. This plan adds no base branch, and that plan gives agents its "Start from" choice with its own target rule. Agents wait for a blocked plan. Effort: Small.
- **Left out:** A start point without a target branch, because a stacked branch would then show the commits of the branch below it as its own work.
- **Wider fix:** None. This is a design choice.
- **Previous examples:** Decision 507 G stores the base of a pull request run. Decision 216 D of the start-from plan rejected a stored base.
- **Related:** Decisions 277 B and 280.
- **Recommendation:** A. It extends the rule that `main` already has, and the start-from plan must handle stored bases for pull request runs in any case.
- **Action:** ask the user, because decision 277 B and decision 216 D conflict, and no rule settles which one wins.
- **Chosen:** C, by Cal on 11 November 2026: "281 = C". The base branch of an agent's create goes to the start-from plan.

### 282. Whose workspaces the mine filter lists

Added on 11 November 2026 during implementation. The read-only contract
check is in
`.context/agent-tools-conductor-parity/reports/list-owner-contract-check.md`.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** The list filters in the design below, and `docs/protocol/workspace-calls.md`, section "List the workspaces".
- **Terms:**
  - **Workspace token:** the secret of each cloud computer that names its workspace and its owner.
  - **Calling turn:** the agent turn that makes a call. The tools send its ID in the `X-Conductive-Turn-Id` header.
  - **Sender:** the member whose message started the calling turn.
  - **Sender line:** the `Sender: Name (@login)` line at the start of a message to the agent. No access depends on it.
  - **Mine filter:** the planned workspace-list filter for the workspaces that the sender owns, after Conductor's `--mine`.
- **Background:** The plan adds a mine filter and an owner filter. Reads need only the workspace token. The Worker learns a sender only from an active calling turn. Another member can join a running turn, which keeps its first sender. A process can read after its turn ends, and a terminal can read with the token set by hand.
- **Problem:** Without an active turn, mine has no sender. After another member joins a turn, its sender can differ from the member whose message the agent answers. The approved requirements do not settle either case.
- **Impact if no action:** An implementer must add an unapproved refusal or guess a member. A wrong list can steer rename, move, or archive to another member's workspaces. An admin's archive can then succeed for a member who did not ask.
- **Root question:** How does an agent list the workspaces of the member whose message it answers, or of another member, with only the workspace token?
- **Shared assumptions:**
  - An unfiltered list needs only the workspace token. The existing agent-tools requirement and decision 257 settle this. Kept.
  - Every member already sees each workspace of the org. The filter changes the answer, not access. The existing agent-tools requirement settles this. Kept.
  - The filter matches the workspace owner. The approved design says "owns", and the archive right also uses the owner. Kept.
- **Options:**
  - **A.** Keep mine for the calling turn's sender. Require an active turn for this filter alone. Without one, return HTTP 403 `calling_turn_required`. Other reads keep their token-only rule. A message that joins a turn gets the workspaces of that turn's first sender. Effort: Small.
  - **B.** Make mine give the workspaces of the calling workspace's owner. The token names that member, so no turn is needed. Conductor also resolves mine against its token owner. Another member's turn still gets the owner's workspaces. Effort: Small.
  - **C.** Drop mine and keep the explicit owner filter. Tell agents to name the member whose message they answer, rather than infer one from the turn or token. Decision 283 gives the member key. Reads keep needing only the workspace token. Effort: Small.
  - **D.** Use the sender with an active turn, else the calling workspace's owner. Name the selected member in the reply. No call refuses, but mine has two meanings and the reply needs a new field. Effort: Medium.
  - **E.** Keep mine for the sender of the newest message of the calling turn, rather than its first sender. Require an active turn, as A does. A member who joins usually gets their own workspaces. A newer message can change the member before the agent reads it. A call that still answers an earlier message can then name the wrong member. Writes still act for the first sender. Effort: Medium. Added by the options check.
- **Left out:**
  - Ignoring mine without a turn, or returning an empty list, gives a misleading answer.
  - Inferring a sender from the workspace's running turns is worse than A. Parallel sessions can have different senders, and the tools already send their turn ID.
  - Passing a sender from the runner adds a runner change without resolving a call from a terminal.
  - Requiring an active turn for every read breaks the unchanged token-only read requirement.
  - Listing workspaces that the calling workspace created answers which work it delegated, rather than which workspaces a member owns.
  - A runner channel that gives the newest sender adds a runner change and a full image build. E gives about the same member without them.
  - Mine for the session starter needs the same turn as A and can name neither the turn sender nor the member who asked.
  - List rows with their owners but no member filter need every page to find one member. C keeps the approved owner filter and shorter answers.
- **Wider fix:** C. Each member filter names its member, so reads need no hidden member identity.
- **Previous examples:** The model list uses the calling workspace owner's default with only the token. Decision 257 rejected an active turn for session reads.
- **Related:** Decision 283 sets the explicit member key for every option. C needs a key that the agent can get for the message it answers.
- **Recommendation:** C. It gives the requested member's workspaces and keeps token-only reads.
- **Action:** ask the user, because C drops an approved filter, while A adds a read refusal and B changes the named member.
- **Chosen:** C, by Cal on 11 November 2026: "282 = C". There is no mine filter. The explicit owner filter follows decision 283 F.

The options check of 11 November 2026 is in
`.context/agent-tools-conductor-parity/reports/decision-282-options.md`.
It kept C and added E. The completion check is in
`.context/agent-tools-conductor-parity/reports/decision-282-completion.md`.
It found a second root question about the member key, now decision 283.
Cal answered both questions on 11 November 2026. The chosen options apply to the remaining milestones.

### 283. How the owner filter identifies a member

Added on 11 November 2026 from the completion check of decision 282.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review, from the options check during implementation.
- **Category:** Docs or spec.
- **Location:** The owner filter in this plan's design, and `docs/protocol/workspace-calls.md`, section "List the workspaces". D and E also change the sender line in `docs/protocol/agent-instructions.md`.
- **Terms:**
  - **Member ID:** the stable user key of a member, `users.id`. Session starter and message sender replies give it.
  - **Stored login:** the GitHub login that the app saved at the member's last sign-in.
  - **Sender line:** the `Sender: Name (@login)` line that starts a message to the agent. It gives no member ID.
- **Background:** Each option of 282 keeps the owner filter. Under 282 C, it also selects the member whose message the agent answers. A stored login can repeat after a GitHub rename, because the app updates it only at sign-in. The sender line gives a login, but no member ID. The runner already receives that ID, so showing it changes no Worker payload.
- **Problem:** A login can identify two members. A member ID is exact, but the agent does not get it from the sender line.
- **Impact if no action:** An implementer must guess the input or add an unapproved refusal. A mixed list can steer a write to another member's workspaces.
- **Root question:** How does an agent give the owner filter one exact member, both its message sender and a member named in words?
- **Shared assumptions:**
  - The filter selects workspace owners. The approved design says "owns". Kept.
  - The lookup stays inside the calling org. The approved reach and token rule settle this. Kept.
  - The filter needs no active turn. The read rule settles this. Kept.
  - The key is the app member ID. Existing sender and starter replies give that key. Kept.
- **Shared part of B, C, E, and G:** A value with a leading `@` names a stored login. Any other value names a member ID. The marker distinguishes the two without inferring an opaque ID's length. This is an agent call of 11 November 2026, from the `@login` form of the sender line.
- **Options:**
  - **A.** Accept only a member ID. An unknown ID gives an empty list. Add no refusal. Finding a member named in words can need one get call for each workspace. The sender line gives no ID. Effort: Small.
  - **B.** Accept a member ID or a stored login without case. No match gives an empty list. More than one org member with the login gives a named refusal. It lists the matching members with IDs and display names, so the agent can select an ID. Include suspended members in this match, even when they own no workspace. This adds a read refusal for an ambiguous login. Effort: Small.
  - **C.** B, but an ambiguous login gives every matching member's workspaces. The reply names each matched member. Add no refusal. An agent can still show or act on a mixed list. Effort: Small.
  - **D.** Accept only a member ID, and put that ID in the sender line too. The agent can identify the member whose message it answers, also after a rename. Add no login lookup or refusal. Finding another member named in words can need one get call for each workspace. This changes one runner function, its tests, and the sender-line requirement. Effort: Medium.
  - **E.** B, and put the member ID in the sender line too. Agents use that ID for the message they answer. They can use the login lookup for another member named in words. The ambiguity refusal of B stays. This changes the sender-line requirement and the runner. Effort: Medium.
  - **F.** D, and each workspace-list row gives its owner's member ID, GitHub login, and display name. Agents find an owner named in words in the rows, then filter by ID. Add no login lookup or refusal. Rows grow, and finding another member can need every page. This also changes the list-row requirement. Effort: Medium. Added by the options check.
  - **G.** E, but an ambiguous login gives each matching member's workspaces and names them, as C does. The sender's own list uses its exact ID. Add no refusal. Another member named by a shared login can still give a mixed list. Effort: Medium. Added by the options check.
  - **H.** A, and each workspace-list row gives its owner, as F does. Keep the sender line. Agents find the sender in the rows by login and name. The sender's own list needs that first read. Equal names and logins can still hide which sender asked. Effort: Small. Added by the options check.
- **Left out:**
  - A login-only filter cannot select one member when stored logins repeat. An ID keeps that selection possible.
  - A live GitHub lookup needs an external call for each read and identifies the current holder, rather than the member of an older sender line.
  - Clearing, marking, or refreshing old logins alone cannot identify an older sender line. A member who does not return can keep an old login.
  - A tool that lists members falls outside the approved Conductor command set.
  - Adding a display name to a login cannot always break a tie. Display names can repeat or be empty.
  - Inferring a login's member from the calling session guesses silently when the login came from other text.
  - An empty list with candidates looks like no workspaces if the agent skips the candidate field.
  - A display-name filter is less exact than a login. F lets the agent choose from the names and IDs instead.
- **Wider fix:** F. Each owner that the agent sees carries an exact ID, so no login lookup or refusal is needed.
- **Previous examples:** Invitations use a verified email because GitHub logins can be renamed and taken, under decision 78. Routine author filters resolve logins to GitHub account IDs.
- **Related:** Decision 282 chooses mine or an explicit member. Its C needs a key that the agent can get for the message it answers.
- **Recommendation:** F, from the options check. It gives an exact sender ID and owner IDs for members named in words, with no lookup refusal. The first recommendation was E.
- **Action:** ask the user, because F changes the sender-line and workspace-list requirements, which no approved decision covers.
- **Chosen:** F, by Cal on 11 November 2026: "283 = F". The owner filter takes only a member ID. The sender line gives the actual message sender's ID, and every workspace-list row gives its owner's ID, GitHub login, and display name. No login lookup or new refusal is added.

The options check of 11 November 2026 is in
`.context/agent-tools-conductor-parity/reports/decision-283-options.md`.
It added F, G, and H and changed the recommendation from E to F.

## Design

Each item below is an agent call of 11 November 2026, unless it names a
decision.

### The new calls

| MCP tool | CLI command | Conductor command | Kind |
| --- | --- | --- | --- |
| `get_workspace` | `conductive workspaces get` | `workspace get`, `workspace status` | read |
| `rename_workspace` | `conductive workspaces rename` | `workspace rename` | write |
| `move_workspace` | `conductive workspaces move` | `workspace move` | write |
| `archive_workspace` | `conductive workspaces archive` | `workspace archive` | write |
| `get_session` | `conductive sessions get` | `session get`, `session status` | read |
| `rename_session` | `conductive sessions rename` | `session rename` | write |
| `close_session` | `conductive sessions close` | `session archive` | write |
| `stop_session` | `conductive sessions stop` | `session cancel` | write |
| `get_message` | `conductive messages get` | `message get` | read |
| `create_section` | `conductive sections create` | `section create` | write |
| `delete_section` | `conductive sections delete` | `section delete` | write |
| `list_previews` | `conductive previews list` | `preview get` | read |
| `open_preview` | `conductive previews open` | `preview set` | write |
| `close_preview` | `conductive previews close` | `preview delete` | write |

- Decision 278 A: the names follow our pattern, a verb and a noun for MCP,
  and `conductive <nouns> <verb>` for the CLI.
- Agent call: both the MCP server and the CLI get each call. Reason: the
  protocol keeps both tools equal.
- Agent call: a write call needs a running agent turn. A read call needs
  only the workspace token. Reason: the existing calls split in the same
  way.
- Agent call: each call reaches every workspace of the org, as decision
  257 D gives the session calls. Reason: one reach for all calls. Cal
  kept it for the archive and the section delete with decision 277 A.
- Agent call: each call acts for the sender and follows the app's rule for
  its action. Every member can rename and move a workspace, rename, close,
  and stop a session, manage the sections, and open and close previews.
  Only the owner of a workspace or an admin can archive it (decision 42).
  Reason: the session calls follow the sender today.
- Agent call: the routes nest under `/v1/tools/`, beside the existing
  calls, and each new route is a fixed path. Reason: the token gate of
  the machine host keeps one list of routes.

### Options on the existing calls

- Agent call: `list_workspaces` takes optional filters: the workspaces
  of an owner by member ID, a state, a repository, a part of the name,
  the newest activity after a date, and archived or not. Decision 282 C
  removes mine. Reason: reads must name the member without an active turn.
- Decision 283 F: the sender line gives the actual message sender's member
  ID. Each workspace-list row gives its owner's member ID, GitHub login,
  and display name. The filter takes the ID, with no login lookup.
  Agents use the sender ID for that sender's workspaces and the row fields
  to identify another owner. Writes still act for the calling turn's sender.
- Agent call: `list_workspaces` and `list_sessions` take an optional limit
  of 1 to 100 and an offset. A reply with a limit says whether more
  entries follow. Without these options, a list returns every entry, as
  today. Reason: existing callers keep working.
- Agent call: `create_workspace` takes an optional title of its first
  session, with the name rule of the session calls. Reason: Conductor's
  `--session-name`.
- Agent call: the CLI takes the text of a message from a file, or from
  stdin with `-`, for each call that takes a message. Reason: Conductor's
  `--message-file`. The MCP server takes text only.

### Workspaces

- Decision 281 C: `create_workspace` gets no base branch in this plan.
- Agent call: `create_workspace` takes an optional request ID, as the
  session writes do. A repeat with the same ID returns the first result.
  Reason: today each retry after a lost reply makes another workspace.
- Agent call: the new title option of the first session does not settle
  `plans/follow-ups/agent-named-workspace-first-session.md`. That item
  stays open for a create without the option.
- Agent call: `get_workspace` gives the fields of a `list_workspaces` row,
  and the owner, the repository, the base branch, the section, the
  created and newest activity times, and the archive and restore times.
  Reason: `workspace get` and `workspace status` give one workspace.
- Agent call: `rename_workspace` gives a name that a member gave, with the
  name rule of `create_workspace`. So no automatic name replaces it.
  Reason: a rename in the app does the same.
- Agent call: `move_workspace` moves a workspace to the top of a section,
  as Move to section does.
- Agent call: `archive_workspace` makes the same write as Archive in the
  app, with no question and no check. An agent can archive the calling
  workspace. That archive ends its own turn, and a member can restore the
  workspace for 14 days. Reason: Conductor's archive takes the current
  workspace by default.

### Sessions and messages

- Agent call: `get_session` gives the fields of a `list_sessions` row for
  one session. Reason: `session get` and `session status` give one
  session.
- Agent call: `rename_session` gives the title that a member gave, with
  the name rule of the session calls.
- Agent call: `close_session` takes whether to stop a running turn, as the
  close route of the app does. Without it, a session with a running turn
  refuses the close with the existing error.
- Agent call: `stop_session` stops the running turn of a session. A
  session without a running turn gives a reply that says so, and no error.
  Reason: the agent may not know whether the turn already ended.
- Decision 279 B: a stop by a tool, also through `close_session`, stores
  the sending session. The stop line names that session with a session
  chip, such as "Stopped from" and the chip. The copy of a transcript
  gives the session link in that line. The mockups set the words.
- Agent call: `get_message` gives the ID, the session, the sender, the
  text, the state, the turn, and the time of one message. Reason:
  `message get` gives one message.

### Sections

- Agent call: `create_section` and `delete_section` change the sections
  of the org, as every member can in the app. A delete moves the
  workspaces of the section to General, and the default section cannot be
  deleted. Reason: Conductive's sections belong to the org.

### Previews

- Agent call: `open_preview` opens a preview of a port of a workspace, as a
  member does in the app, and gives its link. The link needs a sign-in.
  `list_previews` gives the open previews of a workspace, and
  `close_preview` closes one. Reason: Conductor's `preview set`, `get`,
  and `delete`.
- Agent call: `open_preview` opens only a preview that needs a sign-in. A
  preview without a sign-in stays a member's choice. Reason: sandbox code
  must not make its own server public. The workspace "Port Preview
  Authentication Toggle" owns that toggle.

### Images

- Agent call: a cloud computer gets the new tools and instructions only
  from an org image that a full build made after the deploy. The follow-up
  item `plans/follow-ups/full-image-build-for-agent-tools.md` gets the new
  commands. Reason: a refresh keeps the tools of its image.

### Stop line mockups

These calls came from Milestone 1 on 11 November 2026:

- Agent call: use exactly "Stopped from" and the sending session chip in
  the chat. Use the same words and its link in the copy. Reason: a session
  title can read as a command, so putting the chip first makes the line
  hard to read.
- Agent call: reuse one stop-line component and one copy source for each
  stop. Keep member and unnamed stop words. Reason: the app, the copy, and
  the mockups must keep the same words. The line uses the line height of
  the lost lines, so the chip fits.
- Agent call: put the two states under `app/chat/agent-stops`. Reason:
  `app/chat/turns` already has four screens, so two more pass its limit.
- Agent call: show the stopping session still at work in both stories.
  Reason: stopping another turn does not stop that session. The chip and
  sidebar keep the live state of its workspace.
- Agent call: reuse the existing session-chip target and fallbacks.
  Reason: the line has the same session link as a message. A closed source
  opens its workspace without reopening the tab.
- Agent call: use an angle-bracket link in the Markdown stop note.
  Reason: emphasis must not split a session link whose IDs contain `_`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Completed: 11 November 2026.

Draw the stop line of a stop by an agent (decision 279 B).

- [x] Read the `mockups` and `product-ui` skills and
      `docs/mockups/README.md`.
- [x] In `app/chat`, draw the stop line of a turn that an agent stopped,
      with the session chip of the sending session. Draw it for a session
      of the same workspace and of another workspace, on desktop and on a
      phone.
- [x] Set the words of the line with the copy rules of the `product-ui`
      skill.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

Evidence: `.context/agent-tools-conductor-parity/reports/m1-ui.md` and
`.context/agent-tools-conductor-parity/m1-final-checks.log`.

## Milestone 2: Documentation and protocol

Depends on: 1

Completed: 11 November 2026.

Cal chose 282 C and 283 F. The protocol and public restatements apply those
choices. The backend work starts from this contract.

State the requirements and the decisions of the new calls. Read the
`documentation` skill first.

- [x] Update `docs/protocol/agent-tools.md`: the list and the count of the
      calls, the reach, the token and turn rules, the first session title,
      the request ID of a create, and
      the workspace, section, and preview calls.
- [x] State the independent workspace list filters and paging.
- [x] Apply decisions 282 and 283 to mine, the explicit owner filter,
      list-row fields, and the sender line. Keep unchosen behavior absent.
- [x] Update `docs/protocol/session-calls.md`: the get, rename, close, and
      stop calls, and the get of a message.
- [x] Update `docs/protocol/messages-and-attachments.md` and
      `docs/protocol/session-transcripts.md`: the stop line of a stop by an
      agent (decision 279 B).
- [x] Update `docs/protocol/tokens-and-secrets.md`: the calls that the
      workspace token allows.
- [x] Update `docs/protocol/isolation.md` and the open risks of
      `docs/protocol/routines.md`: any process with the token can also
      read one workspace, session, or message. While a turn of its
      workspace runs, it can also rename, move, and archive workspaces,
      close and stop sessions, change the sections, and open previews in
      the whole org, with the rights of the sender.
- [x] Update `docs/protocol/agent-instructions.md`: what the workspace
      tools can do.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates a changed fact.
- [x] Give the changed Terms a new revision under the existing consent
      requirement. Run the existing consent tests.
- [x] Read each guide under `src/marketing/docs/` in full, with
      `docs/protocol/website-docs.md`. Update each sentence that restates a
      changed fact, such as the list of what agents can reach in
      `security.md`.
- [x] Update each row under `src/marketing/from-conductor/areas/` whose
      feature this change ships, as
      `docs/protocol/conductor-comparison.md#statuses` says.
- [x] Check each relative link of each changed Markdown file.


Evidence: `.context/agent-tools-conductor-parity/reports/m2-internal-docs.md`,
`.context/agent-tools-conductor-parity/reports/m2-external-docs.md`, and
`.context/agent-tools-conductor-parity/checks/m2-consent-auth-tests.log`.
Completion: `.context/agent-tools-conductor-parity/reports/m2-complete.md` and
`.context/agent-tools-conductor-parity/reports/m2-public-complete.md`.

## Milestone 3: Workspace calls

Depends on: 2

Completed: 11 November 2026.

Add the workspace calls and the options of `list_workspaces` and
`create_workspace` to the Worker. Read the `typescript` and `testing`
skills first.

- [x] Add the routes and the request and reply types to
      `src/shared/agent-tools.ts`, in new files where a file would pass 200
      lines.
- [x] Add `get_workspace`, `rename_workspace`, `move_workspace`, and
      `archive_workspace` to `worker/tools/`. Reuse the app's rename,
      move, and archive code with the sender as the user. Give
      `archive_workspace` the reach of the org (decision 277 A).
- [x] Add the filters and the paging of `list_workspaces`, with no change
      to a call without options.
- [x] Apply decision 283 to the owner filter and list-row owner fields.
      Add only the fields that the chosen option needs.
- [x] Add the first session title and the optional request ID to
      `create_workspace`.
- [x] Add tests beside the code: the archive rights of the sender, an
      archive of the calling workspace, a rename that no automatic name
      replaces, a move to the top of a section, each filter, the paging
      edges, a first session title, and a repeat with a request ID.
- [x] Update `worker/tools/README.md`.


Evidence: `.context/agent-tools-conductor-parity/reports/m3-workspaces.md`
and `.context/agent-tools-conductor-parity/checks/m3-orchestrator-tests.log`.

README evidence: `.context/agent-tools-conductor-parity/reports/m3-readmes.md`.

## Milestone 4: Session and message calls

Depends on: 3

Completed: 11 November 2026.

Add the session and message calls, and the stored session of a stop by an
agent.

- [x] Add `get_session`, `rename_session`, `close_session`, `stop_session`,
      and `get_message` to `worker/tools/`. Reuse the session routes of
      `worker/chat` without a browser context.
- [x] Add the approved limit and offset paging to `list_sessions`. Keep a
      call without options unchanged, including closed sessions.
- [x] Let a close that stops a running turn record the member, so the stop
      line names that member, as decision 72 says for Stop. Today such a
      close records no stopper, and the line says "The agent stopped".
- [x] Store the sending workspace and session IDs on a stop by a tool, also through
      `close_session`. Give it to the words in
      `src/shared/transcript/turn-words.ts`, for the chat and the copy of a
      transcript.
- [x] Add tests beside the code: each call for a session of another
      workspace, a close of a running session with and without the stop, a
      stop of an idle session, the stored sending session, the stop line
      in the copy, and a message of another workspace.
- [x] Update `worker/tools/README.md` and `worker/chat/README.md`.

Evidence: `.context/agent-tools-conductor-parity/reports/m4-sessions.md`
and `.context/agent-tools-conductor-parity/checks/m4-orchestrator-tests.log`.

README evidence: `.context/agent-tools-conductor-parity/reports/m4-readmes.md`.
Main integration notes: `.context/agent-tools-conductor-parity/merge-m4-docs-notes.md`.

## Milestone 5: Section and preview calls

Depends on: 4

Completed: 11 November 2026.

- [x] Add `create_section` and `delete_section`. Reuse the section writes
      of `worker/app-api/feature-sections.ts` with the sender as the user.
- [x] Add `list_previews`, `open_preview`, and `close_preview`. Reuse the
      preview handler of `worker/previews/` with the sender as the user,
      for previews that need a sign-in.
- [x] Add tests beside the code: a delete of the default section, the
      move of workspaces to General, a preview of a workspace whose owner
      is suspended, and a preview link that needs a sign-in.
- [x] Update `worker/tools/README.md` and `worker/previews/README.md`.

Evidence: `.context/agent-tools-conductor-parity/reports/m5-sections-previews.md`
and `.context/agent-tools-conductor-parity/checks/m5-orchestrator-tests.log`.

README evidence: `.context/agent-tools-conductor-parity/reports/m5-readmes.md`.

## Milestone 6: CLI, MCP commands, and agent instructions

Depends on: 3, 4, 5

- [ ] Add each new call to the CLI and the MCP server under `tools/`, in
      new files where a file would pass 200 lines.
- [ ] Add the options of the existing calls, and the message file and
      stdin of the CLI.
- [ ] Write the tool descriptions and the CLI help: the reach, the token
      and turn rules, the rights of the sender, and the links.
- [ ] Update the workspace tools line of `runner/src/instructions.ts` and
      its tests.
- [ ] Apply decision 283 to owner-selection instructions and, when the
      chosen option needs it, the sender line and its provider tests.
- [ ] Add CLI and MCP tests in `worker/tools/` against the handler.
- [ ] Update `tools/README.md` and `runner/agent-tools.md`.
- [ ] Add the new commands to
      `plans/follow-ups/full-image-build-for-agent-tools.md`.

## Milestone 7: The stop line in the app

Tags: ui

Depends on: 1, 2, 4

- [ ] Read the `product-ui` and `typescript` skills.
- [ ] Show the stop line of a stop by an agent with the session chip, as
      the mockups draw, on desktop and on a phone.
- [ ] Add tests beside the code for the line.
- [ ] Update `src/chat/README.md` where it describes the changed code.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Update the `agent-workspace-controls` comparison row from Planned to
      Available after Milestones 3 to 7 implement the calls. Follow the claim
      rules and keep features outside this plan under consideration.
- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
- [ ] Smoke-test the stop line in the app of `npm run dev`.
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

- [ ] In a deployed workspace with a fresh org image, let an agent use
      each new call once: get, rename, move, and archive a workspace, get,
      rename, stop, and close a session, get a message, create and delete
      a section, and open, list, and close a preview. Check the stop line
      in the app.
