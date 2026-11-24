# Skill tabs

Status: Active. On branch `calummoore/skill-widget-tab-page-dtzl`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A skill chip shows a skill, such as `/findings`, in the composer of a
workspace chat and in a sent message. Today a press on the chip opens
nothing, as [Skill chips](../docs/protocol/skill-mentions.md#skill-chips)
says. A member sees only the description, in the title of the chip. On
2026-11-24, Cal asked that a click on a skill chip open the skill as a tab
page, with a screenshot of the chip of the org skill `findings`.

This change makes a press on a skill chip open a skill tab in the tab row
of the centre column. The skill tab shows the `SKILL.md` text that the
agent reads, as Markdown, with a Source view. The browser asks for a skill
by its agent and its name. The runner finds the file in its latest skills
scan, reads it, and sends its text. The Worker hides secret values in the
text. The skills report still holds no path. The change does not cover the
other files of a skill folder, an edit of a skill from the tab, the skills
that come with the Claude agent program, or the list of `/`.

Short name of this change in decision numbers: skill tab decision.

Contract owners:

- [Skill mentions](../docs/protocol/skill-mentions.md), for the press on a
  chip and the new section on skill tabs.
- [Temporary tabs](../docs/protocol/temporary-tabs.md) and
  [The tab row](../docs/protocol/tab-row.md).
- [The agent runner](../docs/protocol/agent-runner.md), for the skill read
  command and its `hello` field.
- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md), for the
  secret filter of the skill text.
- The [chat README](../src/chat/README.md), the
  [Files README](../src/files/README.md), and the
  [UI README](../src/ui/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).
- The Privacy page in `src/marketing/privacy.ts` and the public guides in
  `src/marketing/docs/`, for each sentence that restates a changed fact.

## Decisions

### Skill tab decision 1: How a skill chip opens the skill

Answered on 2026-11-24 by Cal: **B**.

- Root question: how does a press on a skill chip show the member the
  skill that the agent uses, from each place that a skill comes from?
  The options check of 2026-11-24 reworded it, because the first text
  asked two questions.
- Background: a skill comes from one of four places: the repository's
  Claude skill folder, the repository's Codex skill folders, the shared
  Codex home, or the copy of the org skills repository. The last two lie
  outside the repository folder. A file tab reads only files of the
  repository folder. The skills report holds no path, by design.
- **A.** The runner writes a copy of each listed skill to
  `.context/skills/<agent>/<name>.md`. The chip opens the copy in a file
  tab. Up to 400 extra files show in All files and in the folder where the
  agents work. Agents can edit stale copies. Older runners write none.
  Effort: Medium.
- **B.** A new runner command reads one skill by its agent and its name.
  The browser sends no path. The Worker hides secret values. A new skill
  tab shows the text as Markdown, with a Source view. It covers all four
  places. Effort: Large. Chosen.
- **C.** The Worker reads the `SKILL.md` of an org skill from GitHub with
  the member's GitHub sign-in. A repository skill opens its file tab. A
  skill of the Codex home still opens nothing. The text can differ from
  the copy that the agent loads. It needs a new Terms revision. Effort:
  Large.
- **D.** As B, but the runner sends every skill text with each report, and
  the Worker keeps them. The tab then works while the cloud computer
  sleeps. The texts can pass the limits of a runner event and of the
  memory of the workspace object by far. Effort: Large.
- **E.** As B, plus a list of the other files of the skill folder, each of
  which opens. It needs more read rules in the runner. Effort: Large.
- **F.** The chip opens a file tab at a path that the runner reserves,
  such as `.context/skills/<agent>/<name>.md`. The runner answers a read
  of that path with the skill text of its latest scan, and writes no
  file. It needs no new tab kind and no new Worker route, and older apps
  show the tab. Risk: Copy path gives a path that no disk holds, the title
  is a file name without the skill icon, and an older runner answers "not
  found". Effort: Medium. Added by the options check.
- **G.** As B, plus each sent message keeps the text that its turn loaded
  for each skill chip, so a sent chip shows the version that the agent
  ran. Cost: storage outside the chat events, because one text can pass
  the limit of a runner event, and a read at each turn. Effort: Large.
  Added by the options check.
