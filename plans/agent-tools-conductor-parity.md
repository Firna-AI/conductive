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
Cal answered every decision of this plan on 11 November 2026.
Cal approved the plan on 11 November 2026, in the words "impl all plan
milestones". A `default orchestrator` session in this workspace runs the
milestones by delegation.

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
  that the sender owns, an owner, a state, a repository, a part of the
  name, the newest activity after a date, and archived or not. Reason:
  Conductor's `workspace list` filters in the same way.
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

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the stop line of a stop by an agent (decision 279 B).

- [ ] Read the `mockups` and `product-ui` skills and
      `docs/mockups/README.md`.
- [ ] In `app/chat`, draw the stop line of a turn that an agent stopped,
      with the session chip of the sending session. Draw it for a session
      of the same workspace and of another workspace, on desktop and on a
      phone.
- [ ] Set the words of the line with the copy rules of the `product-ui`
      skill.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of the new calls. Read the
`documentation` skill first.

- [ ] Update `docs/protocol/agent-tools.md`: the list and the count of the
      calls, the reach, the token and turn rules, the list filters and
      paging, the first session title, the request ID of a create, and
      the workspace, section, and preview calls.
- [ ] Update `docs/protocol/session-calls.md`: the get, rename, close, and
      stop calls, and the get of a message.
- [ ] Update `docs/protocol/messages-and-attachments.md` and
      `docs/protocol/session-transcripts.md`: the stop line of a stop by an
      agent (decision 279 B).
- [ ] Update `docs/protocol/tokens-and-secrets.md`: the calls that the
      workspace token allows.
- [ ] Update `docs/protocol/isolation.md` and the open risks of
      `docs/protocol/routines.md`: any process with the token can also
      read one workspace, session, or message. While a turn of its
      workspace runs, it can also rename, move, and archive workspaces,
      close and stop sessions, change the sections, and open previews in
      the whole org, with the rights of the sender.
- [ ] Update `docs/protocol/agent-instructions.md`: what the workspace
      tools can do.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates a changed fact.
- [ ] Read each guide under `src/marketing/docs/` in full, with
      `docs/protocol/website-docs.md`. Update each sentence that restates a
      changed fact, such as the list of what agents can reach in
      `security.md`.
- [ ] Update each row under `src/marketing/from-conductor/areas/` whose
      feature this change ships, as
      `docs/protocol/conductor-comparison.md#statuses` says.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Workspace calls

Depends on: 2

Add the workspace calls and the options of `list_workspaces` and
`create_workspace` to the Worker. Read the `typescript` and `testing`
skills first.

- [ ] Add the routes and the request and reply types to
      `src/shared/agent-tools.ts`, in new files where a file would pass 200
      lines.
- [ ] Add `get_workspace`, `rename_workspace`, `move_workspace`, and
      `archive_workspace` to `worker/tools/`. Reuse the app's rename,
      move, and archive code with the sender as the user. Give
      `archive_workspace` the reach of the org (decision 277 A).
- [ ] Add the filters and the paging of `list_workspaces`, with no change
      to a call without options.
- [ ] Add the first session title and the optional request ID to
      `create_workspace`.
- [ ] Add tests beside the code: the archive rights of the sender, an
      archive of the calling workspace, a rename that no automatic name
      replaces, a move to the top of a section, each filter, the paging
      edges, a first session title, and a repeat with a request ID.
- [ ] Update `worker/tools/README.md`.

## Milestone 4: Session and message calls

Depends on: 3

Add the session and message calls, and the stored session of a stop by an
agent.

- [ ] Add `get_session`, `rename_session`, `close_session`, `stop_session`,
      and `get_message` to `worker/tools/`. Reuse the session routes of
      `worker/chat` without a browser context.
- [ ] Let a close that stops a running turn record the member, so the stop
      line names that member, as decision 72 says for Stop. Today such a
      close records no stopper, and the line says "The agent stopped".
- [ ] Store the sending session on a stop by a tool, also through
      `close_session`. Give it to the words in
      `src/shared/transcript/turn-words.ts`, for the chat and the copy of a
      transcript.
- [ ] Add tests beside the code: each call for a session of another
      workspace, a close of a running session with and without the stop, a
      stop of an idle session, the stored sending session, the stop line
      in the copy, and a message of another workspace.
- [ ] Update `worker/tools/README.md` and `worker/chat/README.md`.

## Milestone 5: Section and preview calls

Depends on: 4

- [ ] Add `create_section` and `delete_section`. Reuse the section writes
      of `worker/app-api/feature-sections.ts` with the sender as the user.
- [ ] Add `list_previews`, `open_preview`, and `close_preview`. Reuse the
      preview handler of `worker/previews/` with the sender as the user,
      for previews that need a sign-in.
- [ ] Add tests beside the code: a delete of the default section, the
      move of workspaces to General, a preview of a workspace whose owner
      is suspended, and a preview link that needs a sign-in.
- [ ] Update `worker/tools/README.md` and `worker/previews/README.md`.

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
