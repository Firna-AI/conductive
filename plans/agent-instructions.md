# Agent instructions

Status: Active. On branch `conductor/conductor-prompts`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The agent runner gives Claude and Codex tools, but no text about
Conductive. Each message reaches the agent with only its text and its
attachments. Claude agents also run with an empty system prompt. So an
agent cannot tell who sent a message, which branch the app tracks, or which
features of the product it can use.

This change adds the agent instructions. The runner builds one Conductive
text and sends it through the system field of each agent, as Cal chose for
decision 1 on 9 November 2026. Each message to the agent also starts with a
sender line. The change does not cover new agent tools, such as agent
questions, diff comments, or terminal output. It also does not cover custom
instructions for orgs and members, a personality setting, a `conductive`
skill, the OpenCode agent, or the model gateway of decision 120 in
`plans/boat-native-remote-workspaces.md`. The brainstorm notes are in
`.context/agent-session-context/`, and the options check is in
`.context/agent-instructions/`. The text that Conductor adds, extracted
from its worker, is in `.context/conductor-prompts/`.

Contract owners:

- `docs/protocol/agent-instructions.md`, a new protocol doc that
  Milestone 1 adds.
- [Architecture](../docs/architecture.md), the list of protocol docs.
- [Chat and events](../docs/protocol/chat-and-events.md), a link from the
  section "Agents".
- The [runner README](../runner/README.md).

Terms:

- **Agent instructions:** the Conductive text that the runner gives each
  agent session. It holds the workspace facts and the guidance for the
  tools of the product.
- **Sender line:** one line at the start of each message to the agent. It
  names the member who sent the message.
- **System field:** the place where an agent SDK takes instructions before
  the conversation. The Claude Agent SDK option is `systemPrompt`. The Codex
  App Server field is `developerInstructions`.
- **Preset:** Claude Code's default system prompt. The Agent SDK sends it
  only when the runner asks for `{ type: 'preset', preset: 'claude_code' }`.
- **Compaction:** the agent's summary of a long conversation. The summary
  replaces the older messages.
- **Recording:** the Agent SDK's `snapshot` behaviour. It keeps the first
  system prompt of a Claude session until compaction. Anthropic turns it on
  one account at a time.

## Decisions

### 1. Choose how agents get the Conductive text

