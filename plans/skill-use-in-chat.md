# Show each skill use in the chat

Status: Active. On branch `calummoore/skill-usage-indicator`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

When an agent loads a skill, the chat shows only a generic tool line. A
Claude skill use shows as "Used Skill" with the general tool icon, because
the agent runner keeps only the tool name. A Codex skill use shows only as
a command that reads a `SKILL.md` file. Conductor shows a row such as
"Brainstorming · Skill activated". This change shows each skill use of
both agents as a skill line with the skill name. Each fold line that holds
a skill line also names the skill (decisions 277 and 278). The skill line
reads "Using skill" while its call runs, and "Used skill" after it
(decision 279).

The change does not cover these parts:

- the skills that a subagent loads
- a menu of skills in the message box, and slash commands
- the folders that Codex loads skills from

Events stored before the change keep their current line. The design calls
below give the reasons.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- The [chat README](../src/chat/README.md) and its
  [transcript rules](../src/chat/transcript.md).
- The [runner README](../runner/README.md).
- The [shared contracts README](../src/shared/README.md).

## Terms

- **Skill:** a folder with a `SKILL.md` file of instructions that an agent
  loads when a task needs them.
- **Skill line:** the chat line of one skill use: a skill icon, words that
  say that the agent loaded a skill, and the skill name.
- **Fold line:** the line of a run of tool calls, such as "3 tool calls".
  The one line that holds the work of an ended turn, such as
  "8 tool calls, 7 messages", is a fold line too.
- **Skill list:** the answer of the Codex App Server to `skills/list`: each
  loaded skill with its name and the path of its `SKILL.md` file.
- **Real path:** the path of a file after each link in it resolves.
- **Old Mac app copy:** a copy of the Mac app that has not updated yet. It
  runs the web app of its own version against the current Worker.

## Decisions

The options check of 11 November 2026 ran over decisions 277 and 278. It
kept B for both. Its report and the checks of its claims are in
`.context/skill-use-in-chat/options-check.md`.

