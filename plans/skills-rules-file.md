# Rules file of the skills repository

Status: Active. On branch `calummoore/using-optional-path-to-global-agents-md-h5oz`, no pull request yet. Cal chose the approach on 2026-11-28. Decision 4 is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org admin names one public GitHub skills repository in the Skills
section of the org settings. The runner copies it into each cloud computer
and gives only its skill folders to Claude and Codex. Skills decision 3 A
of [PR #426](https://github.com/Firna-AI/conductive/pull/426), chosen on
2026-11-16, says that no rules file of the repository reaches the agents.
Some skills repositories rely on a rules file that every session loads.
Firna-AI/skills keeps it in `global/AGENTS.md`, and its skills name each
other through that file. Cal reported on 2026-11-28 that results got worse
without it.

What happens before this change, checked on 2026-11-28:

- Codex gets no global rules. The runner gives Codex its own home folder,
  `~/.conductive/codex`, and that folder has no `AGENTS.md`.
- Claude gets a global rules file only by accident. An old manual install
  can link `~/.claude/CLAUDE.md`. The runner starts Claude with project
  settings only, but Claude finds that file because it searches the parent
  folders of the repository folder, up to `/home/user`. That old copy does
  not update.
- A new cloud computer without such an install gives neither agent the
  rules.

This change adds an optional rules file to the Skills section. An admin
saves its path inside the skills repository. The lookup suggests
`global/AGENTS.md` when it finds that file. The runner gives the file to
each agent through that agent's own rules-file feature. The change does
not cover rules files that do not come from the skills repository, other
than decision 4.

Contract owners:

- [Org skills](../docs/protocol/org-skills.md#what-loads),
  [The copy](../docs/protocol/org-skills-copy.md), and
  [The list of skills](../docs/protocol/org-skills-list.md).
- [Agent instructions: how each agent gets them](../docs/protocol/agent-instructions-delivery.md).
- The [Cloud computer guide](../src/marketing/docs/cloud-computer.md#share-agent-skills-across-the-org).
- The [runner README](../runner/README.md), the
  [cnd-runner README](../crates/cnd-runner/README.md), the
  [interface README](../crates/cnd-runner-interface/README.md), the
  [Worker app API README](../worker/app-api/README.md), and the
  [migrations README](../migrations/README.md).

## Decisions

Terms:

- **Rules file:** a Markdown file of always-on rules that an agent reads
  in each session, in addition to the rules of the workspace's own
  repository. Claude reads `CLAUDE.md` files. Codex reads `AGENTS.md`
  files.
- **Skills section:** the last section of the Cloud computer tab of the
  org settings. It holds the skills repository and its trust choice.
- **Lookup:** the read of the saved skills repository on GitHub that lists
  its skills in the Skills section. It reads the file tree of the default
  branch.
- **Copy:** the copy of the skills repository in each cloud computer. It
  holds the whole file tree of one commit.

### Decision 1: how the rules reach the agents

Answered on 2026-11-28: Cal chose **B** with "1 = B".

- **A.** The runner adds the file to the agent instructions of each new
  session. Rejected: Claude subagents get no agent instructions. The first
  session of a new workspace can start before the first copy ends, and it
  then misses the rules for its whole life. The rules also stay fixed for
  a session while the skills update at each turn.
- **B (chosen).** The runner writes the file as a `CLAUDE.md` in a fixed
  extra folder that Claude reads, and as `AGENTS.md` in each Codex home.
  Reason: this is how the file was written to load. Most Claude subagents
  get it, and it follows the same commit of the copy as the skills.
- On 2026-11-28, after the options check, the agent moved the Claude file
  from an extra folder to the Claude configuration folder of the runner.
  Reason: Claude reads an extra folder after the repository rules, so the
  org rules would win over the repository rules. This keeps option B.
- Left out: a startup script that installs the file, a session-start
  hook, a block in the first message, an always-on skill, a manifest file
  in the skills repository, rules text in the org settings, and a pointer
  line in each repository's `AGENTS.md`. The brainstorm notes in
  `.context/global-rules/brainstorm.md` give each reason.

### Decision 2: what chooses the rules file

Answered on 2026-11-28: Cal chose **C** with "2 = C". This replaces
skills decision 3 A.

- **A.** The runner loads `global/AGENTS.md` when it exists, with no
  setting. Rejected: a repository that adds the file later changes every
  agent of the org without an admin.
- **B.** An optional path field. An empty field loads a detected
  `global/AGENTS.md`. Rejected for the reason of A.
- **C (chosen).** An optional path field. The lookup only suggests
  `global/AGENTS.md`. Nothing loads until an admin saves a path. Reason:
  no agent of an org changes without an admin's choice, and Firna-AI/skills
  still needs only one Save.
- **D.** As C, and the file loads only while the repository is trusted.
  Rejected: it links two separate risks, and an admin must turn on trust
  for plain text.

### Decision 3: a size limit for the rules file

Answered on 2026-11-28: Cal chose **A** with his own change: "no limit,
but warn on larger file".

- **A (chosen, with a warning).** Conductive sets no limit of its own. A
  file over 32 KiB still loads, and Conductive warns.
- **B.** A limit of 32 KiB. A larger file does not load. Rejected by Cal.
- Left out: a limit that cuts the file, because the rules at its end are
  then lost without notice.

### Decision 4: other rules files in the cloud computer

Open. Asked on 2026-11-28, after Cal asked "what if the user has their
own agents.md?". The options check of 2026-11-28 widened the root
question, and added options D, E, and F. Its report is in
`.context/skills-rules-file/options-check-decision-4.md`.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/sdk-helper/src/providers/claude.ts:182`
- **Terms:**
  - **Repository rules:** the `AGENTS.md` or `CLAUDE.md` files of the workspace's own repository.
  - **Home rules file:** a rules file above the repository folder, such as `~/.claude/CLAUDE.md`, `~/CLAUDE.md`, or a file in `~/.claude/rules/`.
- **Background:**
  - The repository rules keep loading. The design puts the org rules
    file before them for both agents. So the repository rules come last,
    as on a laptop with a global file and a project file.
  - Claude also reads each home rules file. It finds them because it
    searches each parent folder of the repository folder, up to `/home`.
    Every repository folder lies under `/home/user/code`.
  - Codex reads no `CLAUDE.md` file and nothing above the Git root. So a
    home rules file never reaches Codex.
  - An old manual install of a skills repository writes a home rules
    file. That copy never updates.
- **Problem:** After an admin saves a rules file, Claude in such a cloud
  computer gets the org file and the home file. The home copy gets old,
  so the two can conflict. Codex gets only the org file.
- **Impact if no action:** Claude gets old and new rules together, and
  its results can stay worse. Each turn also pays for the rules twice.
- **Root question:** When the org rules file meets other always-on rules
  in the cloud computer, which rules does each agent follow?
- **Options:**
  - **A.** Both load. The runner writes a warning to its log when a home
    rules file exists. The guide tells admins to remove an old install.
    No behaviour of `main` goes away. Effort: Small.
  - **B.** The org rules file wins over `~/.claude/CLAUDE.md` only. While
    an org rules file loads, the runner tells Claude to skip that one file
    with Claude's `claudeMdExcludes` setting, and warns in its log. Other
    home rules files still load. Effort: Small.
  - **C.** The home rules file wins. The runner gives Claude no org rules
    file while `~/.claude/CLAUDE.md` exists. Codex still gets the org file.
    The two agents then follow different rules, and an org update never
    reaches Claude in such a computer. Effort: Small.
  - **D.** The org rules file wins over every home rules file. While an
    org rules file loads, Claude skips each rules file above the
    repository folder, and the runner warns in its log. Claude then reads
    the same sources as Codex. Without an org rules file, Claude reads the
    home files as on `main`. A file that someone placed there on purpose
    does not load while the org has a rules file. Effort: Small.
  - **E.** As D. Also, the org rules file comes before the repository
    rules for Claude, and it does not shrink the room of the repository
    rules in Codex. Effort: Medium.
  - **F.** An admin switch in the Skills section chooses between A and D.
    It adds a setting for a rare case. Effort: Medium.
- **Left out:**
  - Load the org file only when its text differs from the home file.
    Today both hold the same text on this cloud computer. But the home
    copy never updates, so it differs after the next change of the
    repository, and the duplicate comes back.
  - Skip the home file only when it comes from the same repository. The
    copy keeps no history, and the old install on this cloud computer
    names `futex-ai/skills` while the org names `firna-ai/skills`.
  - The runner deletes the old link. It deletes a file that someone in
    the org owns.
  - A personal rules file for each member, in place of the org file or
    beside it. A session takes messages from several members. Skills
    decision 2 A rejected a choice of each member for the same reason.
- **Wider fix:** D, because it covers every home rules file, not one known
  path.
- **Previous examples:** This cloud computer: `~/.claude/CLAUDE.md` links
  `~/.futex/skills/global/AGENTS.md`, last updated on 2026-11-20.
- **Recommendation:** D. The admin's choice then reaches Claude and Codex
  from the same sources, and no old install overrides it. The first
  recommendation was B. The options check recommended E. The design below
  now gives the extra parts of E for every option, so E is the same as D
  in this plan.
- **Action:** ask the user, because D stops files that Claude reads on
  `main` today, and that needs the user's approval.

## Design

Each point is the agent's own call, made on 2026-11-28, unless it names a
decision.

- Storage: a new D1 column `settings.skills_rules_file`, `TEXT NOT NULL
  DEFAULT ''`. A trigger clears it when `skills_repository` changes, as
  `migrations/202611181130_org_skills_repository_trust.sql` clears trust.
  Reason: the previous Worker then never keeps a path of an old
  repository.
- Save: the Worker stores the path as typed, after it trims white space
  and a leading `./`. A Save without the field keeps the saved path, so
  older apps keep working. A Save that changes or removes the repository
  clears the path.
- The Worker adds no new rejection for the path. It applies only the
  string check of the other settings fields, in
  `worker/app-api/feature-shell-access.ts`. The runner checks the path,
  as below.
- Only an admin changes the path, as for the repository. Other members
  see the saved path as text. A suspended org shows it as text to all.
- The sandbox gets the path as `CONDUCTIVE_SKILLS_RULES_FILE`, only with
  a valid skills repository. A changed path applies at the next start or
  resume, as a changed repository does.
- The runner passes the path to the helper in `OrgSkills`, as a new
  optional field. Older helpers ignore it. An older runner gets no rules,
  as it gets no skills.
- At each turn, the helper reads the file from the current copy. It loads
  only a relative path to a regular UTF-8 file that resolves inside the
  copy. For any other path, a missing file, or a failed read, it warns in
  the runner log and loads no rules. No turn fails.
- Before the first copy ends, no rules load, as no skills load.
- Claude: the helper writes the text to `CLAUDE.md` in the Claude
  configuration folder that the runner owns, `~/.conductive/claude`. It
  adds the `user` source to `settingSources`. Claude then reads the org
  rules as user rules, before the repository rules. Reason: the
  repository rules then come last for both agents. Nothing else writes
  user settings in that folder. Milestone 3 confirms that the `user`
  source loads nothing else there. If it does, the fallback is an extra
  folder with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`, which Claude
  reads after the repository rules.
- Codex: the helper writes `AGENTS.md` into the shared Codex home and
  into each session home. It removes these files when no rules load.
  Codex reads its home file before the repository rules.
- Codex counts its home file in its 32 KiB total for rules files, and it
  cuts the repository rules first. So the runner raises
  `project_doc_max_bytes` by the size of the org file. Reason: the org
  file then never cuts the repository rules. Milestone 3 confirms this
  count.
- The file loads without trust. It holds plain text. Claude can follow
  `@` imports in it. An import outside the copy needs approval, and the
  runner gives Claude no approval for it.
- Size, from decision 3: over 32 KiB, the file still loads. The runner
  writes a warning to its log. The lookup sees the size in the file tree,
  and the Skills section shows a notice. Reason for 32 KiB: it is the
  default limit of Codex for its rules files.
- Detection, from decision 2: the lookup suggests only `global/AGENTS.md`.
  It never suggests a root `AGENTS.md` or `CLAUDE.md`. Reason: a root file
  of a skills repository usually holds the rules for work on that
  repository.
- The field label is "Rules file". It sits under the repository field.
  With an empty field and a found `global/AGENTS.md`, the field shows that
  path as a suggestion with one action that fills it.
- The lookup shows whether the saved path exists in the file tree. A
  missing file gives a notice. Save still stores the path.
- No user-facing text names a sandbox provider.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Skills section gets the Rules file field and its notices, for admins,
for members, and for a suspended org.

- [ ] Add the Rules file field to
      `docs/mockups/src/entries/app/org-settings/cloud-computer/skills/`.
- [ ] Add a child page for each state: a found `global/AGENTS.md` with an
      empty field, a saved path that the lookup finds, a saved path that
      it does not find, and a file over 32 KiB.
- [ ] Show the saved path as text for a member who is not an admin.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Replace skills decision 3 A in `docs/protocol/org-skills.md` with
      decisions 2 C and 3 A. State the rules file, its path, detection,
      size warning, and Save rules.
- [ ] State the lookup notices of the rules file in
      `docs/protocol/org-skills-list.md`.
- [ ] State when the rules file updates in
      `docs/protocol/org-skills-copy.md`.
- [ ] State in `docs/protocol/agent-instructions-delivery.md` that the
      rules file of the skills repository reaches the agents as a rules
      file, apart from the agent instructions, and why.
- [ ] State the answer of decision 4.
- [ ] Update the Cloud computer guide in
      `src/marketing/docs/cloud-computer.md`. Read every public guide in
      full for sentences that restate the changed facts.
- [ ] Read the Terms and Privacy pages in full. Update each sentence that
      restates a changed fact. A Terms change also sets its effective date.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Check the agent behaviour

Depends on: none

These checks confirm the facts that the design relies on. Save the
evidence under `.context/skills-rules-file/`.

- [ ] Confirm that Claude reads `CLAUDE.md` of its configuration folder
      with the `user` source, before the repository rules. Confirm that
      the `user` source loads nothing else from that folder.
- [ ] Confirm that a Claude subagent gets that file.
- [ ] Confirm that Codex reads `AGENTS.md` of its home, also in a resumed
      session, and its place in the order of the repository rules.
- [ ] Confirm whether Codex counts its home file in
      `project_doc_max_bytes`, and which file it cuts first.
- [ ] For decision 4 B, D, or E, confirm that `claudeMdExcludes` can
      skip the home rules files.
- [ ] Check two problems that the options check found outside this
      change. Codex may count the agent instructions in its 32 KiB total.
      Claude reads no `AGENTS.md`, so a repository with only `AGENTS.md`
      gives Claude no repository rules. Record a follow-up item for each
      one that holds.
- [ ] Update the design for each result that differs.

## Milestone 4: Storage, Worker, and sandbox settings

Depends on: 2, 3

- [ ] Add the migration with the column and the trigger. Follow
      [Keep the previous Worker working](../migrations/README.md#keep-the-previous-worker-working).
- [ ] Read and save the path in `worker/app-api/feature-settings.ts` and
      `worker/app-api/feature-settings-data.ts`, and in
      `src/shared/org-settings.ts`.
- [ ] Add the found rules file and its size to the lookup in
      `worker/app-api/feature-skills.ts`.
- [ ] Pass `CONDUCTIVE_SKILLS_RULES_FILE` in
      `worker/lifecycle/sandbox-environment.ts`.
- [ ] Add Worker tests for Save, the clear on a changed repository, the
      lookup, and the sandbox environment.

## Milestone 5: Runner and helper

Depends on: 2, 3

- [ ] Read `CONDUCTIVE_SKILLS_RULES_FILE` in
      `crates/cnd-runner/src/config.rs`.
- [ ] Add the optional rules path to `OrgSkills` in
      `crates/cnd-runner-interface/`. Run the type generator.
- [ ] Read and check the file at each turn in the helper. Warn for a
      refused path, a failed read, and a file over 32 KiB.
- [ ] Give the file to Claude and Codex, as the design says.
- [ ] Apply the answer of decision 4.
- [ ] Add tests for the path checks, the size warning, the Claude folder,
      and the Codex homes.
- [ ] Update the runner, cnd-runner, and interface READMEs.

## Milestone 6: Skills section

Tags: ui

Depends on: 1, 4

- [ ] Add the Rules file field, its suggestion, and its notices to
      `src/members/MemberComputerTab.tsx` and
      `src/members/MemberComputerView.tsx`, as the mockups show.
- [ ] Add tests for the field and the notices.
- [ ] Check the section in a browser. Save a screenshot under
      `.context/skills-rules-file/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the Rust checks, and the complete gate named
      in `CLAUDE.md`.
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

- [ ] In a deployed workspace of an org with Firna-AI/skills, save
      `global/AGENTS.md`. Start a new workspace. Confirm that a Claude
      session and a Codex session each follow the rules.
