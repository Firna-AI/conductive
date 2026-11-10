# Mac command secret advice

Status: Active. On branch `calummoore/mac-command-output-privacy`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

With a Mac command, an agent asks to run a command on the Mac of the
member who sent its turn, and that member allows it in the Mac app. The
chat shows the command and its output to every member of the org, in the
Mac command card and in session copies. The server keeps them while the
org exists. So a command such as `env` or `cat ~/.npmrc` can show the
secrets of one member's Mac to the whole org.

On 10 November 2026 the user chose tool advice (decision 255): the Mac
command tool tells the agent to keep secret values out of the command and
its output. The chat keeps showing the output. The change does not hide
the output, and it does not change the Mac app or the server. Decision
256 asks whether a guard backs up the advice.

Contract owners:

- [Agent tools](../docs/protocol/agent-tools.md#mac-commands).
- The [workspace tools README](../tools/README.md).

## Decisions

The options check of 10 November 2026 is merged into both decisions. Its
report is in `.context/mac-command-secret-advice/options-check.md`.

### 255. Keep secret values out of Mac command output

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `tools/mcp-tools.ts:7`, `tools/cli.ts:17`, and "Mac commands" in `docs/protocol/agent-tools.md`.
- **Background:** The chat shows each Mac command and its output to every member of the org. The session copy puts the output in a code block. The server keeps both while the org exists. Decision 62 only asked that the agent gets the output.
- **Problem:** Nothing tells the agent to keep secret values out of the command and its output. So a secret of one member's Mac can reach every member of the org, and it stays stored.
- **Impact if no action:** One allowed command can expose a member's Mac secrets to the whole org, for as long as the org exists.
- **Root question:** How does a secret value from a member's Mac stay with that member, out of the chat, the stored record, the agent, and the agent's model provider? The options check gave this question, because the user's words also keep the value from the agent.
- **Options:**
  - **A.** The card and the copy leave out the output and show its size. The server still sends the output to each browser. Effort: Small.
  - **B.** Only the agent's tool route returns the output, while its turn runs. The server erases it at the end of the turn. The agent's session log in the cloud computer still holds it. Effort: Medium.
  - **C.** The Mac app never sends the output. The agent gets only how the command ended, so it cannot read anything from the Mac. Effort: Medium.
  - **D.** B, and the Mac app shows the output to the sender in its own window. Effort: Large.
  - **E.** The tool tells the agent to keep secret values out of the command and its output. The chat keeps showing the output. An instruction is not a guard, so the sender's approval stays the check. Effort: Small.
- **Left out:**
  - A view of the output for the sender only: the agent can repeat the output in its answer, and every member reads that answer.
  - An "Allow and show the output" choice: it brings the output back.
  - Masking as the whole fix: a scanner misses private files and unknown formats.
  - A sandbox for every Mac command, as the whole answer: the login shell still loads the secrets of the environment, and it stops reviewed commands that need the blocked files, such as `git push`.
  - A fixed set of Mac actions in place of shell commands: it breaks the exact command of decision 62.
  - Change nothing: it fails the goal.
- **Wider fix:** C. Only C keeps every secret on the Mac, whatever command the agent writes and whatever format the secret has. The options check changed it from B, because B fails when the agent repeats the output.
- **Previous examples:** None found in the plans, the follow-ups, the pull requests, or earlier workspaces.
- **Recommendation:** The agent recommended B before E existed. The options check keeps E, as the user chose.
- **Decision:** The user chose E on 10 November 2026: "what we really need is tool advice - make sure any secret values are not output from the command".
- **Reason:** In the user's words, tool advice is what is needed. The agent's reading: the danger is the secret values, and the agent and the members keep the output that they need.

The brainstorm also raised "The agent can repeat the output in its
answer". It closed on 10 November 2026 with E, because its problem
assumed that the chat hides the output. With the output in view, a quote
adds no new reader.

### 256. Back up the advice when the agent ignores it

Status: open. It does not block Milestones 1 to 3.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `desktop/src/device/output.ts:6`, where the Mac app collects the output, and `worker/devices/`, where the server stores it.
- **Terms:**
  - **Saved choice:** Always allow, or Allow all commands for 15 minutes, which run a command on the Mac without a question.
  - **Masker:** code that finds well-known secret formats in text and replaces each found value with a mark.
- **Background:**
  - Decision 255 gives the agent advice. The sender reads each command before it runs and can deny it. A saved choice skips that review.
  - Text that the agent reads, such as a pull request, can ask it to print a secret.
  - The advice can fail also when the agent follows it. For example, `curl -v` prints an `Authorization` header.
  - A member's terminal in the cloud computer can ask for a command without the tool, so it never reads the advice.
  - The agent reads the result from the stored record. So a value that the server hides before it stores the result is hidden from the agent too.
- **Problem:** The advice is a request, not a guard. When a command prints a secret anyway, the secret reaches the chat, the copies, the agent, and its model provider.
- **Impact if no action:** A command under a saved choice, or one that the sender allows without care, can still expose a secret to the whole org.
- **Root question:** How does a secret value stay out of the chat, the stored record, the agent, and its model provider when a Mac command prints it anyway?
- **Options:**
  - **A.** Change nothing more. The sender's approval stays the only check, and a saved choice skips it. Effort: Small.
  - **B.** The approval in the Mac app says that every member of the org sees the output. It needs a mockup and a UI change. A saved choice still skips it. Effort: Medium.
  - **C.** A masker on the server hides well-known secret formats before it stores the result: private key blocks, known token prefixes, and the values of lines such as `API_TOKEN=...`. The agent then gets the hidden form too. It covers older Mac apps. The secret still passes through the server, and a secret with no known format passes. Effort: Medium.
  - **D.** The Mac app runs the same masker before the output leaves the Mac. The secret then reaches neither the server, the agent, nor its model provider. A Mac app from before the change sends the output as it is. Effort: Medium.
  - **E.** The Mac app asks again, also under a saved choice, for a command that reads a known secret file or prints the environment. It adds a new gate, and an alias or a copied file gets past it. Effort: Medium.
  - **F.** D and C together, with one masker module in `src/shared/` that has no imports. It also covers Mac apps from before the change, and new formats ship with each deploy. A Mac app from before the change still sends the secret to the server. Effort: Medium.
  - **G.** The workspace Durable Object applies the Secret mark to each Mac command record. Screens and the copy then hide each exact copy of an org secret value in the command, the folder, the reason, and the output. It finds any format, but only for values that the org marked as secret. It changes "Secrets that users enter" in `docs/protocol/tokens-and-secrets.md`. Effort: Medium.
  - **H.** The server erases the output of each Mac command a fixed number of days after its result, and the card says that the output was removed. Members can read the output until then, and a copy keeps it. It deletes chat data that `origin/main` keeps, changes the Privacy page, and needs a mockup state. Effort: Medium.
  - **I.** The Mac app runs each command under a saved choice in a macOS sandbox profile that denies reads of known secret files, such as `~/.ssh`, `~/.aws`, and `~/.npmrc`. It works also for an encoded value. The macOS tool for such profiles, `sandbox-exec`, is deprecated, and values in the environment still pass. It changes decision 62 and needs tests on a real Mac. Effort: Large.
- **Left out:**
  - A view of the output for the sender only, also under a saved choice only: the agent can repeat the output, and every member reads its answer.
  - A clean environment for the command: the login shell loads the profile again, with its exported secrets.
  - A server refusal of risky command text: it breaks the rule that the person at that Mac decides what runs on it. E makes the same check on the Mac.
  - A hold of each output under a saved choice until the sender sends it: it breaks the saved choices of decision 62.
  - A hold of only the outputs in which the masker finds a value: F finds the same values without a question and a wait.
  - A notice to the sender after each command under a saved choice: the output is already in the chat.
- **Wider fix:** F. It works for every command, every sender of a request, and every Mac app. It must know each secret format, so it is still a detection fix. For a new format, only H protects the stored record, and only I protects the listed files.
- **Previous examples:** The Secret mark of decision 133 hides each exact copy of an org secret value in runner events. CI services hide registered secrets in their logs in the same way.
- **Related:** `plans/follow-ups/mac-command-records-skip-secret-mark.md`, the same code. G closes it.
- **Recommendation:** F. The options check changed it from D. F keeps the protection of D at the source and adds the same masker on the server, so a Mac app that has not updated is covered too.
- **Action:** ask the user, because F adds new behaviour at a boundary that no requirement covers, and the user asked for advice only.

## Design

These are the agent's design calls, made on 10 November 2026.

- One advice text lives in `tools/mcp-tools.ts`. The description of
  `run_mac_command` and the CLI help both use it, so they cannot drift.
  Reason: each new file in `tools/` must also join the image source
  contract in `tools/image-manifest.ts`.
- The advice text:

  > Every member of the org can read the command, its folder, its
  > reason, and its output in the workspace chat, and they stay stored.
  > Keep every secret value out of all four, such as a token, a password,
  > a private key, or a credential. Write the command so that it prints
  > no secret value, and avoid options that print credentials, such as
  > `curl -v`. To check a secret, print only whether it exists or its
  > name. For example,
  > `awk 'BEGIN { for (name in ENVIRON) print name }'` lists the names of
  > the environment variables.

- The example uses `awk`, not `env | cut -d= -f1`, because `cut` passes
  the further lines of a value with line breaks, such as a private key.
- A change of the tool sources makes a new software image version,
  because the version hashes the install command. A new org gets the
  advice from that image. An org that already has an org image gets it
  at its next build, not at a refresh, because a refresh keeps the
  installed tools.
- No new test. A test of the advice text would check a copied constant,
  which the `testing` skill says protects nothing.
- The Mac app guide tells the sender that every member sees the output,
  so the sender denies a command that would print a secret.
- The comparison page keeps its statuses, because the change ships,
  starts, or drops no listed feature.
- 255 and 256 are the next free decision numbers on `origin/main` on
  10 November 2026. Renumber them before the merge when `main` takes them
  first.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol doc states the advice as a requirement, with its decision and
its risk. The legal pages and the guides stay true.

- [ ] Add a "Secret values" part to "Mac commands" in
      `docs/protocol/agent-tools.md`. It says that the tool tells the
      agent that every member can read the command, its folder, its
      reason, and its output, and that they stay stored. It says that the
      tool tells the agent to keep secret values out of all four
      (decision 255). It gives the rejected hiding of the output with its
      reason, and the risk that the advice is not a guard.
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Add the sender's check to the
      approval part of `src/marketing/docs/mac-app.md`, under the rules of
      `docs/protocol/website-docs.md`.
- [ ] Add the advice to "Mac commands" in `tools/README.md`.

## Milestone 2: The advice in the tools

Depends on: 1

- [ ] Add the advice text to `tools/mcp-tools.ts`, and add it to the
      description of `run_mac_command`.
- [ ] Add the same text to the `mac run` part of the help in
      `tools/cli.ts`.
- [ ] Run the tool tests: `npm run test -- worker/tools worker/devices`.

## Milestone 3: Verification, commit, review, and pull request

Depends on: 1, 2

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

- [ ] After the deploy, build the org image of a test org, or create a new
      org. When the build is ready, start a workspace. Ask the agent for
      the description of `run_mac_command`, and check that it holds the
      advice.
