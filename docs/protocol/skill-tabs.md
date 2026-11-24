# Skill tabs

This page belongs to [Skill mentions](skill-mentions.md#skill-tabs). It
holds the requirements and the decisions in force for the skill tab, the
tab that a press on a skill chip opens. It covers the open, the identity
of the tab, the read of its text with its runner command, its view, its
notices, a stopped cloud computer, the fresh text, its address, and a
phone. The terms are those of [Skill mentions](skill-mentions.md#terms).
A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skill tab
decision number, such as skill tab decision 1, names a decision of the
change that adds the skill tabs.
[Temporary tabs](temporary-tabs.md) states the temporary skill tab and the
skill tabs in the saved view. [The tab row](tab-row.md) states their place
in the row and their tab menu. The
[mockup catalogue](../mockups/catalogue-workspace-tools.md) draws the
skill tab at `app/skill-mentions/tab`, the chips that open it at
`app/skill-mentions/chips`, and its open in the flow
`user-flows/use-a-skill`.

## Terms

- **Skill tab:** a tab of the centre column that shows the text of the
  `SKILL.md` file of one skill of one agent.

## The open

- A press on a skill chip opens its skill in a skill tab (skill tab
  decision 1 B). [Skill chips](skill-mentions.md#skill-chips) states which
  part of a chip takes the press, and which agent's skill a chip names.
- The skill opens in the temporary tab (skill tab decision 2 A), as
  [Temporary tabs](temporary-tabs.md) says.
- A skill tab shows a skill from each place that a skill comes from, as
  [Skill sources](skill-sources.md#the-sources-of-the-skills) says. This
  includes the org skills and the skills of the Codex home, which lie
  outside the repository folder.
- Reason: the member reads the text that the agent reads, from each place,
  and no path of the cloud computer leaves it. A new place for skills then
  needs no change to the read.
- These ways were rejected (skill tab decision 1):
  - A copy of each listed skill in the context folder, which a file tab
    opens. It adds up to 400 files to All files and to the folder where
    the agents work, and an agent can edit an old copy.
  - A file tab at a path that the runner keeps for each skill. Copy path
    then gives a path that no disk holds, the title is a file name, and an
    older runner answers "not found".
  - A read of the `SKILL.md` of an org skill from GitHub by the Worker. A
    skill of the Codex home then opens nothing, and the text can differ
    from the copy that the agent loads.
  - The text of each skill in each skills report. The texts can pass the
    limit of a runner event and the memory of the workspace by far.
  - A list of the other files of the skill folder, each of which opens. It
    needs more read rules in the runner.
  - The text that the turn of a sent message loaded, for each of its skill
    chips. It needs storage outside the chat events, and a read at each
    turn.
- A skill of the repository also opens the skill tab, not the file tab of
  its `SKILL.md`. Reason: one press gives one kind of tab, and the title
  of a file tab shows only `SKILL.md`.

## The identity of the tab

- A skill tab names its agent and the name of its skill. Its title is the
  name, and its icon is the skill icon.
- Reason: two agents can hold skills with one name and different texts.
- The header names the agent after the name of the skill: "Claude skill"
  or "Codex skill". The title of the tab stays the name.
- Reason: two open tabs of one name then show whose text each holds, and
  the title rule of the row stays.
- A header without the agent was rejected, because a member can then read
  the text of the wrong agent. The agent in the title only when two titles
  are the same was rejected, because it adds a rule to the tab row.

## The read

- The browser asks the Worker for the text of a skill by the agent and the
  name of the skill. It sends no path.
- The Worker checks that the member may reach the workspace, as for the
  read of a file. It refuses an agent other than `claude` or `codex`. It
  also refuses a name that has no character, more than 256 characters,
  white space, or a control character.
- The Worker sends the read only on the runner connection, as
  [Skill reads](#skill-reads) says. It calls no route of the provider.
  Reason: only the runner knows where each skill lies.
- The runner finds the file of the skill in the list of that agent from
  its latest scan. A name that the list does not hold gets "not found".
- Reason: the browser cannot name a file of the cloud computer, and the
  skills report still holds no path, as
  [The skills report](skill-mentions.md#the-skills-report) says.
- For an org skill, the runner reads the current copy of the skills
  repository, not the copy of its latest scan. It chooses the named skill
  again in that copy, as a scan does.
- Reason: a newer copy can replace the copy of the latest scan, and the
  runner then removes the older copy.
- The text is the text that the agent of the tab reads. For an org skill,
  it is the safe view that the agent gets at a start, as
  [What Claude and Codex get](org-skills-trust.md#what-claude-and-codex-get)
  says. Reason: the tab must not show text that the agent does not get.
- A `SKILL.md` of more than 1 MiB, or 1,048,576 bytes, gets "too large".
  Reason: this is the limit of the scan, which leaves out a larger skill.
- Before a browser gets the text, the Worker hides in it each value that
  the workspace hides in a runner event. It also hides each exact copy of
  the workspace token and of a turn token of the workspace, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- Reason: a skill text is text of a repository, as the description of a
  skill is. A description also hides the secret values and the tokens, as
  [The skills report](skill-mentions.md#the-skills-report) says.

## Skill reads

- The Worker reads the text of one skill with the runner command
  `skill.read`. It carries a request ID, the agent, the name of the skill,
  and a byte limit. The Worker sends the limit of the scan, 1 MiB.
- The runner answers with `skill.read.result` and the same request ID. The
  result holds the text of the `SKILL.md` of the skill, or an error with
  one of these codes:
  - `skill_not_found`: the list of that agent from the latest scan holds
    no skill of that name, or its file is no longer on the disk.
  - `skill_too_large`: the file holds more bytes than the limit.
  - `skill_unavailable`: the runner cannot read the file.
- The result holds no path, no name, and no description. Reason: no path
  leaves the cloud computer, and the header takes the name and the
  description from the skills list, as [The view](#the-view) says.
- The command and its result are not part of the chat history, as the
  file results of the runner are not.
- A runner announces that it answers `skill.read` in its hello, as
  [The agent runner](agent-runner.md#the-agent-runner) says. The Worker
  sends `skill.read` only to a runner that announces it. For any other
  runner, the tab shows the notice for older software.

## The view

- The header has the look of the header of a file tab. Its first line
  holds the skill icon and the name in the quiet chip of a path, then the
  agent, and the switch between Preview and Source at its end.
- The description follows under that line, muted, in at most three lines.
  Its title gives the whole description.
- The header takes the name and the description from the skills list of
  the workspace, not from the read. A skill that the list no longer holds
  shows its name only.
- Reason: the header then shows while the text loads and with each notice,
  and it does not move when the text comes. So the read sends the text
  only.
- The tab starts in Preview. Preview shows the Markdown body of the text,
  without its front matter. It reads the body by the rules of the Markdown
  preview of a file, as
  [Files and changes](workspace-tools.md#files-and-changes) says. So no
  HTML of the skill reaches the page, and no picture loads.
- Reason: the Markdown preview draws no front matter.
- Source shows the whole text with line numbers, and the header adds its
  line count, as for a file.
- The header has no Copy and no Download, unlike the header of a file tab.
  Reason: the tab is for reading the skill, and a selection copies text in
  both views.

## Notices

- One notice takes the place of the text in each case below. A notice
  keeps the header. Each notice has the look of the empty state of a file
  tab: an icon, a title, and one sentence.
  - While the read runs, a spinner and "Opening the skill" show.
  - When the read finds no such skill: "This skill was removed or
    renamed", with "Type / in a message to see the current skills."
  - When the text is over the limit: "This skill is too large to show",
    with "Skills up to 1 MB show here."
  - When the runner of the current start has no skill reads: "Restart to
    open this skill", with "Opening a skill needs newer cloud computer
    software. Select Restart in the workspace header."
- The notice for older software has no button of its own, as the notice of
  an HTML file in [Older software](html-file-preview.md#older-software).
  Reason: Restart downloads the newest release before it restarts the
  runner.
- No notice names a sandbox provider.

## A stopped cloud computer

- A skill tab acts as a file tab does while the cloud computer does not
  run, as [Files and changes](workspace-tools.md#files-and-changes) says.
- The open of a skill tab starts a stopped cloud computer, as the open of
  a file tab does (decision 247). The tab then shows the wait of a start,
  with no Resume, as [The resume](stop-and-resume.md#the-resume) says.
- A tab that shows its text keeps it when the cloud computer stops. A tab
  without text then shows the stopped state with Resume.

## Fresh text

- The tab reads the text each time it shows, when the workspace leaves
  Starting, and again after each skills report while it shows.
- Reason: a change of a skill then shows without a reload.
- Cost: one read for each report while the tab shows. The runner sends a
  report only when a name, a description, or a manual-only mark changes.
  So an edit of the body alone shows at the next show of the tab.

## The address

- A skill tab has an address in its workspace, as a file tab has:
  `skills/<agent>/<name>` after the address of the workspace.
- Back, Forward, a reload, and a copied link open the skill tab from its
  address. A skill without a tab opens in the temporary tab, as
  [Temporary tabs](temporary-tabs.md) says.

## A phone

- On a phone, a skill tab acts as a file tab does. A press on a skill chip
  opens the skill as a page of the Files tab, which leads back to All
  files.
- The phone row shows no skill tab, so a phone opens no tab menu for it.