- Left out: change nothing, because it does not meet the goal. A popover
  on the chip, because Cal asked for a tab. Repository skills only,
  because the `findings` chip would still open nothing. A link to the
  skill on GitHub, because it opens no tab of the app and a skill of the
  Codex home has no GitHub page. A second read-only folder in All files,
  because E gives the same files for the goal with fewer changes, and a
  list of every skill in All files is outside the goal. The first text
  also left out "a file tab with an invented path". The options check
  brought it back as F, because a file read goes to the runner also for an
  older app.
- Shared assumptions: the chip opens the skill in the composer and in a
  sent message (the request, and file chips work the same way). The skill
  opens in the tab row (the request). The tab shows the text that the
  agent loads ([Skill sources](../docs/protocol/skill-sources.md)). C
  drops the last one.
- Reason: B covers every place that a skill comes from, shows the text
  that the agent reads, and keeps the paths of the cloud computer in it.
  The options check kept B: it names the skill and its agent, and it shows
  no path that does not exist on disk. B is also the wider fix, because a
  new place for skills needs no change to the read.

### Skill tab decision 2: Temporary or kept skill tab

Answered on 2026-11-24 by Cal: **A**.

- Root question: when a member looks at skills and files one after
  another, which of their tabs stay in the row? The options check of
  2026-11-24 reworded it, because the options also decide whether a skill
  replaces a file in the temporary tab.
- **A.** The skill opens in the temporary tab. The next press on a skill,
  a file, or a diff replaces it. A keep makes it a kept tab, as for a
  file. This changes the rule "Only a file or diff tab can be temporary"
  of [Temporary tabs](../docs/protocol/temporary-tabs.md). Effort: Small.
  Chosen.
- **B.** Each skill opens a kept tab. No rule changes, but the row fills
  up. Effort: Small.
- **C.** A second replaceable tab for skills only. A press on a file or a
  diff replaces only the temporary tab of files. Cost: two temporary tabs
  can stand in the row, and Escape and Keep must act on the one that
  shows. It changes the rule of decision 284 B that the row holds at most
  one temporary tab. Effort: Small. Added by the options check, which
  brought it back from the first left-out line, because decision 284 B
  never weighed one temporary tab for each kind of tab.
- Left out: a skill that opens in the place of the shown tab, because it
  would replace a tab that the member chose.
- Reason: a press on a chip is a quick look, and file chips work the same
  way. The options check kept A, because one temporary tab for every kind
  of tab keeps the row shortest. The rule of A covers each tab that a
  press opens for a look, not a fixed list of kinds, so a later tab kind
  needs no rule change.

## Design calls

Each call below is my call, made on 2026-11-24 unless it says otherwise.

- **The agent of a chip.** A chip in a sent message opens the skill of
  the agent of that message's choice. A chip in the composer opens the
  skill of the agent of the model chosen now. When that agent has no such
  skill, the chip opens the skill of the other agent, as `findSkill` does
  for the title. The title of a sent chip follows the same choice. Reason:
  the chip then shows the skill that the agent of the message ran.
- **The identity of a skill tab.** A skill tab names its agent and its
  skill name. Its title is the skill name, and its icon is the skill icon.
  Reason: two agents can hold skills with one name and different texts.
- **The text of the tab.** The runner sends the text that the agent
  reads. For an org skill, that is the safe view of
  `runner/sdk-helper/src/providers/skill-metadata.ts`, which the helper
  already builds for an agent start. Reason: the tab must not show text
  that the agent does not get.
- **No path leaves the cloud computer.** The command carries the agent and
  the name only. The runner finds the path in the lists of its latest
  scan. A name that the lists do not hold gets "not found". Reason: the
  browser cannot name a file of the cloud computer, and the report rule
  "no path" stays.
- **The org copy of the read.** For an org skill, the runner does not use
  the path of its latest scan. It takes a lease on the current copy, as a
  scan does, and the helper chooses the named skill again in that copy.
  Reason: the path of the latest scan points to the copy of that scan,
  and the sweep can remove that copy after a newer copy publishes.
  Changed on 2026-11-24 after the options check.
