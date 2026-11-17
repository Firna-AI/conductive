# Org skills repository

Status: Active. On branch `calummoore/oslo-3u7a`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org admin names one GitHub repository of agent skills in a new Skills
section of the Cloud computer tab of the org settings. The agent runner in
each workspace's cloud computer copies that repository when it starts, and
then checks for new commits every 5 minutes. It gives the skills to Claude
and Codex. No turn waits for a copy or a check.

Today no product feature does this. The org can clone a skills repository
from its install script, but the runner starts Claude with only the project
settings (`runner/src/providers/claude.ts:145`). It also moves the config
folders of both agents to `~/.conductive/claude` and `~/.conductive/codex`
(`runner/src/providers/environment.ts:32-33`). So skills in `~/.claude/skills`
and the update hook in `~/.claude/settings.json` never reach the agents of
the app.

The change does not cover: always-on rules files of the repository, such as
`AGENTS.md`, more than one skills repository, a skills repository for each
member, hooks, MCP servers, agents, commands, or settings from the
repository, and a status of the last copy in the app.

Contract owners:

- `docs/protocol/org-skills.md`, a new protocol doc that Milestone 3
  writes.
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

Answered on 2026-11-13: **B**. Changed on 2026-11-16 to **A**.

- Root question: do the always-on rules of the skills repository reach the
  agents too?
- **A.** Skills only. Chosen on 2026-11-16.
- **B.** Also add the repository's rules file to the agent instructions of
  each new session. Chosen on 2026-11-13.
- Reason for the change: the research below shows no common place for
  always-on rules in skills repositories. The user chose to leave the rules
  out for now. The `futex-ai/skills` repository keeps rules in
  `global/AGENTS.md` that its skills rely on. Those rules do not reach the
  agents through this change.
- Research on 2026-11-16, at the user's question about a common pattern.
  The root files of 12 popular skills repositories show no common path for
  always-on rules:
  - No always-on file: `anthropics/skills`, `openai/skills`, and
    `ComposioHQ/awesome-claude-skills`.
  - A root `AGENTS.md`, often with `CLAUDE.md` as a link to it, that holds
    the rules for work on the repository itself: `vercel-labs/agent-skills`,
    `wshobson/agents`, `K-Dense-AI/claude-scientific-skills`,
    `supabase/agent-skills`, `github/awesome-copilot`, and
    `obra/superpowers`.
  - A root `Agents.md` with rules for the users of the skills:
    `microsoft/skills`.
  - A path that a manifest names: `huggingface/skills` names
    `agentsmd/AGENTS.md`, and `obra/superpowers` names `GEMINI.md`, in the
    `contextFileName` field of `gemini-extension.json`. The `GEMINI.md` of
    `obra/superpowers` holds only `@` imports of a skill file.
  - A start hook that adds the text of one skill: the Claude and Cursor
    hooks of `obra/superpowers`.
  - A file that the install script links: `futex-ai/skills`, with
    `global/AGENTS.md`.

### Decisions 4 and 5: withdrawn

Added on 2026-11-13. Withdrawn on 2026-11-16, because decision 3 changed to
A and no rules file loads.

- Decision 4 asked which file is the rules file. Its options were a fixed
  root `AGENTS.md`, a fixed list, a path field in the Skills section, a
  manifest in the repository, a fixed `global/AGENTS.md`, and a list of
  paths. The recommendation was the path field. The options check report
  is in `.context/org-skills-repository/options-check-decision-4.txt`.
- Decision 5 asked how large the rules text can be. The user chose a
  64 KiB limit with a note that names the file path in place of a larger
  text, on 2026-11-16. The options check report is in
  `.context/org-skills-repository/options-check-decision-5.txt`.
- A later change that loads a rules file starts from these records.

### Decision 6: Private skills repositories

Answered on 2026-11-16: **A**, public repositories only. Added on
2026-11-16, from the mockup milestone.

