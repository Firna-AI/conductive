# Org skills repository

Status: Active. On branch `calummoore/oslo-3u7a`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org admin names one GitHub repository of agent skills in a new Skills
section of the Cloud computer tab of the org settings. The agent runner in
each workspace's cloud computer copies that repository when it starts, and
then checks for new commits every 5 minutes. It gives the skills to Claude
and Codex. It also adds the repository's rules file to the agent
instructions of each new session. No turn waits for a copy or a check.

Today no product feature does this. The org can clone a skills repository
from its install script, but the runner starts Claude with only the project
settings (`runner/src/providers/claude.ts:145`). It also moves the config
folders of both agents to `~/.conductive/claude` and `~/.conductive/codex`
(`runner/src/providers/environment.ts:32-33`). So skills in `~/.claude/skills`
and the update hook in `~/.claude/settings.json` never reach the agents of
the app.

The change does not cover: more than one skills repository, a skills
repository for each member, hooks, MCP servers, agents, commands, or settings
from the repository, and a status of the last copy in the app.

Contract owners:

- `docs/protocol/org-skills.md`, a new protocol doc that Milestone 2
  writes.
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- [GitHub tokens](../docs/protocol/github-tokens.md).
- The [runner README](../runner/README.md) and
  [runner configuration](../runner/configuration.md).

## Decisions

### Decision 1: How the skills reach the agents

Answered on 2026-11-13: **B**, with the user's change to its update timing.

- Root question: how do the agents of each workspace get the skills of a
  chosen GitHub repository, and stay on its latest version?
- **A.** A skills flag on a repository of the Repositories tab. The image
  build copies it. A running workspace never gets updates, and the GitHub
  App must reach the repository.
- **B.** A Skills setting. The runner copies the repository in the cloud
  computer and gives the skills to both agents. Chosen.
- **C.** The Worker keeps a copy of the repository and sends it to each
  runner. No GitHub token reaches the cloud computer, but it needs a new
  storage path and a size limit.
- Left out: the plugin marketplaces of the agents, because the Agent SDK
  does not download a marketplace and a plugin also loads hooks. The
  install script alone, because Claude does not read it and it has no
  settings section. Skills through the workspace tools, because agents find
  skills only from files. Bot pull requests that copy the skills, because
  each update then needs a merge in every repository.
- The user's timing: the runner copies the repository at its start, then
  checks for updates every 5 minutes and fetches them. A turn never waits.
  The 5-minute check before a turn, in the first text of option B, was
  replaced.
- Reason: running workspaces stay current within minutes, and the change
  needs no new token type, storage, or provider route.

### Decision 2: Who sets the skills repository

Answered on 2026-11-13: **A**, an org admin.

- Root question: who chooses the skills that the agents of a workspace use?
- **A.** An org admin, in a Skills section of the Cloud computer tab. Other
  members see it read-only. Chosen.
- **B.** Each member, on the Account page.
- **C.** Both, combined.
- Reason: the reason of decision 57 applies. A skills repository changes the
  work of every agent of the org, as a script or an env var does.

### Decision 3: Rules file from the skills repository

Answered on 2026-11-13: **B**.

- Root question: do the always-on rules of the skills repository reach the
  agents too?
- **A.** Skills only.
- **B.** Also add the repository's rules file to the agent instructions of
  each new session. Chosen.
- Reason: the user chose it. The `futex-ai/skills` repository keeps rules in
  `global/AGENTS.md` that its skills rely on.

### Decision 4: Which file is the rules file

Open. Added on 2026-11-13.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None.
- **Background:** Decision 3 adds the rules file of the skills repository
  to the agent instructions. The `futex-ai/skills` repository keeps the
  rules for every agent in `global/AGENTS.md`. Its root `AGENTS.md` holds
  the rules for work on that repository itself.
- **Problem:** No rule says which file of the repository is the rules file.
  The root `AGENTS.md` is the common name, but it is the wrong file for
  `futex-ai/skills`.
- **Impact if no action:** The runner cannot load a rules file, and the
  build of decision 3 waits.