### Decision 277. How a member sees which skill the agent uses

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/tool.ts:4`,
  `src/chat/components/ToolGroup.tsx:42`
- **Background:** Claude loads the skills in the repository's
  `.claude/skills/` folder. It uses a skill through its `Skill` tool, and
  the tool input names the skill. The runner keeps only the tool name, so
  the line reads "Used Skill". A line inside a folded run is hidden, and
  decision 150 folds all the work of an ended turn into one line.
- **Problem:** A member cannot see which skill the agent used. When the
  run folds, the member cannot see that the agent used a skill at all.
- **Impact if no action:** A member cannot check that the agent loaded the
  skill that the task needs. Conductor shows this.
- **Root question:** How does a member see which skill the agent uses, and
  when?
- **Options:**
  - **A.** Show the call as a skill line at its place in the run. It has a
    skill icon, the skill name, and words such as "Skill activated". The
    fold line adds the skill icon. The name is hidden while the run is
    closed. Effort: Large.
  - **B.** As A. Also, each fold line that holds a skill call names the
    skill, such as "8 tool calls, 7 messages · Skills: brainstorming". The
    name stays in view in every state. Fold lines get longer, also in the
    transcript copy. Effort: Large.
  - **C.** As B, but the skill line is a row of its own between runs, like
    Conductor's row. It stands out more while the agent works. It splits a
    run in two around the row. Effort: Large.
  - **D.** A skill row of its own that stays in view after the turn ends,
    like Conductor. The work fold splits around each skill row. This
    changes decision 150 and the chat protocol doc. Effort: Large.
  - **E.** As A. Also, the end line of each turn names the skills of the
    turn once, such as "Finished in 3m · Skills: brainstorming". The stop
    line and the failure line name them too. Fold lines keep their length,
    also in the transcript copy. While the turn runs, a folded run shows
    only the skill icon. Effort: Large.
  - **F.** As B. Also, a Claude `Read` of the `SKILL.md` file of a loaded
    skill counts as a use of that skill, as a Codex read does. Both agents
    then follow one rule. Claude seldom reads a skill file directly, and a
    repository that edits its skills gets more false uses. Effort: Large.
- **Left out:**
  - The skill name in today's generic line, with a runner change only: a
    folded run still hides the name. The line also keeps the general icon
    and verb. Its one benefit joins B: the runner sets the target of a
    Claude skill call to the skill name. So an old Mac app copy also shows
    the name.
  - A status in the running turn, such as "Working · brainstorming": it
    goes away, like a toast.
  - A list of the skills of a session outside the chat: it does not show
    when the agent used each skill.
  - A toast when a skill loads: it goes away, and the history and the
    transcript copy do not keep it.
  - A new chat event type: an old Mac app copy skips an unknown event. A
    mark that keeps today's line is better on every point.
  - Detection in the Worker or the browser: only the runner sees the input
    of a tool.
  - No change: today's line does not name the skill.
- **Shared assumptions:**
  - The skill use shows in the chat of its session. Source: the task
    message, with its picture of the Conductor chat. Kept.
  - Only the skill uses of the agent of the session show, not those of its
    subagents. Source: the code. For Claude,
    `runner/src/providers/claude-events.ts` drops each event of a
    subagent, and the chat shows no other work of a subagent.
    For Codex it is not proven, as design call 8 says. Kept.
  - The runner names the skill. Source: the code, because the browser
    never gets the input of a tool. Kept.
  - A Claude skill use is a call of the `Skill` tool. Source: the code and
    the SDK. It holds for the normal path. F drops it.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** None found in plans, follow-up items, pull
  requests, or workspace names. Pull request #167 has an open decision,
  `plans/follow-ups/tool-run-fold-requirement.md` on its branch, on which
  runs stay open while the agent works.
- **Related:** Decision 278 gives the same line to Codex skill uses.
  Decision 279 chooses the words of the line.
- **Recommendation:** B. The skill name stays in view in every state,
  whatever pull request #167 decides, and decision 150 stays. E hides the
  name in a folded run while the turn runs, and F adds false uses for
  little gain.
- **Chosen:** B, by the user on 11 November 2026.
- **Options check:** It added E and F, and it kept B. The effort grades
  rose from Medium to Large, because each option needs mockups, protocol
  docs, the chat contract, the runner, and the chat.

### Decision 278. How a member sees which skill a Codex agent uses

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/codex-events.ts:35`
- **Background:** Codex has no event for a skill use. Its built-in
  instructions tell the model to read the `SKILL.md` file of a skill
  before it acts. They also tell it to announce each skill in one short
  line. The runner
  sees the read in the parsed actions of the command, each with its
  absolute path. On 11 November 2026, the skill list of Codex 0.167 for a
  test repository held the repository's `.agents/skills/` folder and five
  built-in skills. It did not hold `.claude/skills/`. Codex lists a linked
  skill folder by the path of its target, but its model reads the path of
  the link.
- **Problem:** Decision 277 starts from the Claude `Skill` tool. A Codex
  session gets no skill line unless the runner finds the reads of skill
  files.
- **Impact if no action:** Codex sessions never show a skill use, even
  when they load skills.
- **Root question:** What counts as a Codex skill use, so that the chat
  names each skill that Codex loads and no other file read?
- **Options:**
  - **A.** Show skill lines for Claude agents only. Record a follow-up item
    for Codex. Effort: Small.
  - **B.** Also show them for Codex. When Codex starts, the runner gets the
    skill list. A command that reads the `SKILL.md` file of a listed skill
    then shows as a use of that skill. A Codex update can change the list
    or the command parse. A read that only edits a listed skill also shows
    as a use. Effort: Medium.
  - **C.** Count each read of a file named `SKILL.md` as a skill use, with
    no skill list. The name comes from the folder of the file. It needs no
    list request and no failure path. It also names a `.claude/skills/`
    file that the instructions of a repository tell Codex to read. But it
    also names reads of templates, fixtures, and other files that Codex
    does not load. A folder name can also differ from the skill name.
    Effort: Medium.