- **Severity:** High. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `image/git-credential-helper.mjs:45-48`.
- **Background:** The runner fetches the skills repository at its start
  and every 5 minutes, outside any agent turn (decision 1). Outside a turn,
  the Git credential helper refuses with "Git gets GitHub access in an
  agent turn". Only `gh` gets a token outside a turn: the workspace owner's
  GitHub user token (github-tokens.md). A user token reaches only the
  repositories where the GitHub App is installed.
- **Problem:** A private skills repository cannot be copied or updated.
- **Impact if no action:** An org with private skills gets no skills, and
  only the runner log says why.
- **Root question:** Whose GitHub access reads a private skills repository
  for every workspace of the org, and where does that access live? The
  options check replaced the first question, "How does the cloud computer
  read a private skills repository when no agent turn runs?", because it
  named the rule of the credential helper.
- **Options:**
  - **A.** Public repositories only. The section says so. A private
    repository gives no skills. Effort: Small.
  - **B.** The runner asks the credential helper for the owner's token, as
    `gh` does outside a turn, only for the skills copy and fetch. This
    changes the rule that Git gets no GitHub access outside a turn. Any
    process in the cloud computer can already get this token, so the
    exposure does not grow. The owner must be able to read the repository.
    Effort: Small.
  - **C.** The runner fetches in the background at the start of each agent
    turn, with the token of the turn's sender. No token rule changes. A
    private repository then updates only while agents work, and its first
    copy waits for the first turn. Effort: Medium.
  - **D.** The admin stores a read-only token or deploy key for the
    repository in the section, as a secret. The runner uses it. Every
    member with a terminal can read it, and someone must renew it. Effort:
    Medium.
  - **E.** The Worker reads the repository with a read-only GitHub App
    installation token for that one repository, and sends the files to the
    runner. No token reaches the cloud computer. It needs a new storage
    path, a size limit, and the GitHub App on the repository. The Worker
    must check at Save that the admin's own sign-in reaches the repository.
    Otherwise an admin could read a private repository of another GitHub
    account. Effort: Large.
  - **F.** The Worker streams the repository archive from GitHub to the
    runner through a new machine route, with a read-only installation
    token, and stores nothing. It needs a new call of the workspace token,
    and archives in place of Git. Added by the options check. Effort:
    Large.
  - **G.** At Save, the Worker records the GitHub App installation and the
    repository ID, only when the admin's own sign-in reaches the
    repository, as the Repositories tab does. Each copy and fetch gets an
    installation token that reads only that repository. Every workspace
    gets the same skills, whatever its owner can read. It changes two
    rules: a workspace sandbox then gets an installation token
    (github-tokens.md), and the workspace token gains one call
    (tokens-and-secrets.md). The token reads only what the copy holds.
    Added by the options check. Effort: Medium.
- **Left out:** The token of the admin who saved the repository, because G
  gives the same result with a token for one repository only.
- **Wider fix:** G. No owner, sender, or turn then changes the read. E and
  F also prevent the class, at Large effort.
- **Previous examples:** `gh` already uses the owner's token outside a
  turn. The image build reads each repository with an installation token
  for that one repository.
- **Recommendation:** G. It gives every workspace the same skills with the
  narrowest token, and decision 7 can check that same access. The first
  recommendation was B, which stays the Small fallback. The options check
  changed it.
- The options check report is in
  `.context/org-skills-repository/options-check-decisions-6-7.txt`.
- **Action:** Ask the user, because the recommended option changes the
  token rules of github-tokens.md and tokens-and-secrets.md.

### Decision 7: A wrong skills repository

Answered on 2026-11-16 with a new option, **H**: "when you add the repo, it
should find the skills available". The section looks up the repository and
lists the skills that it finds. Added on 2026-11-16, from the mockup
milestone.