- **Root question:** Who states which file of the skills repository holds
  the always-on rules, so that each new session gets the right rules, also
  after the repository changes? The options check replaced the first
  question, "How does the runner find the rules file?", because it hid who
  states the file.
- **Options:**
  - **A.** A fixed path: `AGENTS.md` at the root. In each checked
    repository that has this file, it holds the rules for work on that
    repository, not rules for every agent. Examples are `futex-ai/skills`
    and `obra/superpowers`. So A loads the wrong rules for them. Effort:
    Small.
  - **B.** A fixed list: `global/AGENTS.md`, then `AGENTS.md`. The first
    file that exists wins. It fits `futex-ai/skills` without a setting. A
    repository with only a root `AGENTS.md` gives its contributor rules to
    every session. Effort: Small.
  - **C.** An optional "Rules file" path field in the Skills section, next
    to the repository. Empty means no rules file. The admin chooses the
    file, and no repository layout is assumed. It adds one field to the
    section and its mockup. A moved file removes the rules until an admin
    changes the field. Effort: Small.
  - **D.** The skills repository names its rules file in a small manifest
    at a fixed path, such as `.conductive/skills.json`. A move of the file
    and of its name land in one commit, and reach new sessions within
    5 minutes. It is a new file format that only Conductive reads. A
    repository without the manifest gives no rules, and the org cannot add
    one without a fork. Added by the options check. Effort: Medium.
  - **E.** A fixed path, `global/AGENTS.md` only. It fits `futex-ai/skills`
    with no setting, and never loads a root `AGENTS.md`. The layout of one
    org becomes a product rule, and an admin cannot take the skills without
    the rules. Added by the options check. Effort: Small.
  - **F.** A list of paths in place of one path, in C or in D. The runner
    joins the files in the listed order. No checked repository needs it.
    Added by the options check. Effort: Small, on top of C or D.
- **Left out:**
  - All Markdown files of the repository, because they would include the
    skill files and readme files.
  - One file for each agent, such as `CLAUDE.md` and `AGENTS.md`, because
    both agents must get the same agent instructions.
  - Rules text that the admin types into the Skills section, because
    decision 3 takes the rules from the repository.
  - The link targets of the repository's own install script, because the
    runner runs no code from the repository.
- **Wider fix:** D. The repository states the path in the same commit as
  the file, so the rule stays right when the layout changes.
- **Previous examples:** `scripts/install.sh` of `futex-ai/skills` links
  `global/AGENTS.md` to `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`.
  `obra/superpowers` names its context file in its
  `gemini-extension.json`.
- **Recommendation:** C. It is the only option that gives the right rules
  for each checked repository with no change to that repository. D best
  protects against a later move of the file.
- The options check report is in
  `.context/org-skills-repository/options-check-decision-4.txt`.
- **Action:** Ask the user, because the options trade a field in the
  settings against a guess of the repository layout.

### Decision 5: Size of the rules text

Open. Added on 2026-11-13, from a problem that the options check of
decision 4 found.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `runner/src/file-access.ts`, `runner/src/instruction-state.ts`.
- **Background:** Decision 3 puts the rules file into the agent
  instructions of each new session. The agent sends the instructions with
  every model request of that session. The runner's general file read
  allows up to 5 MiB.
- **Problem:** No limit stops a large rules file from filling the context
  of every session. A new limit is a new rejection, so it needs the user.
- **Impact if no action:** A large rules file makes every model request of
  the org slower and more costly. A very large file can exceed the context
  of the model, and every new session then fails.
- **Root question:** How does each session keep a bounded context, and
  still follow the org rules, when the rules file is very large? The
  options check replaced the first question, "What happens when the rules
  file is very large?", because it named only the size.