- **Size.** A `SKILL.md` over 1 MiB gets "too large", the limit of the
  scan in `runner/sdk-helper/src/skill-read.ts`. Reason: the scan already
  leaves out such a skill, so the list never holds it.
- **Secrets.** The Worker hides each exact copy of a secret value and the
  tokens in the text, as for the text of a file tab. Reason: a skill text
  is text of a repository, as a description is.
- **The view.** The tab shows the name and the description in its header.
  The Preview view shows the Markdown body without the front matter. The
  Source view shows the whole text. Reason: the Markdown preview draws no
  front matter.
- **Notices.** The tab shows one line in place of the text in these cases:
  the skill is no longer in the list, the text is too large, the cloud
  computer is stopped or starting, or the runner of the current start is
  older and has no skill read. No line names a sandbox provider. A
  stopped cloud computer acts as for a file tab.
- **Fresh text.** The tab reads the text each time it shows, and again
  after each skills report while it shows. Reason: a change of a skill
  then shows without a reload, at the cost of one read per report. Cost:
  the runner sends a report only when a name, a description, or a
  manual-only mark changes. So an edit of the body alone shows at the next
  show of the tab. Changed on 2026-11-24 after the options check.
- **The address.** A skill tab has an address in the workspace, as a file
  tab has: `skills/<agent>/<name>` after the workspace. Back, a reload,
  and a copied link open the skill tab from it, as the temporary tab of a
  file opens from its address. Added on 2026-11-24 after the options
  check.
- **Repository skills.** A repository skill also opens the skill tab, not
  its file tab. Reason: one press gives one kind of tab, and the title of
  a file tab shows only `SKILL.md`.
- **The saved view.** The view route carries skill tabs in their own
  fields: `skillTabs` with each place in the row, `activeSkill`, and
  `temporarySkill`. `tabs`, `activeTab`, and `temporaryTab` never hold a
  skill tab. Reason: older copies of the app, such as an older Mac app,
  refuse a tab kind that they do not know
  (`src/shared/workspace-view-wire.ts`).
- **The stored view.** The stored JSON of the view in
  `workspace_views.view_json` also keeps skill tabs in their own fields,
  not in `tabs`. Unlike Preview tabs, which the stored JSON keeps in
  `tabs`. Reason: the previous Worker refuses the whole stored view when
  `tabs` holds a kind that it does not know
  (`worker/app-api/workspace-view.ts`). Added on 2026-11-24 after the
  options check. Milestone 4 checks that the previous Worker ignores the
  new fields.
- **One temporary tab.** A save without `skillTabs` comes from an older
  app, and it keeps the stored skill tabs. When such a save names a
  temporary file or diff, the stored temporary skill tab closes. Reason:
  the row holds at most one temporary tab. Added on 2026-11-24 after the
  options check.
- **A phone.** A skill tab acts as a file tab does on a phone.
- **The tab menu.** A skill tab gets the items that each tab gets, such as
  Close and Close other tabs. It gets no Copy path, because it has no
  path.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the skill tab and the pressable chips before the code, so the design
problems show first.

- [ ] Add a mockup of the skill tab under `app/skill-mentions/tab`: the
      tab row with the temporary skill tab, the header with the name and
      the description, the Preview view, and the Source view.
- [ ] Draw each notice of the skill tab: loading, no longer available, too
      large, cloud computer stopped, and older runner software.
- [ ] Show the chip as pressable in a sent message and in the composer,
      with its hover state, in `app/skill-mentions/chips`.
- [ ] Add the open of a skill tab to the flow `user-flows/use-a-skill`.
- [ ] Draw the kept skill tab and the skill tab on a phone.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of this plan in the protocol
docs, so that the milestones below build to them.

- [ ] `docs/protocol/skill-mentions.md`: replace "A press on a skill chip
      opens nothing" with the open of the skill tab. Add a section "Skill
      tabs" with the identity, the text, the view, the notices, and the
      fresh text. Keep the rule that the report holds no path.
- [ ] `docs/protocol/temporary-tabs.md`: a file, diff, or skill tab can be
      temporary.
- [ ] `docs/protocol/tab-row.md`: the row also shows skill tabs, and their
      tab menu.