- **H.** When an admin adds the repository, the section looks it up on
  GitHub and lists the skills that it holds. A repository that is not
  found, is private, or holds no skills shows a notice in place of the
  list. Chosen. Under decision 6 A, this is option G with the list of
  skills added.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `docs/mockups/src/components/settings/SkillsSection.tsx`.
- **Background:** An admin types or pastes the repository. The plan shows
  no status of the copy in the app, and the runner log holds every
  warning. No member reads that log.
- **Problem:** A typo, a repository that the owner cannot read, or a
  repository with no skill folders gives no skills, and nobody sees why.
- **Impact if no action:** Admins believe that agents have skills that they
  do not have.
- **Root question:** How does an admin learn, at Save and later, whether
  each workspace gets skills from the repository, and why not? The options
  check replaced the first question, "How does an admin learn that the
  skills repository gives no skills?", because under decision 6 B or C the
  result can differ for each workspace.
- **Options:**
  - **A.** No sign in the app. The runner log holds the warning. Save takes
    any text. Effort: Small.
  - **B.** Save stays off for text that is not `owner/name` or a GitHub
    link. At Save, the Worker asks GitHub, with the admin's sign-in,
    whether the repository exists, and refuses the Save when it does not.
    This is a new rejection. It cannot see what the owner can read.
    Effort: Medium.
  - **C.** As B, but Save still stores the value, and a notice under the
    field says that the repository was not found or has no skills. No
    rejection beyond the text format. Effort: Medium.
  - **D.** Each runner reports the result of its last copy: the commit, the
    number of skills, or the failure. The section shows the newest result
    of the org. It shows each real failure, also an owner without access.
    It adds a new report from the runner to the Worker. Effort: Large.
  - **E.** The field lists the repositories that the admin's sign-in
    reaches, as the Repositories tab does, and still takes typed text. A
    picked repository cannot be a typo. It needs a mockup change, and the
    list is slow for many installations. Added by the options check.
    Effort: Medium.
  - **F.** As D, but the Worker keeps the last result of each workspace.
    The section lists each workspace without skills and its cause, also a
    workspace whose older runner sends no result. Added by the options
    check. Effort: Large.
  - **G.** As C, but the check uses the access of the copy, not the
    admin's. Under decision 6 G, it uses the org installation. Under
    decision 6 A, it checks that the repository is public. It runs again
    each time the section loads. Added by the options check. Effort:
    Medium.
- **Left out:** None.
- **Wider fix:** F. It reports every cause of a missing skill in each
  workspace. The newest result of the org, in D, can hide a failed copy in
  another workspace.
- **Previous examples:** The install script shows its build log and its
  result on the Cloud computer tab.
- **Recommendation:** G. C uses the admin's own access, so it can call a
  private repository found when the copy cannot read it. If decision 6
  takes B or C, choose F, because only F shows an owner without access.
  The first recommendation was C. The options check changed it.
- **Action:** Ask the user, because B and C add new checks at Save, and D
  adds a new report.

## Design calls

Each call was made by the agent on 2026-11-13, or on 2026-11-16 for the
calls from the mockup milestone and from decisions 6 and 7.

- The runner reads the repository with no GitHub token. It runs Git with
  no credential helper and no prompt, so a private or missing repository
  fails at once and the runner warns. Reason: decision 6 A.
- The Worker looks up the repository when an admin saves it and each time
  the section loads. It stores no list. Reason: the list then follows the
  repository, as the copies of the runner do.
- The lookup reads the repository record and the file tree of its default
  branch through the GitHub API, with the GitHub sign-in of the member who
  views the section. Reason: one tree request finds every skill, and a
  sign-in gives a higher GitHub rate limit than no token.
- The list gives the name of each skill folder that the runner loads, in
  name order. It gives no descriptions. Reason: a description needs one
  more request for each skill.
- A repository that is private, not found, or holds no skill gives a
  notice in place of the list. Save still stores the value. Reason: a
  refusal at Save is a new rejection, and the user did not ask for one.