- **Options:**
  - **A.** No new limit. The 5 MiB read limit applies. A large file can
    fill or exceed the context of each session. Effort: Small.
  - **B.** A limit of 64 KiB. A larger file gives no rules text. The runner
    writes a warning to its log, and the skills still load. No member reads
    that log, so the org rules go away without notice. Effort: Small.
  - **C.** A limit of 64 KiB. A larger file gives its first 64 KiB, with a
    note at the cut. The agents then follow rules that are not complete.
    Effort: Small.
  - **D.** A limit of 64 KiB. A larger file gives a short note in place of
    the text. The note names the file path in the runner's copy, its size,
    and the limit. The agent reads the file with its tools, and it can tell
    the member. The rules then have the weight of a tool result, and a
    summary of the conversation can drop them. Added by the options check.
    Effort: Small.
  - **E.** C, and the note at the cut also names the file path. The cut
    falls at the end of a line. Added by the options check. Effort: Small.
  - **F.** The runner checks the size at each fetch. A new commit with a
    file over the limit keeps the last good rules text. A first copy gives
    no rules. Workspaces of one org can then follow different rules without
    notice. Added by the options check. Effort: Medium.
- **Left out:**
  - A limit in tokens, because the runner has no tokenizer for both
    models, and a byte limit protects the context as well.
  - A model summary of the file, because it changes the org's words.
  - A limit that the admin sets, because it must stay under the context of
    the model anyway.
- **Wider fix:** D, with the limit on the whole rules part of the
  instructions, not on one file read. The limit then still holds when
  decision 4 F joins several files.
- **Previous examples:** The 5 MiB read limit of the runner. Codex cuts its
  own `AGENTS.md` text at 32 KiB. The `global/AGENTS.md` of
  `futex-ai/skills` is about 5 KiB.
- **Recommendation:** D. It bounds each session as B does, but the rules
  stay reachable, and the agent knows why they are not in its
  instructions. The first recommendation was B. The options check changed
  it.
- The options check report is in
  `.context/org-skills-repository/options-check-decision-5.txt`.
- **Action:** Ask the user, because the recommended option adds a new
  limit.

## Design calls

Each call was made by the agent on 2026-11-13.

- The setting holds one repository as `owner/name`. The form also takes a
  `https://github.com/owner/name` link and saves it as `owner/name`. Reason:
  members copy links from GitHub.
- The runner follows the head of the repository's default branch, as the
  image refresh does (org-image.md).
- The Worker gives the repository to the runner as a start variable, as it
  gives the branches. A changed setting applies at the next start or resume
  of each workspace, as a changed env var does. Reason: the workspace token
  then gains no new call (tokens-and-secrets.md).
- The runner keeps its copy in `~/.conductive/skills/repository`, outside
  every repository folder. Reason: the copy then shows in no Changes list.
- The runner copies and fetches with Git. Git gets a token from the existing
  credential helper only when GitHub asks for one. Outside a turn, the
  helper gives the workspace owner's token (github-tokens.md). So a public
  repository needs no token, and a private one needs an owner who can read
  it.
- A failed copy or fetch keeps the last good copy, writes a warning to the
  runner log, and fails no start and no turn. Reason: the graceful-handling
  rule, and the precedent of the context folder (repository-folders.md).
- The runner moves its copy to a new commit only after a complete fetch.
  A fetch never leaves a half-written skill folder.
- The runner loads only the folders under `skills/` that hold a `SKILL.md`.
  It loads no hooks, MCP servers, agents, commands, or settings. Reason:
  those run code that no agent chose.
- When a skill of the workspace's own repository has the same name, the
  repository's skill wins, as Claude's own order gives it.
- A session keeps the rules file text of its start, as the agent
  instructions require. A new session gets the text of the current copy.
  Skills change at the next turn of each session.
- The rules text goes into the agent instructions under its own heading,
  after the facts of the workspace.
- The runner reads the rules file only as a regular file inside its copy,
  with `withReadFile` from `runner/src/file-access.ts`. It follows no link
  that leaves the copy. Reason: a link to a file such as
  `/proc/self/environ` would put the workspace token into the
  instructions.
- The runner reads the rules file after each copy and each fetch, and keeps
  the text in memory. Reason: the instruction builder in
  `runner/src/engine-input.ts` is synchronous.
- The runner state keeps each distinct rules text once, and each saved
  session names the text it started with. Reason: each session must keep
  its text for its whole life, and the state file is written again at each
  event (`runner/src/state.ts`).
