# Name a new workspace from its first message

Status: Active. On branch `calummoore/chat-title-rename`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A new workspace starts with a city name, such as `delft`.
[Messages](../docs/protocol/chat-and-events.md#messages) says that the app
then asks the agent for a title of three to five words, and that the
workspace takes the title as its name. The Worker, the web app, and the
agent runner already carry that title as the `workspace.title` runner
event. But no code asks the agent for a title, so every workspace keeps its
city name. On 8 November 2026 the user showed the workspace `delft`, still
with its city name after 22 minutes, and wrote: "should rename based on the
first message".

With the options that the user chose on 8 November 2026, this change makes
the agent runner ask the agent of the first turn for a title, from the text
of the first message. The runner sends the title as `workspace.title`, and
the Worker renames the workspace as it does now. The first session tab
takes the title too. Each later session tab takes the first line of its own
first message. The change does not rename branches.
It does not rename the workspaces that exist now, because each sandbox
keeps the runner of the org image that it started from. A new runner
archive and a new build of each org image bring the change to new
workspaces.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#messages).
- The [agent runner README](../runner/README.md) and its
  [Agent logins](../runner/agent-logins.md) page.
- The [Worker chat README](../worker/chat/README.md) and the
  [chat README](../src/chat/README.md).

## Terms

- **Agent runner:** the program of Conductive in each sandbox. It runs the
  agents and sends numbered events to the Worker.
- **Turn:** one run of the agent on a message, from its start to its end.
  Each turn brings the agent login of the member who started its session.
- **Title request:** the hidden request that asks the agent for a name for
  the workspace.
- **`workspace.title`:** the runner event that carries a new workspace
  name. The Worker stores it, renames the workspace, and sends the new name
  to each open tab.
- **Org image:** the prepared cloud computer image of an org. Each new
  workspace starts from it, with the runner that the image holds.

## Design

Each call below is an agent call of 8 November 2026. The calls follow the
user's choices for decisions 142 and 143. The calls about decision 144
assume its recommended option, and wait for its answer.

- The runner starts the title request. Reason: the runner already holds
  the agent programs, the login of the turn, and the saved
  `workspace.title` report. The Worker already stores the event and renames
  the workspace. A new Worker command was rejected, because an old runner
  cannot read it, and the Worker would have to send it again after each
  reconnect. This call replaces the agent call of 5 November 2026 in the
  Boat-native remote workspaces plan, which said that the Worker asks.
- The title request is a separate conversation with the agent of the turn.
  It runs on the login of the turn, through the same login route as the
  turn. It gets only the text of the first message, cut to its first 4,000
  characters, and no attachments. It has no MCP servers, no project
  settings, and no saved history. Reason: a title needs only the request.
- Claude runs the request with no tools. Codex runs it in an ephemeral,
  read-only thread, with its shell tool turned off through its feature
  flag. Reason: the request then cannot change the files of the workspace.
- The internal title request of the `claude` program was rejected. The
  SDK does not declare it, so an SDK update can change or remove it, and
  Codex needs its own request anyway.
- Claude answers with the model of the turn and with thinking off. Codex
  answers with the model and the effort of the turn, because the runner
  does not know which efforts each Codex model accepts. Reason: a login can
  always use the model of its turn. A fixed small model was rejected,
  because a login can lack access to it, and its ID goes stale. The input
  is short, so the request costs little next to the turn.
- The runner keeps the text of the first message in memory until a title
  request succeeds. A retry at a later turn uses that text. After a runner
  restart, the text is gone, and a retry uses the message of its own turn.
  Reason: the state file of the runner holds no message text, and a
  retry after a restart is rare.
- The runner keeps the first line of the answer. It removes quotes,
  Markdown marks, and a final full stop. It cuts the result to at most 60
  characters, at a word boundary. An empty result counts as a failed
  request. Reason: the workspace list shows one short line.
- A title request has a time limit of 60 seconds. A runner shutdown stops
  it. A failed or stopped request writes one local warning and sends no
  event. Reason: a hidden request must not keep an agent process, or a
  login, after it can help.
- At most one title request runs at a time. The runner asks only while it
  has no saved `workspace.title`. Reason: the saved report tells a titled
  workspace from a new one, also after a restart.
- The Worker gives the first session its name at the create, and renames
  it when it stores the title. Reason: one rule in the Worker serves every
  client.
- The workspace and its first session take the title through one rule:
  each takes the title only while it still has the first name of the
  workspace. Reason: decision 143 chose this rule for the first session,
  and decision 144 recommends it for the workspace.
- A later session takes the first line of its own first message as its
  title, when the Worker accepts that message. A name that a member gave
  the session before stays. Reason: the user wrote "other sessions take the
  first message" with decision 143, and the tab shows one short line. A
  title request for each session was rejected, because the user chose C,
  not E, and the first message needs no model call.
- The title of a later session follows one exact rule, which the mockups
  and the Worker share:
  - Take the first line with text, so leading blank lines do not count.
  - Make each run of spaces one space, and remove one final full stop, as
    the workspace title does. An ellipsis stays.
  - Count Unicode code points, so a cut never splits a character. A line
    over 60 code points ends at its last space within the limit. A word
    over the limit ends at the limit. No ellipsis marks the cut.
  - Keep Markdown marks and quotes, because they are the words of the
    member.
  - Reason: the mockups of 8 November 2026 needed these cases settled, and
    one rule keeps the mockups and the Worker alike.
- A session whose first message has no text, such as a message with only a
  screenshot, keeps "New session". The next message with text then gives
  its title. Reason: a message with no text gives no name, and many
  "New session" rows in the session history would read as an action and
  look alike. The mockup check of 8 November 2026 found this case.
- A later session is each session other than the first session of the
  workspace: a session that "+" opens, a session that a model of the other
  agent opens, and a linked session that a message of another member
  opens. Reason: the user named only the first session and "other
  sessions".

## Decisions

Options check reports: `.context/workspace-title-from-first-message/`.

### 142. New workspaces keep their city name

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `runner/src/runner.ts`, which never sends
  `workspace.title`. The rule is at `docs/protocol/chat-and-events.md:180`.
- **Background:** The protocol says that after the first answer of the
  agent in a new workspace, the app asks the agent for a title of three to
  five words. The workspace then takes the title as its name. The Worker
  and the web app handle `workspace.title`, and the runner can store and
  send it again. Only tests and the development page send that event.
- **Problem:** No code asks the agent for a title. The fix must also choose
  when to ask. A title from the first message needs no answer from the
  agent. But Codex, and Claude when it starts with tools, can write the
  first answer only at the end of a long turn.
- **Impact if no action:** Every workspace keeps its city name. Users
  cannot tell their workspaces apart in the list.
- **Root question:** When, and from what, does a new workspace get its
  name?
- **Options:**
  - **A.** The runner asks the agent after its first answer, as the
    protocol says now. The title comes from the first message. The
    protocol keeps its rule. The name can wait until the first turn ends.
    Effort: Medium.
  - **B.** The runner asks the agent when the first turn starts, beside the
    turn. The title comes from the first message. After a failed request,
    the next turn asks again, from the first message while the runner
    still holds it, or else from the message of that turn. The protocol
    changes. The name shows a few seconds after the sandbox is ready, as
    the "First turn" mockup shows. Effort: Medium.
  - **C.** The Worker makes the name from the first words of the first
    message when it accepts the message. It needs no model call and costs
    nothing, and the name shows at once. The names are weaker, such as "Can
    you please fix the". The protocol changes, and so do the "Creating"
    and "Second message" mockups, which show the city name during the
    start. Effort: Small.
  - **D.** C first, then B replaces that name with the agent's title. A
    name shows at once, and a better one follows. The name changes twice,
    and both parts need code. The same mockups as in C change. Effort:
    Medium.
  - **E.** The Worker asks the model service for a title when it accepts
    the first message, before the sandbox starts. The name shows within
    seconds, also in a sandbox with an old runner. The Worker then sends
    member logins to the model services, which is a new path for secrets.
    A Claude subscription token is meant for the `claude` program, so those
    logins would still need B. The same mockups as in C change. Effort:
    Large.
  - **F.** The Worker asks a small model for the title with an API key of
    the operator when it accepts the first message. No member login takes
    a new path, and the name shows during the start, also with an old
    runner. The operator pays for each title and holds a new secret. The
    first message goes to a model provider on the operator's account, so
    the privacy page changes. A Codex workspace sends its message to that
    provider, unless the operator holds a key for each provider. The same
    mockups as in C change. Effort: Large.
  - **G.** After the first answer, the runner asks the agent for the title
    in a copy of the session. Both SDKs can copy a session. The title can
    use what the agent found, which helps when the message is short or
    vague. It waits as A does, and its cost grows with the context of the
    first turn. Effort: Medium.
  - **H.** B, and also a one-time run in the Worker that names each
    workspace that still has its city name, with the rule of C. The Worker
    keeps no text of the first message in its database, so the run reads
    the chat store of each workspace. Its value is low while the project
    is not in production. Effort: Medium.
  - **I.** The runner tells the agent of the first turn to name the
    workspace through a tool that the runner handles itself. No second
    request and no second agent process run. The agent can skip the call
    or make it late. The coding conversation of the member gets an
    instruction that the member did not write, and one more model step.
    The runner must hide the tool call from the chat. Effort: Medium.
- **Left out:**
  - A name that a member types. It fails the goal, because the user asked
    for an automatic name from the first message.
  - A rename tool that uses the workspace token. It breaks the rule that
    the workspace token allows only its four listed uses, in
    [The workspace token](../docs/protocol/access-and-security.md#the-workspace-token).
    Option I keeps the tool inside the runner.
- **Wider fix:** None. This is one missing feature, not a repeated class
  of defect. The Worker sends `start.updated` itself, so no other runner
  event lacks a sender.
- **Previous examples:** The runner README says that the runner has no
  source of new workspace names yet. Milestone 8 of the Boat-native remote
  workspaces plan built only the display of the title.
- **Related:** 143, work that waits for the answer: the first session
  takes the title at the time that this decision chooses. 144, work that
  waits for the answer: the conflict of 144 starts when titles exist.
- **Recommendation:** B. The title needs only the first message, so a wait
  for the answer only delays the name, at times until the whole first turn
  ends. B also runs on the login of the session, with no new path for
  secrets. The options check of 8 November 2026 kept B.
- **Action:** ask the user, because B changes the protocol rule that the
  title request comes after the first answer, and no user decision covers
  that change.
- **Decision:** The user chose B on 8 November 2026.

### 143. The first session tab keeps "New session"

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `worker/chat/sessions.ts:26`.
- **Background:** Each session of a workspace shows as a tab with the title
  of the session. The mockups show the tab of a new workspace with the city
  name, then with the agent's title. The chat README and the development
  page say the same. The Worker names each new session "New session" and
  never renames it. The protocol says only that a user can rename a
  session.
- **Problem:** In the real app, the first session tab keeps "New session"
  after the workspace gets its title.
- **Impact if no action:** Each workspace shows a "New session" tab under a
  named workspace, unlike the mockups. The chat README stays wrong.
- **Root question:** What name does the first session tab of a new
  workspace show?
- **Options:**
  - **A.** Keep "New session". Change the mockups, the chat README, and the
    development page to match. Effort: Small.
  - **B.** The web app shows the workspace name on the first session tab
    while that session has the default title. The Worker does not change.
    The Mac app runs the same web app, so it gets the rule too. The session
    record keeps "New session", so each place that shows a session title,
    such as the session history, must apply the rule. Effort: Small.
  - **C.** The Worker gives the first session the workspace name at the
    create. When the workspace takes the title, the first session takes it
    too, while that session still has the earlier workspace name. A name
    that a member gave the session stays. The protocol gets this rule.
    Effort: Medium.
  - **D.** The Worker keeps "New session" until the title arrives. Then the
    first session takes the title, unless a member renamed it. Before the
    title, the tab differs from the mockups. Effort: Medium.
  - **E.** Every session gets its own title from its own first message. The
    first session then takes the title of decision 142, and each later
    session costs one more title request. Effort: Large.
- **Left out:** Each later session takes the first words of its first
  message, with no model call. For the first session it is the same as C.
  For later sessions, it differs from the linked-session mockup, which
  shows "New session" during the first turn of that session. So C is
  better on every point for this question.
- **Wider fix:** None. One rule in one place covers the case.
- **Previous examples:** None found.
- **Related:** 142, work that waits for the answer: the first session
  takes the title at the time that 142 chooses. 144, shared rule: the
  workspace name follows the same rule as the first session in C.
- **Recommendation:** C. It stores the title that the tab shows in the
  session record, so the tab, the session history, the mockups, and the
  chat README agree. The options check of 8 November 2026 kept C.
- **Action:** ask the user, because the choice decides which side of a
  mismatch between the mockups and the product is right.
- **Decision:** The user chose C on 8 November 2026, and wrote: "first
  session takes the same name as the workspace, other sessions take the
  first message". So each later session takes its own first message as its
  name, as the design above says.

### 144. A title undoes a name from the workspace route

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. The first options check of 8 November 2026 found it.
  A second check of the same day changed the root question and added E
  and F.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/workspace-state-projection.ts:63` and
  `worker/chat/workspace-response.ts:44`.
- **Terms:**
  - **Workspace route:** the Worker route that changes the section, the
    position, or the name of a workspace, in
    `worker/app-api/feature-workspaces.ts`.
  - **Repair write:** the write that sets the newest agent title as the
    workspace name at each change of the workspace state, so that a failed
    title write does not leave the old name.
- **Background:** The workspace route accepts a new workspace name. The
  web app uses the route only to move a workspace, but the Worker reads a
  name, and a Worker test sends one. No screen and no agent tool renames a
  workspace. The repair write sets the title whenever the stored name
  differs from it. Each detail read of a workspace also shows the newest
  title over the stored name, and each open tab takes the name from each
  `workspace.title` event.
- **Problem:** After this change, workspaces get titles. A name that a
  client sets through the workspace route after the title then goes back
  to the title at the next change of the state, such as the end of a turn.
  A detail read and an open tab show the title at once.
- **Impact if no action:** A client of the route that renames a workspace
  sees the name undone a few minutes later. No screen of the app renames a
  workspace today.
- **Root question:** Which name does a workspace keep and show when a
  member names it and the agent also titles it?
- **Options:**
  - **A.** Change nothing. The agent title wins in the stored name, in each
    detail read, and in each open tab. A name from the route goes back to
    the title. This overrides a feature of the route that works on
    `origin/main`, so it needs your approval. Effort: Small.
  - **B.** The title applies only while the workspace still has its first
    name, the city name. The Worker reads that name from the creation
    record of the workspace, which keeps the city. The rule guards the
    title write, the repair write, the detail read, and the open tabs. So
    a name from the route stays, also a name that a client set before the
    title came. The protocol gets this rule, and the rule that a later
    full report replaces the workspace name gets this exception. Effort:
    Medium.
  - **C.** The workspace route stops taking a name, so the title has no
    rival. This removes functionality that is on `origin/main`: the name
    field of the route, its README line, and a Worker test. Effort: Small.
  - **D.** The Worker records when each name was set. It writes the title
    only when the title is newer. A name from the route wins only when it
    is newer than the title. Effort: Medium.
  - **E.** The chat store marks the stored title as written when its
    database write succeeds. The repair write and the detail read apply the
    title only while the mark is missing. A name from the route after the
    title stays. A title still replaces a name that a client set before the
    title came. It needs no migration. The write and the mark are not
    stored together, so a rename during a failed write can still be lost.
    Effort: Medium.
  - **F.** The workspace row gets a mark that a member set the name. The
    route sets the mark with the name. Each title write, the repair write,
    and the detail read skip a marked workspace. A later agent title still
    replaces an earlier one. It needs a database migration, and each later
    writer of a member name must set the mark. Effort: Medium.
- **Left out:**
  - Separate stored names for the member and the agent, with the shown name
    made at each read. F is better on every point, because the readers of
    the name stay as they are.
  - Removal of the repair write and of the title in the detail read, so
    that a title applies only once. It breaks the rule that the workspace
    takes the title as its name when the first write fails, and it deletes
    functionality on `origin/main`.
- **Wider fix:** B. It uses the same rule as the first session in
  decision 143, so one helper guards both names. It prevents the class
  only when it also guards the detail read and the open tabs.
- **Previous examples:** None found. The follow-up item that added the
  repair write did not consider a name from the workspace route.
- **Related:** 143, shared rule: the first session takes the title only
  while it still has the earlier workspace name. 142, work that waits for
  the answer: the conflict starts when titles exist.
- **Recommendation:** B. It keeps each name that a member sets, in one
  database write with no race and no migration, and it matches the rule of
  the first session. When the app will never rename a workspace, C is the
  smaller change. Both checks of 8 November 2026 kept B.
- **Action:** ask the user, because B adds a rule at the boundary that no
  requirement covers, and A and C each override or remove a feature of the
  route on `origin/main`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Each later session tab shows the first line of its own first message, as
the user chose with decision 143. The first session tab already shows the
workspace name and then the title, so it does not change.

- [x] Show the first line of the first message, cut to 60 characters, on
      each later session tab that has a first message, such as the second
      session of the open workspace and the linked session. A session
      with no message keeps "New session".
- [x] Change the comment of `generatedName` in
      `docs/mockups/src/fixtures/workspaces.ts`, so that it no longer says
      that the first answer names the workspace.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [x] Make `src/chat/components/ReadOnlyChat.dom.test.tsx` read the title
      of the second session from the fixture, because the fixture title
      changed.
- [x] Say in the fixture that a member renamed the first session of the
      open workspace, so its tab differs from the workspace name.
- [x] Capture the site pictures again with `npm run marketing:pictures`,
      because the hero and agents pictures show a later session tab.

Evidence: `.context/workspace-title-from-first-message/reports/m1-mockups.md`,
`mockups-check.log`, `marketing-pictures.log`, and the screenshots in
`mockups/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of decisions 142, 143, and 144, as the
user chose them.

- [ ] In [Messages](../docs/protocol/chat-and-events.md#messages), state
      when the app asks for the title, from what, on which login, and what
      a failed request does (decision 142).
- [ ] In [Sessions](../docs/protocol/chat-and-events.md#sessions), state
      the name of the first session tab and when it takes the title, and
      the name of each later session tab (decision 143).
- [ ] Waits for decision 144. In the same doc, state which name a
      workspace keeps when a member names it and the agent also titles it.
      Give the rule in
      [Lost workspace updates](../docs/protocol/chat-and-events.md#lost-workspace-updates),
      that a later full report replaces the workspace name, the same
      exception.

## Milestone 3: The title request in the runner

Depends on: 2

The runner asks the agent of the first turn for a title, and sends it as
`workspace.title`, as the design above says.

- [ ] Add the title request for Claude, through the Claude Agent SDK and
      the login route of the `claude` program.
- [ ] Add the title request for Codex, through the Codex App Server and its
      login request. Share the start of the App Server with the Codex
      agent. Confirm in the pinned Codex version that the title thread has
      no tool that runs a command.
- [ ] Start one title request when a turn starts and the runner has no
      saved title. Clean the answer, and send it through the output filter
      as `workspace.title`.
- [ ] Stop the title request at its time limit and at a runner shutdown.
- [ ] Add runner tests with the fake SDK and the fake App Server:
  - [ ] The first turn of each agent sends one `workspace.title` with the
        cleaned answer. The request gets the text of the first message,
        the model of the turn, and the login of the turn.
  - [ ] A runner with a saved title starts no title request at the next
        turn.
  - [ ] A failed request sends no event, and the next turn asks again.
  - [ ] A shutdown during a request closes its agent process and sends no
        event.
- [ ] Update the [agent runner README](../runner/README.md) and
      [Agent logins](../runner/agent-logins.md).

## Milestone 4: Session and workspace names in the Worker

Depends on: 2

- [ ] Give the first session of a new workspace the workspace name.
- [ ] When the Worker stores the first `workspace.title`, rename the first
      session to the title while it still has the earlier workspace name.
      Send `session.updated` to each open tab.
- [ ] When a later session accepts its first message, give it the first
      line of that message as its title, while it still has the default
      title. Send `session.updated` to each open tab.
- [ ] Add Worker tests: the title renames the first session, a session
      that a member renamed keeps its name, and a later session takes its
      first message.
- [ ] Waits for decision 144. Apply the title to the workspace only while
      the workspace still has its city name, which the creation record
      keeps. Guard the title write, the repair write, and the detail read.
- [ ] Waits for decision 144. After each stored title, send the workspace
      record with the name that the Worker kept to each open tab.
- [ ] Waits for decision 144. Add a Worker test: a name from the workspace
      route stays after the title and after the next change of the state.
- [ ] Update the [Worker chat README](../worker/chat/README.md).

## Milestone 5: The web app

Tags: ui

Depends on: 1, 2, 4

- [ ] Make the development page write the title when the first turn
      starts (decision 142), and give each later session its first message
      as its title (decision 143). Update the
      [chat README](../src/chat/README.md).
- [ ] Waits for decision 144. Make open tabs take the workspace name from
      the workspace record, not from the `workspace.title` event, so that
      a title that the Worker skips never shows. Add a test for a skipped
      title.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the runner tests, the targeted Worker tests, and the complete
      gate `npm run check`.
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

- [ ] Publish a new runner archive, set its Worker variables, and build
      each org image again. Then create one workspace with Claude and one
      with Codex. Check that each takes a name from its first message soon
      after its sandbox is ready.