- A file tree that GitHub cuts short gives the skills that it holds, and a
  note says that the list can be incomplete.
- A failed lookup, such as a GitHub outage, gives a notice that the skills
  cannot be listed now. The saved repository stays.

The agent made the calls below on 2026-11-16, from the mockups of
Milestone 2.

- A member sees the list and each notice. The notices of a private
  repository and of a repository that is not found say that an admin can
  act. In a suspended org they name no action. The other notices read the
  same for each viewer. Reason: the lookup runs for each viewer, so a
  member whose agents get no skills learns why, as with the repository
  notice of decision 241.
- The notice of a repository that is not found says that GitHub has no
  public repository with that name. Reason: GitHub also answers "not
  found" for a private repository that the sign-in of the viewer cannot
  see.
- The list and its notices belong to the saved repository. Unsaved text in
  the field changes neither of them. Reason: the lookup runs only at Save
  and at each load of the section.
- A failed lookup gives the notice that the app shows for each part that
  did not load, "The list of skills did not load", with Try again. Try
  again loads the section again. Reason: the Cloud computer tab of the app
  shows each failed load in this way.
- A cut file tree that holds no skill gives only the note of the cut, not
  the notice of a repository without skills. Reason: its skills can lie
  after the cut, and the runner copies the whole repository.

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
- The runner copies and fetches with Git.
- A failed copy or fetch keeps the last good copy, writes a warning to the
  runner log, and fails no start and no turn. Reason: the graceful-handling
  rule, and the precedent of the context folder (repository-folders.md).
- The runner moves its copy to a new commit only after a complete fetch.
  A fetch never leaves a half-written skill folder.
- The runner and the lookup load each folder at any depth under `skills/`
  that holds a `SKILL.md`, also a folder whose name starts with a dot. They
  do not look inside a folder that holds a `SKILL.md`, and they skip
  `.git`. A repository without a `skills/` folder gives each folder at its
  top level that holds a `SKILL.md`. When two skill folders have the same
  name, the first in path order loads, and the runner warns. One shared
  function holds this rule. They load no hooks, MCP servers, agents,
  commands, or settings. Reason: `anthropics/skills` and `futex-ai/skills`
  use `skills/<name>/`, `openai/skills` uses `skills/.curated/<name>/` and
  `skills/.system/<name>/`, and `ComposioHQ/awesome-claude-skills` uses
  top-level folders. Hooks and the rest run code that no agent chose.
  Changed on 2026-11-16 by the agent, from `skills/<name>/` only, after
  the mockups found the layout of `openai/skills`.
- A repository without a `skills/` folder that holds a `SKILL.md` at its
  top level is one skill. Added on 2026-11-16 by the agent, from the
  documentation milestone.
- Save trims spaces and line breaks at both ends. Added on 2026-11-17 by
  the agent, from the UI milestone, because a pasted link often carries
  them.
- Text that is neither `owner/name` nor a GitHub link is saved as typed.
  The lookup shows the notice of a repository that is not found, and the
  runner copies nothing and warns. The runner and the lookup check the
  name before they use it in a URL or a command. Reason: a refusal at Save
  is a new rejection. Added on 2026-11-16 by the agent.
- A lookup whose viewer has an expired GitHub sign-in shows the app's
  existing sign-in error, not the notice that GitHub is not available.
  Added on 2026-11-16 by the agent.
- The Worker always sets the start variable, empty when the org has no
  repository. Reason: an org env var with the same name then cannot
  choose a repository. Added on 2026-11-16 by the agent.
- An empty Save removes the repository. At its next start, the runner
  deletes its copy, and the agents get no skills from it.
- The runner keeps its copy under the name of its repository. When the
  start variable names another repository, the runner deletes the old copy
  before it copies the new one. A failed first copy gives no skills. It
  never keeps the skills of the old repository.
- When a skill of the workspace's own repository has the same name, the
  repository's skill wins, as Claude's own order gives it.