- A rules path that leaves the copy, or names no file, gives no rules text
  and a warning in the runner log. The Worker refuses no path at save.
  Reason: a refusal at save is a new rejection.
- The app shows no status of the last copy in this change. The runner log
  holds the warnings. A status in the app can follow later.
- A sandbox with an older runner ignores the setting until a build installs
  the new runner (agent-runner.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Cloud computer tab of the org settings gets a Skills section.

- [ ] Add a Skills section to the Cloud computer tab mockup, in
      `docs/mockups/src/components/settings/ComputerTab.tsx`, after the
      startup script section.
  - [ ] Admin state: a repository field with `owner/name` text, a short
        description, and Save.
  - [ ] Empty state: no repository chosen.
  - [ ] Read-only state for a member who is not an admin.
  - [ ] The rules file field, only if decision 4 chooses C.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/org-skills.md` with the requirements and
      decisions 1 to 4. Link it from `docs/protocol/README.md` and from
      `workspaces-and-sandboxes.md`.
- [ ] Update `agent-instructions.md`: the instructions can hold the rules
      file of the org skills repository. Say how its naming rules and its
      no-secret rule apply to text that the org writes.
- [ ] Update `github-tokens.md`: the runner's copy of the skills repository
      uses the credential helper outside a turn.
- [ ] Update `orgs-and-members.md` and `command-palette-actions.md` when the
      new section needs a row or an admin rule.
- [ ] Read both legal pages and every public guide in full. Update each
      sentence that the change makes wrong.
- [ ] Update the rows `skills`, `instruction-files-and-skills`, and
      `sync-agent-configs` of the comparison page under
      `src/marketing/from-conductor/areas/`.
- [ ] Add the new variable to `runner/configuration.md`.

## Milestone 3: Worker setting

Depends on: 2

- [ ] Add a D1 migration with a `skills_repository` column on `settings`,
      and the rules file column if decision 4 chooses C.
- [ ] Read and write the setting in `worker/app-api/feature-settings.ts`
      and `feature-settings-data.ts`. Only an admin writes it. Normalize a
      GitHub link to `owner/name`.
- [ ] Add the field to `src/shared/org-settings.ts`.
- [ ] Pass `CONDUCTIVE_SKILLS_REPOSITORY` in
      `worker/lifecycle/sandbox-environment.ts`, at create and at resume.
- [ ] Tests: the admin rule, the normalized value, and the start variable.

## Milestone 4: Runner skills copy

Depends on: 3

- [ ] Confirm with the installed Agent SDK (0.3.318) and Codex (0.167.0)
      how each agent loads skills from a folder outside the repository.
      Prefer a way that keeps each skill's own name. Record the result in
      this plan.
- [ ] Add `runner/src/skills-repository.ts`: copy at start, check every
      5 minutes, swap to a new commit only after a complete fetch, warn on
      failure.
- [ ] Give the skill folders to Claude in `runner/src/providers/claude.ts`
      and to Codex in `runner/src/providers/codex.ts`.
- [ ] Read the rules file into the agent instructions of each new session,
      with `withReadFile` and the limit of decision 5. Test a link that
      leaves the copy.
- [ ] Keep each distinct rules text once in the runner state, and let each
      saved session name its text.
- [ ] Tests with a local Git repository: first copy, update, failed fetch
      keeps the last copy, no setting, the rules text in a new session, and
      a turn that does not wait.
- [ ] Update `runner/README.md`.

## Milestone 5: Skills section in the app

Tags: ui

Depends on: 1, 3

- [ ] Add the Skills section to `src/shell/settings/ComputerTab.tsx`, as the
      mockup shows. Admins edit it. Other members see it read-only.
- [ ] DOM tests for the admin state, the empty state, and the read-only
      state.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
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

- [ ] After a build installs the new runner, set the org skills repository
      to `futex-ai/skills` and check that a new Claude session and a new
      Codex session list its skills.
- [ ] Ask the user whether to remove the manual skills install from the org
      install script.
- [ ] Record a follow-up item: every warning about the skills copy reaches
      only the runner log, which no member reads. A status in the app is
      left for a later change.