- [ ] `docs/protocol/workspace-links.md` or the doc that owns the tab
      addresses: the address of a skill tab.
- [ ] `docs/protocol/agent-runner.md`: the skill read command, its result,
      its errors, and the `hello` field that announces it.
- [ ] `docs/protocol/tokens-and-secrets.md`: the filter of the skill text.
- [ ] Read the Privacy page, the Terms page, and each public guide in
      full. Update each sentence that restates a changed fact, such as
      what the app shows of a skill.
- [ ] Update the chat, Files, and UI READMEs for the new parts.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The skill read in the runner

Depends on: 2

Add the command that reads one skill by its agent and its name.

- [ ] In `crates/cnd-runner-interface/`, add the `skill.read` command with
      a request ID, the agent, the name, and the byte limit. Add its
      result `skill.read.result`: the text and the description, or an
      error of `skill_not_found`, `skill_unavailable`, or
      `skill_too_large`. Add the optional `hello` field `skill_reads`.
- [ ] Run the generator of the shared runner types, and commit
      `src/shared/generated/`.
- [ ] In `crates/cnd-runner/`, answer the command. For a skill of the
      agent's own folders, find the path in the lists of the latest scan.
      For an org skill, take a lease on the current copy and let the
      helper choose the named skill in it again.
- [ ] In `runner/sdk-helper/`, read the file with the limit of the scan,
      and give the safe view of an org skill, as an agent start does.
- [ ] Add a runner test: an org skill read after a newer copy publishes
      reads the newer copy.
- [ ] Send `skill_reads: true` in `hello`.
- [ ] Add Rust tests and helper tests: a repository skill of each agent,
      an org skill with its safe view, an unknown name, a name of the
      other agent, a file that left the disk, and a file over the limit.
- [ ] Run the Rust checks and `npm run test --prefix runner`.

## Milestone 4: The skill read and the saved view in the Worker

Depends on: 3

Give the browser the skill text, and save skill tabs.

- [ ] Add a route that reads one skill of a workspace by its agent and
      its name. It checks the member's access to the workspace, as the
      file content route does. It sends the command only on the runner
      connection, and it calls no provider route.
- [ ] Check the agent and the name: the agent is `claude` or `codex`, and
      the name holds 1 to 256 characters without white space or control
      characters.
- [ ] Hide secret values and tokens in the text and the description, as
      for the text of a file tab.
- [ ] Answer a runner without `skill_reads` and a stopped cloud computer
      with error codes that the app shows as notices.
- [ ] Save skill tabs in `skillTabs`, `activeSkill`, and `temporarySkill`
      of the view route and of the stored JSON, never in `tabs`. A save
      without `skillTabs` keeps the stored skill tabs, as for Preview
      tabs. When such a save names a temporary file or diff, the stored
      temporary skill tab closes.
- [ ] Check that the previous Worker reads a stored view with the new
      fields. Record the result under `.context/skill-tabs/`.
- [ ] Add Worker tests: access, the filter, each error, an older runner,
      a view round trip with an older app, and one temporary tab after a
      save of an older app.

## Milestone 5: The skill tab in the app

Tags: ui

Depends on: 4

Make the chips pressable and show the skill tab.

- [ ] Give `SkillChip` an opener in a sent message and in the composer
      field. A plain press opens the skill tab. The chip in the composer
      stays one unit of the text.
- [ ] Add the skill tab kind to the view, the tab row, and the temporary
      tab, with a keep as for a file tab.
- [ ] Add the address `skills/<agent>/<name>` of a skill tab to the
      router, so that Back, a reload, and a link open it.
- [ ] Add the skill tab view: the header, the Preview view with the
      Markdown view of the files, the Source view, and the notices.
- [ ] Read the text each time the tab shows, and after each skills report
      while it shows.
- [ ] Add DOM tests: a press in a sent message and in the composer, the
      agent choice, the temporary tab and its keep, each notice, and the
      tab menu.
- [ ] Check the screen in a browser against the mockups. Save the
      screenshots under `.context/skill-tabs/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the Rust checks, and the complete gate
      named in `CLAUDE.md`.
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

- [ ] After the deploy, open a skill tab from an org skill chip and from a
      repository skill chip in a production workspace.