- Skills change at the next turn of each session.
- The app shows no status of the last copy in this change. The runner log
  holds the warnings. A status in the app can follow later.
- A sandbox with an older runner ignores the setting until a build installs
  the new runner (agent-runner.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Cloud computer tab of the org settings gets a Skills section.

- [x] Add a Skills section to the Cloud computer tab mockup, in
      `docs/mockups/src/components/settings/ComputerTab.tsx`, last, after
      Environment variables. Its words are in `skillsCopy.ts`.
  - [x] Admin state: a repository field with `owner/name` text, a short
        description, and Save. Page `cloud-computer`.
  - [x] Empty state: no repository chosen. Pages `cloud-computer/skills`
        and `cloud-computer/first-build`.
  - [x] A pasted GitHub link. Page `cloud-computer/skills/pasted-link`.
  - [x] Read-only state for a member who is not an admin. Pages
        `cloud-computer/member` and `cloud-computer/member/no-skills`, and
        the suspended org page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. The
      screenshots are in `.context/org-skills-repository/screens/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show. This added decisions 6 and 7 and three design calls.

## Milestone 2: Mockups of the skills list

Tags: mockup

Depends on: 1

Decisions 6 A and 7 H add states to the Skills section.

- [x] Say in the description of the section that the repository must be
      public.
- [x] Show the list of skills that the lookup finds, for an admin and for a
      member. Pages `cloud-computer`, `cloud-computer/member`, and the
      suspended org page.
- [x] Add the notices for a private repository, a repository that is not
      found, a repository with no skills, a list that can be incomplete,
      and a lookup that fails. Keep each page at five screens or fewer.
      Child pages `private`, `not-found`, `without-skills`, `incomplete`,
      and `lookup-failed` of `cloud-computer/skills`, which now shows only
      its canonical screen. Its `pasted-link` variant moved into its own
      folder and kept its path. Variants `private-skills` and
      `skills-not-found` of `cloud-computer/member` show the notices of a
      member.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. The
      screenshots are in `.context/org-skills-repository/screens-m2/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show. This added five design calls.
  - `openai/skills` keeps its skills one folder deeper, in
    `skills/.curated/<name>/` and `skills/.system/<name>/`. The design
    call about the folder layouts now loads skill folders at any depth
    under `skills/`.

## Milestone 3: Documentation and protocol

Depends on: 2

- [x] Write `docs/protocol/org-skills.md` with the requirements and
      decisions 1, 2, 3, 6, and 7. Link it from `docs/protocol/README.md` and from
      `workspaces-and-sandboxes.md`.
  - `docs/protocol/README.md` links the list of protocol docs in
    `docs/architecture/protocol-docs.md`, so the link went into that list.
    The doc cites the decisions of this plan as skills decisions.
- [x] Update `github-tokens.md`: the skills copy uses no GitHub token, and
      the lookup uses the viewer's GitHub sign-in.
- [x] Update `orgs-and-members.md` and `command-palette-actions.md` when the
      new section needs a row or an admin rule.
  - `orgs-and-members.md` and `workspaces-and-sandboxes.md` got the admin
    rule. `orgs-and-members.md` passed 250 lines, so its Delete org
    section moved to `delete-org.md`.
  - The palette needs no new row. Its Settings tab has one row for each
    tab of the org settings, and the Cloud computer row opens the tab that
    holds the Skills section.
- [x] State the folder layouts that load in a public guide under
      `src/marketing/docs/`.
- [x] Read both legal pages and every public guide in full. Update each
      sentence that the change makes wrong.
- [x] Update the rows `skills`, `instruction-files-and-skills`, and
      `sync-agent-configs` of the comparison page under
      `src/marketing/from-conductor/areas/`.
- [x] Add the new variable to `runner/configuration.md`.

## Milestone 4: Worker setting

Depends on: 3

- [x] Add a D1 migration with a `skills_repository` column on `settings`.
- [x] Read and write the setting in `worker/app-api/feature-settings.ts`
      and `feature-settings-data.ts`. Only an admin writes it. Normalize a
      GitHub link to `owner/name`. An empty value removes it.
- [x] Add the lookup of decision 7 H: the repository record and the file
      tree of its default branch, with the viewer's GitHub sign-in. Return
      the skill names, or the cause of a notice. Run it at Save and at each
      load of the settings.
  - Agent call on 2026-11-16: use `GET /api/orgs/:orgId/settings/skills`.
    A separate route keeps a GitHub failure out of the settings read and
    Save. Milestone 6 calls it on section load and after Save.
- [x] Add the field to `src/shared/org-settings.ts`.
- [x] Pass `CONDUCTIVE_SKILLS_REPOSITORY` in
      `worker/lifecycle/sandbox-environment.ts`, at create and at resume,
      always, and empty without a repository. List it in the start
      variable table of `image/README.md`.
- [x] Put the folder rule of the design calls in one pure function under
      `src/shared/`, which takes a list of file paths. The lookup and the
      runner both use it.
- [x] Tests: the admin rule, the normalized value, the start variable, and
      the lookup with a fake GitHub server: skills found in each layout, a
      private repository, not found, no skills, a cut tree, and a failure.
  - Verification and the existing commit-author fixture failure are in
    `.context/org-skills-repository/m4/test-evidence.md`.

## Milestone 5: Runner skills copy

Depends on: 4

- [x] Confirm with the installed Agent SDK (0.3.318) and Codex (0.167.0)
      how each agent loads skills from a folder outside the repository.
      Prefer a way that keeps each skill's own name. Record the result in
      this plan.
  - Confirmed on 2026-11-17. Claude's `supportedCommands()` keeps names
    through `additionalDirectories` with only `.claude/skills` links.
    Codex's `skills/list` confirms `skills/extraRoots/set` with each
    selected folder, including hidden folders. It also scans
    `$CODEX_HOME/skills` and `$HOME/.agents/skills`. No plugin loads.
  - Agent call on 2026-11-17: disable nested skill files through Codex's
    per-process `skills.config`. Codex otherwise loads them too. Their
    content stays available. Each turn starts a fresh provider process
    with the latest complete copy, before conversation resume.
  - Probe scripts and output: `.context/org-skills-repository/m5/`.
- [x] Add `runner/src/skills-repository.ts`: copy at start, check every
      5 minutes, swap to a new commit only after a complete fetch, warn on
      failure. Run Git with no credential helper and no prompt. Delete the
      copy of a removed or replaced repository. Use the shared folder
      function of Milestone 4.
- [x] Confirm which skill each agent loads when the workspace's own
      repository has a skill with the same name. Make the workspace's skill
      win, or record what the agents allow and update `org-skills.md`.
  - The runner omits org skills with a repository name clash. Claude
    otherwise exposes the org duplicate under a qualified name. Codex
    lists both copies. Both binaries confirm that the filtered setup
    exposes only the workspace's skill. No protocol change is needed.
- [x] Give the skill folders to Claude in `runner/src/providers/claude.ts`
      and to Codex in `runner/src/providers/codex.ts`.
- [x] Tests with a local Git repository: first copy, update, failed fetch
      keeps the last copy, no setting, and a turn that does not wait.
  - Test costs, repeated runs, failure proofs, binary probes, and check
    results: `.context/org-skills-repository/m5/test-evidence.md`.
- [x] Update `runner/README.md`.

## Milestone 6: Skills section in the app

Tags: ui

Depends on: 1, 2, 4

- [x] Add the Skills section to `src/shell/settings/ComputerTab.tsx`, as the
      mockup shows. Admins edit it. Use the words of
      `docs/mockups/src/components/settings/skillsCopy.ts`.
  - The shell imports `skillsCopy.ts` and the pure parts `SkillList`,
    `Notice`, and `InlineText` from the mockups, as it imports
    `envVarCopy.ts`. The section is `src/shell/settings/SkillsSection.tsx`.
  - Agent call on 2026-11-17: Enter in the field saves, as in the name
    field of the General tab. A failed save shows the toast "The skills
    repository was not saved" with the message of the API.
- [x] Add the read-only section to the member view in
      `src/members/ComputerSections.tsx` and `MemberComputerView.tsx`.
  - The members UI imports only the words of `skillsCopy.ts`, and draws
    the list, the row of the repository, and the inline code with its own
    parts, as its README requires. `MemberComputerView` takes the lookup
    as `skills` and `onRetrySkills`. `MemberComputerTab` loads the lookup
    on its own.
- [x] Show the skills list and its notices, as the mockups of Milestone 2
      show. An expired GitHub sign-in shows the app's existing sign-in
      error.
  - `ComputerModel` looks up the skills at each opening of the tab and
    after each Save that succeeds. `shownSkills` in
    `src/app/skills-lookup.ts` chooses the list or the notice for both
    tabs.
  - A failed request of the lookup, such as an expired GitHub sign-in,
    shows "The list of skills did not load" with the message of the API
    and Try again, as the other GitHub reads of the settings do.
  - The dev fake answers the lookup, with `?skills=<state>` for each state
    of the mockups. The browser check is in
    `.context/org-skills-repository/screens-m6/` and
    `.context/org-skills-repository/m6/`.
- [x] Add the search word `skills` to the Cloud computer row of the command
      palette.
- [x] DOM tests for the admin state, the empty state, a pasted link, the
      read-only state, the skills list, and each notice.
  - `src/shell/settings/SkillsSection.test.tsx`, `member-skills.test.tsx`,
    `src/members/skillsSection.test.tsx`, `MemberComputerTab.dom.test.tsx`,
    and a search case in `src/app/palette/commands-tabs.test.ts`.

## Milestone 7: Port the skills copy to the Rust runner

Depends on: 4, 5, 6

The merge of `main` on 2026-11-17 brought #342, which replaced the
TypeScript runner with a Rust runner in `crates/cnd-runner` and keeps only
the agent SDK code in TypeScript, in `runner/sdk-helper/`. The merge took
`main`'s runner, so the skills code of Milestone 5 left the tree. Commit
`21b2c0582` keeps it as the reference for this port. The protocol doc
stays as it is. Design call of 2026-11-17, by the agent: the Rust runner
owns the copy, and the SDK helper owns the folder rule and the agent
setup. Reason: the helper can import the shared folder function from
`src/shared/`, so the rule stays in one place.

- [x] Read `CONDUCTIVE_SKILLS_REPOSITORY` in `crates/cnd-runner/src/config.rs`.
      Check the name with the same rules as `isSkillsRepository`.
- [x] Copy the repository at the runner start in the background, and check
      it every 5 minutes. Use Git with a clean environment, no credential
      helper, no prompt, and a time limit. Swap to a new commit only after a
      complete fetch. Delete the copy of a removed or replaced repository.
      Warn on each failure, and fail no start and no turn.
- [x] Give the helper the folder of the current copy in its options, in
      `crates/cnd-runner-interface/src/sdk_helper_options.rs`, and
      regenerate the helper types.
- [x] Port the selection and the agent setup of Milestone 5 to
      `runner/sdk-helper/`: the shared folder function, the Claude links in
      an extra folder, the Codex extra roots, and the name clash rule.
- [x] Tests in Rust and in the helper, as in Milestone 5.
- [x] Update `runner/README.md`, `runner/configuration.md`,
      `crates/cnd-runner/README.md`, and
      `docs/architecture/sandbox-software.md`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
- [x] Change the "planned" wording of the Cloud computer guide, the
      Terms, and the Privacy page to the shipped feature. `main` deleted
      the comparison page in #380, so its three rows are gone.
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