- **Left out:**
  - An instruction that asks Codex to name each skill that it loads: the
    line would then depend on the model. The built-in instructions already
    ask the model to announce its skills, and the runner cannot trust that
    text.
  - A watch on the skill files in the cloud computer: it cannot tie a file
    read to one call. Git and other programs also open the same files.
  - A runner tool that loads a skill for Codex: the built-in instructions
    still tell the model to read the file. So a load can go around the
    tool.
- **Shared assumptions:**
  - The Codex skill use shows with the line of decision 277. Source:
    decision 277, and the rule in `docs/protocol/chat-and-events.md` that
    one event type serves both agents. Kept.
  - Only the runner can find a Codex skill use. Source: the code, because
    only the runner sees the parsed actions of a command. Kept.
  - Codex loads only its own skill folders, not `.claude/skills/`. Source:
    the defaults of Codex 0.167. Which skills Codex loads is a separate
    feature, which the comparison page lists as under consideration. Kept.
- **Wider fix:** None. This is a new feature, not a class of defects.
- **Previous examples:** None found.
- **Related:** Decision 277 sets the line that a Codex skill use gets.
- **Recommendation:** B. It names only the skills that Codex loads, with
  their Codex names. The match is exact once the runner compares real
  paths, as design call 14 says.
- **Chosen:** B, by the user on 11 November 2026.
- **Options check:** It replaced the root question, which was "How does a
  member see which skill a Codex agent uses?". It added C, and it kept B.
  It found that B needs real paths, because of linked skill folders.

