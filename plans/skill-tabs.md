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
  chip, and its linked page [Skill tabs](../docs/protocol/skill-tabs.md).
- [Skill sources](../docs/protocol/skill-sources.md), for the skills that
  the list leaves out (skill tab decision 3).
- [Stop and resume](../docs/protocol/stop-and-resume.md), for the start of
  a stopped cloud computer at the open of a skill tab, and for the wait
  while a Resume runs (skill tab decision 5).
- [Tools of a workspace](../docs/protocol/workspace-tools.md), for a file
  or diff tab while a Resume runs (skill tab decision 5).
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

## Review decisions

The review of round 1 raised these three decisions. Each changes a
requirement or adds a refusal, so Cal answered them on 2026-11-25.

### Skill tab decision 3: The files that a skill read opens

Answered on 2026-11-25 by Cal: **B**.

- Source: review round 1, finding 1, with its problem on `origin/main` in
  the Claude scan.
- Root question: which files may the skill reads of the runner open
  through a link?
- Background: the browser asks for a skill by its agent and its name. The
  runner takes the path from its latest scan, and the helper opens it.
  The open followed links, and the helper checked only that the file was
  a regular file. So a `SKILL.md` in a skill folder of the repository
  could link to any file that the helper can read, such as a
  configuration file. The skill tab then showed that file, and the Claude
  list took its first line as the description. Each member who can open a
  skill tab can already read such a file from a terminal. The runner
  already removes each link that leaves the copy of the org skills.
- **A.** Keep the reads as they are. State in the protocol that a skill
  read and the scan follow a link. Cost: a documented risk that a skill
  tab or the list of `/` shows text from outside the skill folders.
  Effort: Small.
- **B.** The shared reader of the helper accepts for a `SKILL.md` only an
  opened regular file whose own name is `SKILL.md`. It checks the opened
  file, not the path. It covers the scan, the skill tab, the org skill
  choice, and the export. It skips the copy of the org skills, whose links
  the runner already confines, and the reads of `agents/openai.yaml`.
  Cost: a new refusal. A `SKILL.md` that links to a file of another name
  leaves the list and the tab, and the agent can still load it. Effort:
  Small. Chosen.
- **C.** Confine each read to the folders of the skill sources of its
  agent. Cost: a new refusal, and a root for each folder that the Codex
  app server lists, such as the Codex home. Effort: Medium.
- **D.** Read the skill files in a process that sees only the approved
  skill folders. Cost: a new refusal, and process isolation in the runner
  release. Effort: Large.
- Left out: a check of the path before the open, because a link can
  change between the check and the open.