Added on 8 November 2026 from Cal's request "can we do our own version of
this?", about the text that Conductor adds to its agent sessions. Updated on
9 November 2026 with the token use of A and B, OpenCode, and option E. The
options check of 9 November 2026 added options F and G, and corrected B, C,
and the wider fix.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/claude.ts:52`,
  `runner/src/providers/codex.ts:128`.
- **Background:** Conductor adds workspace and cloud facts to the first
  message of each session, and a sender block to each message. No
  requirement in `docs/protocol/` says what text Conductive agents get. The
  runner starts a new agent process for each turn, and the process resumes
  the session. OpenCode, a possible later agent, takes a `system` field on
  each message. The model gateway of decision 120 will carry every model
  request through the Worker.
- **Problem:** Agents cannot tell who sent a message, which branch the app
  tracks, or which features exist.
- **Impact if no action:** Members must repeat this context in their
  messages. If an agent renames the branch, the pull request bar stops
  following the work.
- **Root question:** How do agents in a Conductive workspace learn where
  they work, who sent each message, and what the product lets them do?
- **Options:**
  - **A.** Add a Conductive block to the first message of each session, and
    add a sender line to each message. Compaction can shorten or drop the
    block, and the block has less weight than system instructions. It works
    for any agent without an adapter. Its token use is about the same as B.
    Effort: Medium.
  - **B.** The runner builds the text once. It sends the text through the
    system field of each agent: the preset's `append` for Claude,
    `developerInstructions` for Codex, and `system` for OpenCode. An agent
    without a system field gets the text in its first message, as in A.
    Each message also gets a sender line. The runner must send the same
    text at each turn, because a changed text rewrites the prompt cache,
    and Claude keeps the first text where recording is on. So facts that
    change cannot go there. Its token use is about the same as A, but after
    compaction B still sends the full text. Effort: Medium.
  - **C.** Write the text to an instruction file in each agent home that
    the runner sets, `~/.conductive/claude` and `~/.conductive/codex`. Add
    a `conductive` skill, and add a sender line to each message. A copy in
    `~/.claude/CLAUDE.md` also reaches agents that a member starts in the
    Terminal, and OpenCode can read that copy. The files have less weight
    than system instructions, and Claude must also load user settings.
    Effort: Medium.
  - **D.** Add a tool to the `conductive` MCP server that returns live
    facts, such as the pull request state. The workspace token then allows a
    fourth call, which changes a requirement in `access-and-security.md`.
    Agents still need a prompt line that tells them to use the tool.
    Effort: Large.
  - **E.** The model gateway adds the text to each model request. No agent
    needs an adapter, and the Worker knows each fact and the sender. E waits
    for the gateway, which does not exist yet. The gateway must edit the
    request format of each provider without a change to the cached prefix,
    and requests that skip the gateway get no text. Effort: Large.
  - **F.** The Worker builds the text and sends it with each turn command.
    The runner passes it on through the system fields of B, so the sandbox
    needs no new variable. Cost: a new field in the turn command, tests on
    both sides, and the Worker must keep the text the same for a session.
    Effort: Medium.
  - **G.** Hooks carry the text. A Claude `SessionStart` hook and Codex
    `sessionStart` and `postCompact` hooks return it as extra context at
    the start and after compaction. A hook at each prompt can add facts
    that change. Cost: the model gives the text the weight of a user
    message, and the hooks must skip each resume, because each turn resumes
    the session. The trust rules of Codex hooks are not checked.
    Effort: Large.
- **Left out:**
  - Change nothing: it fails the goal.
  - Copy Conductor's text: the text describes another product.
  - Claude only: it leaves out Codex and OpenCode, which have their own
    fields.
  - Files in the org image: C is better on every point.
  - Add the text in the user's own proxy: we do not control that program.
  - The `instructions` field of the `conductive` MCP server: the Codex MCP
    schema has no such field, and the tool descriptions already guide both
    agents.
  - An instruction file in the repository folder: Codex reads one file in
    each folder, so the file would hide the repository's own `AGENTS.md`.
  - A Git guard against a branch rename: it covers one fact only, and a new
    rejection needs the user.
- **Wider fix:** B. Its required `instructions` option makes each new agent
  choose a channel.
- **Previous examples:** None in Conductive. Conductor puts its text in the
  first message of a session.
- **Related:** Decision 2, which this decision waits on for Claude. Option B
  uses the preset's `append` if decision 2 chooses B.
- **Recommendation:** B. The text stays in force for the whole session, and
  the required option covers each new agent. E can replace B when the
  gateway carries every model request, and F becomes the better builder
  when org and member instructions come.
- **Chosen:** B, by Cal on 9 November 2026.

### 2. Choose the base system prompt of Claude agents

Added on 8 November 2026 with decision 1. The options check of 9 November
2026 added option D, added the cost of a new process at each turn to B, and
changed the reason of the left-out line. On 9 November 2026 the Problem
line changed: the tool descriptions keep some of the default rules.

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `runner/src/providers/claude.ts:52`.
- **Background:** The runner passes no `systemPrompt` option. In that case,
  Agent SDK 0.3.318 sends an empty custom prompt, not the preset. Codex
  keeps its default instructions. The runner starts a new agent process for
  each turn, and the process resumes the session.
- **Problem:** Claude agents do not get the system prompt part of Claude
  Code's default guidance: the rules for work with the user and with the
  tools, and the facts of the environment, such as the folder, the
  platform, the model, and the date. They still get the tool descriptions,
  which hold some rules, such as the git rules of the Bash tool, and the
  repository's `CLAUDE.md`. No doc, plan, or commit records this as a
  choice.
- **Impact if no action:** Claude agents can behave differently from the
  Claude Code that users know. The agent instructions would also have no
  base guidance below them.
- **Root question:** What base instructions should Claude agents in
  Conductive get?
- **Options:**
  - **A.** Keep the empty prompt. The agent instructions are then the whole
    prompt. Effort: Small.
  - **B.** Use the preset, with the agent instructions as its `append`. The
    preset changes with SDK updates. Parts of it name Claude Code, so the
    agent instructions must name the product. The preset holds sections
    that change, such as the git status. Where recording is off, each new
    process can then change the prompt and rewrite the prompt cache at each
    turn. This is not measured yet. Effort: Small.
  - **C.** Write our own full prompt. We would have to match and maintain
    the guidance of the preset. Effort: Large.
  - **D.** Each org chooses A or B in its settings, with B as the default.
    Cost: a setting, a mockup, storage, a runner protocol field, and tests,
    for a choice that no user asked for. Effort: Large.
- **Left out:** The preset with `excludeDynamicSections`, because it is one
  setting of B. The setting moves the working directory, the memory path,
  and the git status into the first user message. So it is the fallback
  when the cache check of B fails.
- **Wider fix:** None, because the fix is one option in one file.
- **Previous examples:** None found. `git log -S systemPrompt` finds no
  commit under `runner/`.
- **Related:** Decision 1, same code. Its option B puts the agent
  instructions in this preset's `append`.
- **Recommendation:** B, when the second turn of a session reads the prompt
  cache. Milestone 4 checks this first. If the check fails, use B with
  `excludeDynamicSections`, then A. B gives agents the guidance that
  Anthropic maintains, at a small cost. The preset adds its own
  instructions to every request, so it costs more tokens than the empty
  prompt.
- **Action:** ask the user, because the change alters every Claude turn and
  no requirement covers the system prompt.
- **Open:** It waits for Cal. It blocks Milestone 4.

## Design

### What the instructions hold

The protocol doc states these facts as requirements:

- The product: the agent works in a Conductive workspace. A workspace is one
  task with its own branch and its own cloud computer.
- The repository folder of the workspace, and the folder of each other
  repository.
- The workspace branch and the target branch. The agent must not rename the
  branch, because the app finds the pull request by the branch name.
- The cloud computer: the Desktop tab shows the desktop where the agent uses
  the computer tools, and a member opens a port preview by its port number.
- The workspace tools: they create and list workspaces, and they ask to run
  a command on the Mac of the member whose message started the turn.
- Several members can write in one session, and each message starts with
  its sender line.

### Design calls

Each item is an agent call of 9 November 2026. Cal can override any of
them.

- Both agents get the same instructions, each through its own system
  field. Reason: the app offers both agents (decision 19), and both SDKs
  have a field.
- The instructions stay the same for the life of a session. The runner
  sends the same text at each start and each resume of the agent process.
  Facts that change, such as the pull request state, stay out. Reason: a
  changed text rewrites the prompt cache, Claude keeps the first text where
  recording is on, and Codex keeps the instructions of a thread.
- The runner builds the instructions, not the Worker of option F. It reads
  the product name from `docs/mockups/src/brand.ts`, as the repository
  rules say. Reason: the runner has every fact that this change needs, and
  F adds a turn command field for facts that only later features need.
- The Worker gives the runner the workspace branch in
  `CONDUCTIVE_WORKSPACE_BRANCH`, next to `CONDUCTIVE_DEFAULT_BRANCH`.
  Reason: the record of the Worker is the branch that the app tracks, and
  the git branch in the sandbox can change.
- Every message gets a sender line, also a message of the starter. The line
  gives the display name and the GitHub login of the sender. Reason:
  several members can write in one session while the starter shares the
  login (decision 116), and a Mac command goes to the Mac of the member
  whose message started the turn.
- The sender line informs the agent only. No access depends on it. Reason:
  the Worker takes the sender of a Mac command or a push from its own
  record of the turn. Risk: a member can type a false sender line in a
  message. The agent can then name the wrong member, but no access changes.
- The chat shows only the text of the member. It never shows the
  instructions or the sender line. Reason: they are for the agent.
- The instructions follow the naming rules for user-facing text:
  "Conductive", "cloud computer", and "agents powered by Claude and Codex".
  They never name Boat, and they never use "Claude Code" as a name of the
  product. Reason: the agent can repeat the text in the chat.
- Claude subagents do not get the instructions. Reason: the public options
  of the Agent SDK reach only the main agent. Risk: a subagent does not
  know the branch rule.
- A session that started before this change can keep its old instructions.
  Reason: both SDKs keep the instructions of a session, and the product is
  not in production.
- Each provider takes the instructions as a required option. A later agent
  without a system field sends them in its first message. This change adds
  no code for that case, because no current agent needs it. Reason: a
  required option makes each new provider choose a channel, and an unused
  fallback would be dead code.
- The requirements go in a new protocol doc,
  `docs/protocol/agent-instructions.md`. Reason: `chat-and-events.md` is
  past the length target of the `documentation` skill, and `agent-tools.md`
  covers tools.

## Milestone 1: Documentation and protocol

Depends on: none

Write the requirements and the decisions in force for the agent
instructions, before the code changes.

- [ ] Add `docs/protocol/agent-instructions.md`. State what the
      instructions hold, the sender line, what the chat shows, the naming
      rule, and that the instructions stay the same for a session. Give each
      decision in force with its rejected alternative and its reason.
- [ ] Add the new doc to the list of protocol docs in `docs/architecture.md`.
- [ ] Link the new doc from the section "Agents" of
      `docs/protocol/chat-and-events.md`.
- [ ] Read the Terms page and the Privacy page in full, as `AGENTS.md`
      says. Update each sentence that restates a changed fact, such as the
      member data that reaches the model providers in the sender line.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: The workspace branch for the runner

Depends on: 1

Give the runner the branch that the app tracks.

- [ ] Add `CONDUCTIVE_WORKSPACE_BRANCH` to the environment that
      `worker/lifecycle/start-machine.ts` sets at each start. Check
      `worker/lifecycle/disk-retention.ts`, which also sets
      `CONDUCTIVE_DEFAULT_BRANCH`, and add the branch there when that start
      runs the runner.
- [ ] Read the variable in `runner/src/config.ts`.
- [ ] Add the variable to the lists in `image/README.md`,
      `runner/README.md`, and `docs/deployment.md`.
- [ ] Add the new value to the existing tests of the start environment and
      of the runner configuration.

## Milestone 3: Instructions, sender line, and Codex

Depends on: 1, 2

Build the instructions and the sender line, and send the instructions to
Codex.

- [ ] Add a runner module that builds the instructions from the runner
      configuration and the repository folder variables.
- [ ] Add a required `instructions` field to `ProviderOptions`. Fill it
      where the engine starts a provider.
- [ ] Send the instructions as `developerInstructions` on the Codex
      `thread/start` and `thread/resume` requests.
- [ ] Check once with the real Codex App Server that a thread that resumes
      with the same `developerInstructions` keeps one copy of the text. Save
      the output under `.context/agent-instructions/`.
- [ ] Start the text of each message to Claude and to Codex with the sender
      line, from `message.sender`. Keep the attachments as they are.
- [ ] Tests, at the provider entry points:
  - [ ] The instructions name the workspace branch, the target branch, and
        the repository folder of the configuration.
  - [ ] A Codex thread start and a thread resume carry the instructions.
  - [ ] Each message to Claude and to Codex starts with the sender line of
        its sender.
- [ ] Update the runner README: the new module under its key code, and a
      link to the protocol doc.

## Milestone 4: Claude instructions

Depends on: 3, and the answer to decision 2

Send the instructions to Claude with the base prompt that decision 2
chooses.

- [ ] Merge `origin/main` first. The own endpoint logins change on the
      branch `calummoore/cli-proxy-setup` edits the same `query` options in
      `runner/src/providers/claude.ts`. Keep its options when it has merged.
- [ ] With option B of decision 2, check the prompt cache first. Run two
      turns of one Claude session, and check that the second turn reads the
      cache in the usage of its result. Save the output under
      `.context/agent-instructions/`. If the check fails, try B with
      `excludeDynamicSections`, and report the result to Cal.
- [ ] Apply the chosen option of decision 2 in
      `runner/src/providers/claude.ts`. With B, pass
      `{ type: 'preset', preset: 'claude_code', append: instructions }`. With
      A, pass the instructions as the whole prompt. With C, pass our own full
      prompt with the instructions.
- [ ] State the base prompt of Claude agents in
      `docs/protocol/agent-instructions.md`.
- [ ] Test that a Claude session start and resume pass the instructions in
      the system prompt option.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

Prove the combined change, review it, and open the pull request.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record follow-up
      items under `plans/follow-ups/` for the rest, re-review once, and
      report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Smoke test in a deployed workspace. Ask each agent which branch and
      repository folder it works in, and who sent the message. Then send a
      message from a second member and ask again. Save the replies under
      `.context/agent-instructions/`.