### Decision 279. The words of the skill line

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/shared/transcript/tool-words.ts:3`, the verbs of the
  call lines.
- **Background:** Each call line of the chat starts with a verb, such as
  "Read", "Searched", "Ran", or "Used" for other tools. While a call runs,
  the verb is "Reading", "Running", and so on. The transcript copy uses
  the same words. Conductor shows a skill use as the skill name, then
  "Skill activated". Option B of decision 277 gave "Skill activated" as an
  example.
- **Problem:** No requirement and no copy rule sets the words of the skill
  line. The first version of this plan chose them without the user, and
  the options check found it.
- **Impact if no action:** The mockups, the chat, and the transcript copy
  cannot show the skill line.
- **Root question:** Which words tell a member that the agent loaded a
  skill?
- **Options:**
  - **A.** The verb of other tools: "Using skill" while the call runs, and
    "Used skill" after it. The skill name and the detail follow, such as
    "Used skill brainstorming high". It keeps the shape of the other call
    lines. "Used" can suggest that the agent finished the work of the
    skill. Effort: Small.
  - **B.** A verb that says what happens: "Loading skill" while the call
    runs, and "Loaded skill" after it. The skill name and the detail
    follow, such as "Loaded skill brainstorming high". It keeps the shape
    of the other call lines, and it is true for both agents.
    Effort: Small.
  - **C.** The words of Conductor: the skill name, then "Skill activated",
    such as "brainstorming · Skill activated". It looks like Conductor,
    which the request named. It breaks the verb-first shape of the other
    call lines, and it needs its own layout in the line and in the copy.
    Effort: Small.
- **Left out:**
  - "Activated skill" as a verb: B says the same thing in plainer words.
  - A name in title case, such as "Brainstorming", as Conductor shows it:
    a changed name can hide the real name of a plugin skill. An example is
    `conductor:conductor`.
- **Shared assumptions:**
  - The skill name shows as the agent gives it. Source: design call 7.
    Kept, for the reason in the line above.
  - The skill icon shows at the start of the line. Source: decision 277.
    Kept.
- **Wider fix:** None. This is a choice of words, not a class of defects.
- **Previous examples:** The verbs of the other tools in
  `src/shared/transcript/tool-words.ts`.
- **Related:** Decision 277 chose the skill line. Milestones 1, 3, and 6
  use these words.
- **Recommendation:** B. It keeps one shape for every call line. "Loaded"
  is also true for both agents: Claude loads the instructions through its
  `Skill` tool, and Codex reads the file.
- **Chosen:** A, by the user on 11 November 2026.
- **Options check:** It ran on 11 November 2026, after the user's answer,
  because the plan did not run it before. It confirmed A. It added D, a
  label with no verb, and E, "Activating skill". It also added F: A with
  the plural for two or more names, which design call 16 applies. It
  found that "Using skill" stays true for a Claude skill that runs in a
  forked agent, where "Loading skill" would not.

## Design calls

Each call is mine, from 11 November 2026, after the options check. The
user can override each one.

1. A skill call keeps its tool kind. It gets a new optional `skills`
   field: the names of the skills that the call loads, in order, with no
   repeats. Reason: an old Mac app copy ignores an unknown field and still
   shows the line. It hides the whole event when the event holds an
   unknown tool kind, because `readEnvelope` then reads the event as
   unreadable. A list covers a Codex command that reads two skill files.
   A single name would be hard to widen after the workspace stores events.
2. The runner writes the text of a skill line in the fields that each call
   line uses. The target holds the skill names, joined by ", ". The detail
   holds the arguments of a Claude skill call, or the command of a Codex
   call. Reason: the chat and the transcript copy then draw a skill line
   as they draw each call line. The command of a Codex call stays in
   view, and an old Mac app copy shows the skill name in place of "Skill".
3. The Worker and the browser keep only the non-empty string entries of
   `skills`. A field with no such entry counts as absent. Reason: a mark
   for the display must not make an event unreadable, as the browser rule
   for display labels already says. This adds no rejection.
4. The output filter masks each skill name, as it masks the target and
   the detail. Reason: a name is text from the cloud computer, and no
   secret may reach the browser.
5. The skill names get no limit of their own. Reason: the 1 MiB limit of
   the event envelope already bounds them.
6. The runner protocol version stays the same. Reason: an older runner
   never sends the field, and an older Worker drops it.
7. Each skill name shows as the agent gives it, such as
   `conductor:conductor`. Reason: a changed name can hide the real name of
   a plugin skill. Decision 279 sets the words and the order of the line.
   The mockup milestone chooses the icon.
8. Only the skill uses of the agent of the session show, as far as the
   runner can tell. For Claude, the runner drops each event of a subagent.
   For Codex, the runner checks the thread of no event today, and Codex
   0.167 turns on its multi-agent feature by default. The follow-up item
   `plans/follow-ups/codex-subagent-events-in-chat.md` records that
   problem for all Codex events. Reason: the chat shows no other work of a
   subagent, and the thread check is a separate change.
9. A fold line names each skill once, in the order of first use, after
   its counts: "· Skill: brainstorming" or "· Skills: brainstorming,
   plans". It takes the names from the `skills` field of its calls. It
   names no skill of a failed or stopped call. Reason: such a call loaded
   no skill. The transcript copy uses the same words, as its protocol doc
   requires. When the line wraps, these rules from the mockups apply:
   - The text wraps beside the chevron, which stays at the first line.
   - The line breaks only after the dot, after "Skills:", or between two
     names. A name keeps its comma and never breaks at its hyphen.
   - The icons of the tool kinds stay with the last name.
   - In the chat, a no-break space holds the dot to the counts. The
     transcript copy keeps a plain space.
10. Events stored before the change keep the line "Used Skill". Reason:
    they hold no skill name.
11. The runner sends no running event for a Claude `Skill` call until its
    input names the skill. Reason: the streamed start of a call has an
    empty input, so the line would first show "Using Skill" and then
    change.
12. The runner asks Codex for the skill list beside the thread start, and
    again after each `skills/changed` notification. It does not delay the
    thread or the turn. A read before the list arrives shows as a plain
    command. Reason: the list must not slow or fail a turn.
13. A failed or unreadable skill list gives one local warning. The turn
    continues with plain command lines. Reason: the skill line is a
    display aid, so its failure must not stop the work.
14. A Codex command names a skill when one of its `read` actions has the
    real path of the `SKILL.md` file of that skill. The skill must be in
    the skill list and enabled. The names come from the skill list. The
    match keeps the order of the events. An `unknown` action, such as one `cat` of two files, names
    no skill. Reason: Codex lists a linked skill folder by the path of its
    target, but its model reads the path of the link. Codex gives each
    read of a simple command as one `read` action with an absolute path.
15. A Codex read of a skill shows as a plain command when an earlier read
    of the turn loaded that skill. A failed read loads no skill, so a
    later read of that skill gets its skill line. Reason: Codex reads a
    long `SKILL.md` in pages, and one load should give one skill line.
    Each Claude `Skill` call shows, because each call is a separate load.
    The docs agent of Milestone 2 found the case of a failed first read.
16. A skill line with two or more names reads "Using skills" or "Used
    skills". Reason: the plural is a detail of decision 279, and the fold
    line already uses "Skills:" for two or more names. The options check
    of decision 279 proposed it as option F.
17. On a narrow screen, the detail of a skill line shrinks before the
    skill names. The names and the detail form one text, which an
    ellipsis cuts at its end. The other call lines keep their layout.
    Reason: a long Codex command must not hide the names, which are the
    point of the line.
18. The skill icon is `BookOpen` from `lucide-react`, on the skill line
    and among the icons of a fold line. Reason: an open book reads as
    instructions that the agent opens, and its shape differs from the
    icons of the other tool kinds. The mockup agent chose it.
19. Each mockup screen with a skill line shows a state that the app can
    produce. A Claude session shows only Claude skill lines, and a Codex
    session shows only Codex skill lines. Reason: a session runs one
    agent, as `docs/protocol/agents-and-sessions.md` says, and the
    mockups are the visual spec. The mockup agent found the first
    version, which mixed the two, and it recommended a note on the
    screen. I chose a true Codex screen instead.
20. The `history` chat of the mockups gets no skill line, so `app/chat`
    shows its turn without skills. Reason: the marketing pictures also
    use that chat, and they stay the same.
21. Only the concise transcript copy has fold lines that name skills. The
    full copy gives the steps of each fold in place of its line, so it
    gives each skill line instead. Reason: the full copy has no fold
    lines. The docs agent of Milestone 2 made this call.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat mockups show the skill line in a running turn, a folded run whose
line names its skill, and the work fold of an ended turn that names its
skills, at phone and desktop sizes. Read the `mockups` and `product-ui`
skills first. The skill line reads "Using skill" or "Used skill", then
the skill names and the detail, as decision 279 says.

- [x] Add an optional list of skill names to the tool item of the mockup
      fixtures in `docs/mockups/src/fixtures/conversations.ts`.
- [x] Draw the skill line in the mockup `ToolGroup` in
      `docs/mockups/src/components/chat/`. It shows a skill icon from
      `lucide-react`, the words of decision 279, the skill names, and the
      detail. Record the chosen icon in the design calls of
      this plan.
- [x] Name the skills on the mockup `FoldLine`, as design call 9 says.
      Show the skill icon among the icons of the tool kinds.
- [x] Show the states:
  - [x] `app/chat/turns`: the running turn has a skill line in its open
        run, and a folded run whose line names a skill.
  - [x] `app/chat/work`: the work fold of the finished Claude turn names
        its skills. Its open list shows one skill line with arguments and
        one with no detail.
  - [x] A new variant of `app/chat/work`, a Codex session, with a fold
        line that names five skills, to check how the line wraps on a
        phone. Its open list shows Codex skill lines with their commands,
        and one line names two skills. The page then has five screens, the
        limit.
- [x] Update `docs/mockups/design-chat.md` with the skill line and the
      skill names on fold lines.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at phone
      and desktop sizes with `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/skill-use-in-chat/m1/`, with the screenshots and the
baseline comparison of the other states.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the skill line, the skill names on fold lines, and
what counts as a Codex skill use. Read the `documentation` skill first.

- [x] Update `docs/protocol/chat-and-events.md` under "What the chat
      shows" and "The work of a turn":
  - [x] Each skill use of the agent shows as a skill line at its place
        among the tool calls, with the skill name as the agent gives it
        (decision 277). Give the rejected options and their reasons.
  - [x] Each fold line names the skills of its calls, as design call 9
        says (decision 277).
  - [x] A Codex skill use is a command that reads the `SKILL.md` file of a
        skill in the Codex skill list, compared by real path. A second
        read of that skill in the same turn is a plain command
        (decision 278). Give the rejected options and their reasons.
  - [x] The words of the skill line, "Using skill" and "Used skill"
        (decision 279). Give the rejected options and their reasons.
- [x] Update `docs/protocol/session-transcripts.md`: in the full copy, a
      skill line gives the words of the chat, the skill names as code, and
      the detail.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a fact that this milestone changes.

Evidence: `.context/skill-use-in-chat/m2-report.md`, with the legal page
read and the link check.

## Milestone 3: Skill names in the chat contract

Depends on: 2

The shared tool call carries the optional skill names. The output filter,
the Worker, and the browser keep them. Shared words give the skill line
and the skill names of a fold to the chat and to the transcript copy. Read
the `typescript` and `testing` skills first.

- [x] Add the optional `skills` field to `ToolCall` in
      `src/shared/chat-events.ts`, with a doc comment, as design call 1
      says.
- [x] Mask each name in `src/shared/output-fields.ts`, as design call 4
      says. Test that a turn token in a skill name shows as `[redacted]`.
- [x] Keep the field in `tool()` of `worker/chat/agent-events.ts`, as
      design call 3 says. Test a stored event with a valid list and with a
      malformed value.
- [x] Read the field in `readTool` of `src/chat/api/read-chat.ts`, as
      design call 3 says. Test both cases in `read-chat.test.ts`.
- [x] Add the words of a skill line, as decision 279 says, and the
      skill names of a fold, as design call 9 says, to
      `src/shared/transcript/tool-words.ts`. Test them with literal
      expected values.
- [x] Use the words in the transcript copy, in `toolMarkdown` and
      `foldMarkdown` of `src/shared/transcript/markdown-items.ts`. Test the
      concise and the full copy in
      `src/shared/transcript/session-markdown.test.ts`.
- [x] Update `src/shared/README.md` with the field and the words.

Evidence: `.context/skill-use-in-chat/m3-report.md` and
`.context/skill-use-in-chat/m3/`.

## Milestone 4: Claude skill uses in the runner

Depends on: 3

The runner gives each Claude `Skill` call its skill name, as design calls
2 and 11 say.

- [x] Map a `Skill` tool call with a string `skill` input to a skill call.
      Its `skills` and its target hold that name. Its detail holds the
      string `args`. Keep the kind. Start in
      `runner/src/providers/tool.ts`.
- [x] Send no running event for a `Skill` call until its input names the
      skill, in `runner/src/providers/claude-events.ts`.
- [x] Keep `skills` in `tool()` of `runner/src/stored-events.ts`, with the
      malformed-value rule of design call 3. The runner saves each event
      through this parser before it sends the event, so without it the
      names never leave the cloud computer. Milestone 4 found this gap.
- [x] Test in `runner/src/providers/claude.test.ts` with the SDK frames of
      a streamed call. No event shows the generic line. The running and
      the done events carry the name, the target, and the detail. The
      frames are:
  - a `content_block_start` of a `tool_use` block with the name `Skill`
    and an empty input
  - the `assistant` frame with the input
    `{ skill: 'brainstorming', args: 'high' }`
  - its `tool_result`
- [x] Update "What it does" in `runner/README.md`.

Evidence: `.context/skill-use-in-chat/claude-m4/` and
`.context/skill-use-in-chat/m4/`.

## Milestone 5: Codex skill uses in the runner

Depends on: 3

The runner gets the Codex skill list and names the skills of each command
that reads a listed `SKILL.md` file, as design calls 2 and 12 to 15 say.

- [x] Request `skills/list` for the working folder in
      `runner/src/providers/codex.ts`, beside `thread/start` and
      `thread/resume`. Keep a map from the real path of the `SKILL.md`
      file of each enabled skill to its name.
- [x] Request the list again after a `skills/changed` notification.
- [x] In `runner/src/providers/codex-events.ts`, give a `commandExecution`
      item the names of its matching `read` actions, as design call 14
      says. Its target holds the names, and its detail holds the command.
- [x] Keep the skills that an earlier read of the turn loaded, and skip
      them, as design call 15 says. A failed read loads no skill.
- [x] Warn once and continue when the list fails or cannot be read.
- [x] Add `skills/list` to the request order that
      `runner/src/providers/codex-login.test.ts` checks. The orchestrator
      found this TODO and made the change.
- [x] Let `FakeAppServer` in `runner/test-support/app-server.ts` answer
      `skills/list` with a list from the test.
- [x] Test in `runner/src/providers/codex.test.ts`:
  - [x] A command that reads two listed skills, one through a linked
        folder, carries both names in order.
  - [x] A read of a `SKILL.md` file that the list does not hold carries no
        name.
  - [x] A second read of the same skill in the turn carries no name.
  - [x] A read after a failed read of the same skill carries the name.
  - [x] A failed list leaves the turn running, with no names.
- [x] Update "What it does" in `runner/README.md`.

Evidence: `.context/skill-use-in-chat/m5/`.

## Milestone 6: Skill lines in the chat

Tags: ui

Depends on: 1, 3

The chat draws the skill line and the skill names on fold lines, as the
mockups show. Read the `product-ui` and `typescript` skills first. Pull
request #167 also changes `ToolGroup.tsx`. When it has merged, merge
`main` into this branch before this milestone starts.

- [ ] Draw the skill line in `CallLine` of
      `src/chat/components/ToolGroup.tsx`, with the icon, the words, and
      the CSS of the mockups, as design calls 16 to 18 say.
- [ ] Show the skill icon and the skill names on `FoldLine`, for runs and
      for the work fold, with the wrap rules of design call 9.
- [ ] Add a skill call to the development page in `src/chat/dev/`, so
      that the page shows a skill line.
- [ ] Test the rendered skill line, the line of a folded run, and the line
      of a work fold. Use the existing render tests of these parts.
- [ ] Update `src/chat/README.md` and `src/chat/transcript.md`.
- [ ] Smoke-test the development page at phone and desktop sizes. Save the
      screenshots under `.context/skill-use-in-chat/`.

## Milestone 7: Public guide and comparison page

Depends on: 2

The public guides and the Conductor comparison page describe the skill
lines.

- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that the skill lines make incomplete or wrong, such as the
      fold lines in `sessions-and-chat.md`. Follow
      `docs/protocol/website-docs.md`.
- [x] Update the note of the `skills` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`. It names the
      repository folder that each agent loads skills from:
      `.claude/skills/` for Claude and `.agents/skills/` for Codex. It
      keeps "Personal Mac skills are not copied." The status stays
      `available`. Follow `docs/protocol/conductor-comparison.md`.
- [x] Set the `skill-use-indicators` row of the same file to `available`,
      with a note that says that the chat names each skill use, because
      this branch ships the feature. Main added that row as planned after
      this plan was written. The external docs agent found it, and the
      orchestrator made the change.

Evidence: `.context/skill-use-in-chat/m7/`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests of the changed areas, then the complete
      gate, `npm run check`.
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

- [ ] After an org image build installs the new runner, ask a Claude agent
      on the deployment to use a skill in `.claude/skills/`. Check the
      skill line, the fold line, and the transcript copy.
- [ ] Do the same with a Codex agent and a skill in `.agents/skills/`,
      also through a linked skill folder.