- Reason: one small check confines every skill read, and it keeps each
  skill whose file is a real `SKILL.md`. A, the documented risk, was not
  chosen: the tab and the list show the text to each member.
  [The read](../docs/protocol/skill-tabs.md#the-read) and
  [Skill sources](../docs/protocol/skill-sources.md#the-sources-of-the-skills)
  state the rule.

### Skill tab decision 4: The access checks of a skill read

Answered on 2026-11-25 by Cal: **B**.

- Source: review round 1, finding 21.
- Root question: how long after access ends may a skill read still return
  text, and which part of the Worker enforces it?
- Background: the Worker checked the access of the member only when the
  request came. The read then waited in the queue of the runner
  connection, whose send checks only the workspace token of the runner.
  The reply went back with no second check. A removal from the org
  signals only the workspaces that the removed member owns. Each skill
  read ends after 30 seconds, so its text could reach a former member up
  to 30 seconds after the access ended. Decision 70 accepts that window
  for an open tab. The file and diff reads have the same start check.
- **A.** Keep the start check and the limit of 30 seconds, and state the
  window in the protocol. Cost: a documented risk. Effort: Small.
- **B.** Give the reads through the runner one shared operation that
  checks the access of the caller before it sends the command, and again
  before it returns the reply. Use it for the skill route. A caller whose
  access ends gets the reply of a caller without access, and no text.
  Cost: a new refusal. Effort: Medium. Chosen.
- **C.** Check the access again in the outer feature router of the
  workspace, after each handler returns. Cost: a new refusal on every
  feature route on `origin/main`, such as the services, the terminal, and
  the previews. Effort: Medium.
- **D.** Track each pending read under the access grant of its caller.
  Cancel the read when the grant ends, and check the access again before
  the reply. Cost: new state for each grant, and a new refusal. Effort:
  Large.
- Left out: a second check written only into the skill route, because B
  makes the same checks in one place that the file and diff reads can
  also use.
- Reason: B puts both checks where the Worker acts for the caller, so a
  new kind of read cannot miss them. A, the documented window, was not
  chosen: a former member could still get one private skill text. The
  file and diff reads keep their start check in this change.
  `plans/follow-ups/file-reads-after-access-ends.md` asks whether they
  use the shared operation.
  [The read](../docs/protocol/skill-tabs.md#the-read) states the rule.

### Skill tab decision 5: What shows while a Resume runs

Answered on 2026-11-25 by Cal: **B**.

- Source: review round 1, findings 61 and 42, and their wider fix. It
  changes how the file, diff, and Preview tabs on `origin/main` show a
  start.
- Root question: how does a member see that the open of a tab, or a press
  on Resume, has started the cloud computer?
- Background: the open of a file, diff, Preview, or skill tab in a stopped
  workspace sends a Resume (decision 247). Until the reply of that Resume
  or the next state event, the header showed Stopped. A tab without
  content showed "Sandbox stopped" with a busy Resume button. Only the
  Resume of the open of the workspace showed Starting and the wait at
  once. A held Resume reply showed the problem in the review.
- **A.** Change nothing. Cost: the prompt to start stays for the time of
  each reply. Effort: Small.
- **B.** Treat the pending state of each Resume as the Resume of the open
  is treated. From a Resume that a tab open or a press asks for, until its
  reply or the next state event, every page and tool shows the wait with
  no Resume, and the header shows Starting. A failed Resume returns to the
  stopped state. Cost: after a press on Resume, a panel shows the wait in
  place of a busy Resume button, also on a phone. Effort: Small. Chosen.
- **C.** Carry the Resume of a tab open as a flag of its own to the page
  of a file, diff, or skill tab, which then shows the wait until the
  reply. A pressed Resume keeps its busy button. Cost: the header, the
  Preview tab, and the tools still show the stopped state then. Effort:
  Small.
- **D.** Let the workspace model show a local Starting state from the
  Resume request until the reply or the start event. Every reader of the
  state then shows the start, also the bar of the chat. Cost: it also
  changes the manual Resume in each place. Effort: Medium.
- **E.** Give the workspace one shared state for each automatic start:
  the Resume of the open and each Resume of a tab open. The header and
  each part read it until the reply, the start event, or a failure. A
  pressed Resume keeps its busy button. Cost: a new state that replaces
  the one of the open. Effort: Medium.
- Left out: a change of the Resume reply alone, because the time before
  the reply still shows the stopped state. A navigation that waits for the
  reply, because it hides the page that the member chose. A wait for the
  skill tab only, because it breaks the rule that a skill tab acts as a
  file tab does.
- Reason: one small change gives every tab, every tool, and the header the
  wait that the Resume of the open already shows. Cal approved the change
  of the file tabs on `origin/main`.
  [The resume](../docs/protocol/stop-and-resume.md#the-resume) states the
  rule.

## Design calls

Each call below is my call, made on 2026-11-24 unless it says otherwise.

- **The agent of a chip.** A chip in a sent message opens the skill of
  the agent of that message's choice. A chip in the composer opens the
  skill of the agent of the model chosen now. When that agent has no such
  skill, the chip opens the skill of the other agent. The title of a sent
  chip follows the same choice. Reason: the chip then names the skill that
  the agent of the message has now, in its current text. Corrected on
  2026-11-24 after the review: the first reason said that the chip shows
  the skill that the agent of the message ran. But a turn gets a skill
  only from the list of its own agent, and the tab shows the current text.
- **The identity of a skill tab.** A skill tab names its agent and its
  skill name. Its title is the skill name, and its icon is the skill icon.
  Reason: two agents can hold skills with one name and different texts.
  - The header names the agent of the skill in each skill tab, such as
    "Claude skill" or "Codex skill", after the name. The title of the tab
    stays the name. Reason: two open tabs of one name then show whose text
    each holds, and the title rule of the row stays. Rejected: no agent
    name, because a member can read the text of the wrong agent, and an
    agent name in the title only when two titles clash, because it adds a
    rule to the tab row. Found by the mockups on 2026-11-24.
- **The text of the tab.** The runner sends the text that the agent
  reads. For an org skill, that is the safe view of
  `runner/sdk-helper/src/providers/skill-metadata.ts`, which the helper
  already builds for an agent start. Reason: the tab must not show text
  that the agent does not get. Changed on 2026-11-25 by skill tab decision
  3 B: outside the copy of the org skills, the runner reads a `SKILL.md`
  only when it opens a regular file of that name, so a link to a file of
  another name shows no text, although the agent can load it.
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
  scan in `runner/sdk-helper/src/skill-read.ts`. Reason: a page of that
  size is too long to read in a tab. Corrected on 2026-11-25 after review
  finding 70: the list can hold an org skill over 1 MiB, because the
  agent loads it, so the tab shows the notice.
- **Secrets.** The Worker hides in the text what the workspace hides in a
  runner event, as for a skill description, and also each exact copy of
  the workspace token and of the turn tokens. Reason: a skill text is text
  of a repository, as a description is. A file tab does not filter its
  text, so the filter of a file tab is not the model. Corrected on
  2026-11-24 after the docs milestone found that the first text pointed to
  the file tab filter, which hides only the path label.
- **The view.** The tab shows the name and the description in its header.
  The Preview view shows the Markdown body without the front matter. The
  Source view shows the whole text. Reason: the Markdown preview draws no
  front matter.
  - The header has the look of the header of a file tab. Its first line
    holds the skill icon and the name in the quiet chip of a path, and the
    switch between Preview and Source at its end. The description follows
    under that line, muted, in at most three lines, and its title gives
    the whole text. Source adds the line count, as for a file. Found by
    the mockups on 2026-11-24.
  - The header takes the name and the description from the skills list of
    the workspace, not from the read. Reason: the header then shows them
    while the text loads and with each notice, and it does not move when
    the text comes. A skill that the list no longer holds shows its name
    only. So the read sends only the text. Found by the mockups on
    2026-11-24.
  - The header has no Copy and no Download, unlike the header of a file
    tab. Reason: the tab is for reading the skill, and a selection copies
    text from both views. Found by the mockups on 2026-11-24.
- **Notices.** The tab shows one line in place of the text in these cases:
  the skill is no longer in the list, the text is too large, the cloud
  computer is stopped or starting, or the runner of the current start is
  older and has no skill read. No line names a sandbox provider. A
  stopped cloud computer acts as for a file tab.
  - Each notice has the look of the empty state of a file tab: an icon, a
    title, and one sentence. The read shows a spinner and one line. A
    notice keeps the header. Found by the mockups on 2026-11-24. The words
    are:
    - "Opening the skill" while the read runs.
    - "This skill was removed or renamed", with "Type / in a message to
      see the current skills."
    - "This skill is too large to show", with "Skills up to 1 MB show
      here."
    - "Restart to open this skill", with "Opening a skill needs newer
      cloud computer software. Select Restart in the workspace header."
      These words follow the notice of the HTML preview.
  - As for a file tab (decision 247), the open of a skill tab starts a
    stopped cloud computer. During that start, the tab acts as a file tab
    does. A tab that shows its text keeps it when the cloud computer
    stops. A tab without text then shows the stopped state with Resume.
    Found by the mockups on 2026-11-24. Corrected on 2026-11-24 after the
    review: the first text promised the wait of a start with no Resume.
    [The resume](../docs/protocol/stop-and-resume.md#the-resume) promises
    that wait only while the open of the workspace resumes the cloud
    computer. A file tab shows the stopped state with Resume until the
    start shows. Changed on 2026-11-25 by skill tab decision 5 B: from the
    Resume that the open or a press asks for, until its reply or the next
    state event, a file tab and a skill tab without content show the wait
    with no Resume, and the header shows Starting.
- **Fresh text.** The tab reads the text each time it shows, and again
  after each skills report while it shows. Reason: a change of a skill
  then shows without a reload, at the cost of one read per report. Changed
  on 2026-11-24 after the options check. Corrected on 2026-11-24 after the
  review: the first text also said that the runner sends a report only
  when a name, a description, or a manual-only mark changes, so that an
  edit of the body alone shows at the next show of the tab. The runner
  also sends a full report after each connect and for each repair, as
  [The skills report](../docs/protocol/skill-mentions.md#the-skills-report)
  says. So `docs/protocol/skill-tabs.md` states only when the tab reads,
  and it links there for the times of the reports.
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
- **A phone.** A skill tab acts as a file tab does on a phone. A press on
  a skill chip opens the skill as a page of the Files tab, which leads
  back to All files. The phone row shows no skill tab, so a phone opens no
  tab menu for it. Found by the mockups on 2026-11-24.
- **The press on a chip.** In the message box, a press on the name of a
  skill chip opens the skill, as a press on the name of a file chip opens
  its file. Under the pointer the name is underlined, and the press takes
  no focus. In a sent message, the whole chip opens the skill, and under
  the pointer it takes the fill of a hover, as each chip that opens a page
  does. Reason: under the pointer, the icon of a chip of the message box
  already removes the chip (decision 215). Found by the mockups on
  2026-11-24.
- **The tab menu.** A skill tab gets the items of the tab menu that each
  tab gets: Keep open on the temporary tab, Move left, Move right, Close
  other tabs, and Close tabs to the right. It gets no Copy path, because
  it has no path. Corrected on 2026-11-24 after the docs milestone: the
  first text named a Close item, which no tab menu has.
- **A failed read.** When a read fails for a reason without its own
  notice, such as `skill_unavailable`, a lost runner connection, or a
  Worker error, the tab shows "This skill didn't open" with Try again, as
  a file tab shows "This file didn't open". Reason: every tab has a
  failure state, and Try again repeats the read. Rejected: the notice of a
  removed skill for each failure, because it gives a wrong cause, and a
  spinner that keeps reading, because a lasting failure never ends. Found
  by the docs milestone on 2026-11-24.
  - The notice has the alert icon, the title, and a Try again button, with
    no sentence, as the failure state of a file tab. The stopped state has
    its own catalogue page, `app/skill-mentions/tab/stopped`, so that the
    notices page keeps at most five screens. Found by the mockups on
    2026-11-24.
- **A failed refresh.** A read that fails while the tab shows its text,
  such as the read after a skills report, keeps that text when the cause
  can pass: a reply with a 5xx status, or a failure of the network. A
  read while the tab shows no text, and a reply with a 4xx status, still
  show their notice. Reason: a cause that passes, such as a stop of the
  cloud computer that the tab does not know about yet, then takes no text
  from the member. Rejected: a notice for each failed read, for that
  reason, and text that stays after each failure, because it hides a
  cause that lasts, such as a removed skill. Found by the review on
  2026-11-24.

- **App calls of the app milestone.** Each call below was made on
  2026-11-24 by the app milestone, and the orchestrator checked it.
  - The app keeps skill tabs in its own tab row with a `skill` kind of
    `WorkspaceTab` and `TemporaryTab`. `src/chat/api/view-skills.ts` moves
    them into the skill fields of the view route before each save. Reason:
    every move and close then handles one list. The route and the stored
    view still never hold a skill tab in `tabs`.
  - Each skill tab keeps its view, Preview or Source, in memory until it
    closes. A reload starts in Preview.
  - The tooltip of a skill tab names the agent, such as "plans, Claude
    skill".
  - A repository change keeps skill tabs, as the Worker keeps them. A
    skill that the new repository lacks shows the notice of a removed
    skill.
  - A waiting message carries its model choice, so its chips name the
    agent of the message before the stream shows it.
  - A `computer_stopped` or `computer_starting` reply to a read without
    text shows the loading line until the state of the cloud computer
    takes its place. Changed on 2026-11-24 after the review: a tab that
    shows its text keeps it, as A failed refresh says.
  - The close of the shown skill tab shows the next skill tab, else the
    one before, else the chat, as for file and Preview tabs.

- **Try again of a failed first start.** The wait of skill tab decision
  5 holds for a stopped sandbox and for a later failed start, as for the
  Resume of the open. Try again of a failed first start keeps its busy
  state until the reply. Reason: decision 5 answers a start request for a
  stopped computer, and a failed first start starts a new sandbox. My call
  on 2026-11-25, after the app part of decision 5 raised it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the skill tab and the pressable chips before the code, so the design
problems show first.

- [x] Add a mockup of the skill tab under `app/skill-mentions/tab`: the
      tab row with the temporary skill tab, the header with the name and
      the description, the Preview view, and the Source view.
- [x] Draw each notice of the skill tab: loading, no longer available, too
      large, cloud computer stopped, and older runner software.
- [x] Show the chip as pressable in a sent message and in the composer,
      with its hover state, in `app/skill-mentions/chips`.
- [x] Add the open of a skill tab to the flow `user-flows/use-a-skill`.
- [x] Draw the kept skill tab and the skill tab on a phone.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
      Evidence: `.context/skill-tabs/m1/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of this plan in the protocol
docs, so that the milestones below build to them.

- [x] `docs/protocol/skill-mentions.md`: replace "A press on a skill chip
      opens nothing" with the open of the skill tab. Add a section "Skill
      tabs" with the identity, the text, the view, the notices, and the
      fresh text. Keep the rule that the report holds no path. In the
      message box, a press on the name of the chip opens the skill, as for
      a file chip. Found by the mockups on 2026-11-24. The section links
      to the new page `docs/protocol/skill-tabs.md`, which holds the
      details, because Skill mentions would pass the length target.
- [x] `docs/protocol/temporary-tabs.md`: a file, diff, or skill tab can be
      temporary. It also holds the skill tabs of the saved view.
- [x] `docs/protocol/tab-row.md`: the row also shows skill tabs, and their
      tab menu.
- [x] `docs/protocol/workspace-links.md` or the doc that owns the tab
      addresses: the address of a skill tab. No protocol doc gives the
      address of a file tab, so the address is in `skill-tabs.md`, and
      its open in the temporary tab is in `temporary-tabs.md`.
- [x] `docs/protocol/agent-runner.md`: the skill read command, its result,
      its errors, and the `hello` field that announces it. The doc holds
      the `hello` field and links the section "Skill reads" of
      `skill-tabs.md` for the rest, because it already passes the length
      target.
- [x] `docs/protocol/tokens-and-secrets.md`: the filter of the skill text.
- [x] `docs/protocol/stop-and-resume.md`: the open of a skill tab also
      starts a stopped cloud computer, as the open of a file tab does
      (decision 247). Found by the mockups on 2026-11-24.
- [x] Read the Privacy page, the Terms page, and each public guide in
      full. Update each sentence that restates a changed fact, such as
      what the app shows of a skill.
- [x] Update the chat, Files, and UI READMEs for the new parts. No change
      in this milestone: no README states what a skill chip opens or lists
      the kinds of tab. Each later milestone updates the README of the code
      that it adds.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2a: Mockup of a failed read

Tags: mockup

Depends on: 2

The docs milestone found that a skill tab had no state for a failed read.
Draw it before the app milestone builds it.

- [x] Add a `failed` variant to `app/skill-mentions/tab/notices`: "This
      skill didn't open" with Try again, in the look of the failure state
      of a file tab (`src/files/ui/FileStates.tsx`). Add the words to
      `docs/mockups/src/components/files/skillTabCopy.ts`.
- [x] Update `docs/mockups/catalogue.md` and the catalogue pages that list
      the notices.
- [x] Run `npm run mockups:check`. Smoke-test the changed page.
      Evidence: `.context/skill-tabs/m2a/`.

## Milestone 3: The skill read in the runner

Depends on: 2

Add the command that reads one skill by its agent and its name.

- [x] In `crates/cnd-runner-interface/`, add the `skill.read` command with
      a request ID, the agent, the name, and the byte limit. Add its
      result `skill.read.result`: the text, or an error of
      `skill_not_found`, `skill_unavailable`, or `skill_too_large`. Add
      the optional `hello` field `skill_reads`. Changed on 2026-11-24,
      found by the mockups: the result has no description, because the
      header takes it from the skills list, as The view says.
- [x] Run the generator of the shared runner types, and commit
      `src/shared/generated/`.
- [x] In `crates/cnd-runner/`, answer the command. For a skill of the
      agent's own folders, find the path in the lists of the latest scan.
      For an org skill, take a lease on the current copy and let the
      helper choose the named skill in it again.
- [x] In `runner/sdk-helper/`, read the file with the limit of the scan,
      and give the safe view of an org skill, as an agent start does.
- [x] Add a runner test: an org skill read after a newer copy publishes
      reads the newer copy.
- [x] Send `skill_reads: true` in `hello`.
- [x] Add Rust tests and helper tests: a repository skill of each agent,
      an org skill with its safe view, an unknown name, a name of the
      other agent, a file that left the disk, and a file over the limit.
- [x] Run the Rust checks and `npm run test --prefix runner`.

## Milestone 4: The skill read and the saved view in the Worker

Depends on: 3

Give the browser the skill text, and save skill tabs.

- [x] Add a route that reads one skill of a workspace by its agent and
      its name. It checks the member's access to the workspace, as the
      file content route does. It sends the command only on the runner
      connection, and it calls no provider route.
- [x] Remove `#[ts(skip)]` from `RunnerReadSkill` in `RunnerControlCommand`
      (`crates/cnd-runner-interface/src/runner_commands.rs`), run the
      generator, and send the command through the generated
      `RunnerCommand` type. Milestone 3 hid it until the Worker sends it.
- [x] Check the agent and the name: the agent is `claude` or `codex`, and
      the name holds 1 to 256 characters without white space or control
      characters.
- [x] Hide in the text what the workspace hides in a runner event, as
      for a skill description, plus each exact copy of the workspace token
      and the turn tokens, as `docs/protocol/skill-tabs.md` says under
      "The read". Do not reuse `filterFileResponse`, which filters only
      the path label. Changed on 2026-11-24: the read sends no
      description, and the filter is not the file tab filter.
- [x] Answer a runner without `skill_reads` and a stopped cloud computer
      with error codes that the app shows as notices.
- [x] Save skill tabs in `skillTabs`, `activeSkill`, and `temporarySkill`
      of the view route and of the stored JSON, never in `tabs`. A save
      without `skillTabs` keeps the stored skill tabs, as for Preview
      tabs. When such a save names a temporary file or diff, the stored
      temporary skill tab closes.
- [x] Check that the previous Worker reads a stored view with the new
      fields. Record the result under `.context/skill-tabs/`.
- [x] Add Worker tests: access, the filter, each error, an older runner,
      a view round trip with an older app, and one temporary tab after a
      save of an older app.

## Milestone 5: The skill tab in the app

Tags: ui

Depends on: 2a, 4

Make the chips pressable and show the skill tab.

- [x] Give `SkillChip` an opener in a sent message and in the composer
      field. A plain press opens the skill tab. The chip in the composer
      stays one unit of the text. In the composer field, the name is the
      part that opens, as `onOpen` of `FileChip` makes it. Then draw the
      mockups with it, in place of their part `DraftSkillChip`. Found by
      the mockups on 2026-11-24.
- [x] Add the skill tab kind to the view, the tab row, and the temporary
      tab, with a keep as for a file tab.
- [x] Add the address `skills/<agent>/<name>` of a skill tab to the
      router, so that Back, a reload, and a link open it.
- [x] Add the skill tab view: the header, the Preview view with the
      Markdown view of the files, the Source view, and the notices. The
      header takes the name and the description from the skills list.
      Move the words of `skillTabCopy.ts` and the styles of
      `SkillPage.module.css` from `docs/mockups/src/components/files/` to
      `src/ui/components/files/`, so that the app and the mockups share
      them. Found by the mockups on 2026-11-24.
- [x] Start a stopped cloud computer at the open of a skill tab, as at the
      open of a file tab (decision 247). Found by the mockups on
      2026-11-24.
- [x] Read the text each time the tab shows, and after each skills report
      while it shows.
- [x] Show "This skill didn't open" with Try again for a failed read, as
      the mockup of Milestone 2a draws it. Add the notice to the Notices
      section of `docs/protocol/skill-tabs.md` in the same change. The doc
      says each notice has "an icon, a title, and one sentence". Word the
      failed notice as an icon, a title, and Try again.
- [x] Update `src/chat/text-key-code.md` and `src/chat/integration.md`,
      which say that a skill chip opens nothing.
- [x] Add DOM tests: a press in a sent message and in the composer, the
      agent choice, the temporary tab and its keep, each notice, and the
      tab menu.
- [x] Check the screen in a browser against the mockups. Save the
      screenshots under `.context/skill-tabs/`.
      Evidence: `.context/skill-tabs/m5/`.

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
