# Skill mentions

This doc holds the requirements and the decisions in force for the list
of `/` in the composer of a workspace chat, the skill chips that it puts
into a message, the text of a skill chip, and the skills report of the
runner that fills the list.
[Skills of a message](agent-instructions.md#skills-of-a-message) states
what each agent gets for a skill chip. The terms are those of the
[architecture doc](../architecture.md#terms). A skill list decision
number, such as skill list decision 1, names a decision of the change that
adds the list of skills, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/skill-mentions` and in the flow `user-flows/use-a-skill`.

## Terms

- **Skill:** a folder with a `SKILL.md` file that an agent loads. The file
  gives the name, the description, and the instructions of the skill.
- **Skill text:** `/` and the name of a skill, such as `/plans`, at the
  start of the text or after a space or a line break.

## The list

- The composer of a workspace chat offers a list of the skills that the
  agent can use. The composers of New workspace have no list. Reason: a
  new workspace has no skills report before its first start.
- `/` opens the list at the start of the text, or after a space or a line
  break, as `@` opens the list of files. A `/` inside a word or a path,
  such as `src/a`, opens nothing. The text from `/` to the caret is the
  query.
- The list opens in the place of the list of files. A space, Esc, the
  keys, a press, and the highlight work as in the list of files, as
  [The list](file-mentions.md#the-list) says.
- When no skill matches the query, the list closes. While the list shows
  no row, Enter sends the message. This holds also while a line shows in
  place of the rows.
- Reason: text such as `see /tmp` is common, and Esc is not needed to
  send it. The line "Nothing matches" of the list of files was rejected for
  this list, because the list then keeps Enter from such text.
- Each row shows the skill icon, the name of the skill, and its
  description, on one line. The description is muted and ends with an
  ellipsis when it is too long. Reason: the description tells the member
  what the skill does.
- Screen readers hear the list as "Skills".
- The rows show the skills of the agent of the model chosen now in the
  composer. A change of the model to the other agent changes the rows.
  Reason: a skill of the other agent does nothing in this message.
- A query matches without regard to case. Names that start with the query
  come first, then names that hold it, then descriptions that hold it.
  Each group is in the order of the names. Without a query, every skill
  shows in the order of the names.
- The list shows at most 100 rows. A longer query narrows it.
- One line takes the place of the rows in these cases:
  - "Loading skills…" before the first skills report of the workspace
  - "The list of skills is unavailable" when the runner of the current
    start sent no skills report, or a repair of the report failed, as
    [The list in the workspace](#the-list-in-the-workspace) says
  - "This repository has no skills" when the agent has no skill, for `/`
    alone
- The first two lines show for each query, because no list can tell yet
  whether a skill matches.
- When the agent has no skill, a query after `/` closes the list. Reason:
  else the line would show over the chat for each typed path, such as
  `see /tmp`.

## The sources of the skills

- The runner reads the skills that each agent loads, and it reports them
  to the workspace (skill list decision 1). The list then has
  descriptions, works for both agents, and can take more skill folders
  later.
- These ways were rejected (skill list decision 1):
  - Skill folders from the file tree of the app. They give names only, and
    no skill outside the repository.
  - The skills that the SDK of Claude gives for each session. The list is
    then empty before the first message, and Codex has none.
  - A read of `SKILL.md` files from GitHub by the Worker. It misses new
    skills and the skills of the Codex home.
- The Claude list holds each skill of
  `<repository>/.claude/skills/<folder>/SKILL.md`, in the folder of the
  workspace's own repository. Reason: the runner starts Claude with the
  settings of the project only.
- The skills that come with the Claude agent program, such as `dataviz`,
  stay out of the list. Reason: a read of the skill folders cannot find
  them. A member can still name them in the text.
- The Codex list holds the skills that the app server of Codex lists for
  the repository folder, with the shared Codex home of the cloud computer.
  Reason: the list then follows the rules of Codex, and it gives the path
  of each `SKILL.md` that the input of Codex needs.
- When the app server gives no answer, the Codex list holds each skill of
  `<repository>/.agents/skills` and `<repository>/.codex/skills`, and the
  runner warns.
- For a skill from a folder, the name and the description come from the
  front matter of its `SKILL.md`. Without them, they are the name of the
  folder and the first paragraph of the text, as the agent takes them.
- The list holds every skill that the agent loads, except a skill whose
  name holds white space. The runner warns for that skill. Reason: no
  skill text can hold such a name. A stricter rule for names was
  rejected, because the list would then hide skills that the agent runs.
- A `SKILL.md` that the runner cannot read leaves out only its skill, and
  the runner warns.
- Each list holds each name once. Of two skills with one name, the list
  keeps the one that the agent gives first.
- The list holds skills only. It holds no built-in command of an agent,
  such as `/compact`, and no command of `.claude/commands/`.

## The skills report

- The runner reports the list of each agent in a `skills.updated` event.
  Each event holds the full Claude list and the full Codex list.
- Each skill of the report has its name and its description. The report
  holds no path. Reason: the app needs no path, and the paths of the cloud
  computer stay in it.
- The runner sends each description whole. It never cuts a description.
  It sends a description of more than 4096 characters as empty text, and
  it warns. Reason: a cut before the filter of secret values can split a
  secret value, as for the labels of
  [listening ports](listening-ports.md).
- The workspace cuts each description to 300 characters after its filter
  of secret values, before it keeps or sends the list.
- Each list holds at most 200 skills: the first 200 in the order of the
  names. Reason: the report stays within the
  [envelope limit](agent-runner.md#the-agent-runner) of a runner event.
- The runner hides the workspace token and the turn token in each
  description, as
  [Tokens and secrets](tokens-and-secrets.md#secrets-that-users-enter)
  says for the text that screens show.
- The workspace hides each exact copy of a secret value in the names and
  the descriptions, as it does for each runner event. A skill whose name
  holds a hidden value does not show. Reason: its chip would name a skill
  that the agent does not have.
- Reason for the filters: a description is text of the repository.
- The runner sends the report once after each connect, before
  `runner.ready`, also when both lists are empty. Reason: the workspace
  can then tell a runner that sends no skills reports.
- The runner reads the lists again after each change of the repository
  that it sees. It sends a report when a list changes.
- Cost: a skill that only the Codex home gains shows after the next
  change of the repository or the next connect.
- The runner answers a `report.refresh` of the kind `skills.updated` with
  a full report, as
  [Lost workspace updates](lost-workspace-updates.md) says.
- Skills reports use the
  [runner protocol](agent-runner.md#the-agent-runner), with no separate
  protocol version, as the reports of listening ports do.
- A skills report is not activity under the rule of
  [Stop and resume](workspace-life.md#stop-and-resume). So it does not
  delay the stop of a sandbox.

## The list in the workspace

- The workspace keeps the latest report and sends it to each tab of its
  chat. A new report replaces it. Reason: the list then works while the
  cloud computer sleeps, as the list of files does.
- When a runner sends `runner.ready` with no skills report since its
  connect, the list is unavailable until a report comes. An older runner
  does this.
- When the repair of a refused report fails, the list is unavailable
  until a newer complete report comes.

## Skill chips

- A pick replaces `/` and the query with a skill chip, and a space follows
  the chip (skill list decision 2).
- Reason: the chip matches the file chips, and the input stays right when
  the model changes to the other agent before the send.
- These ways were rejected (skill list decision 2):
  - The text `/name` alone. Codex reads it as plain text.
  - The form of the agent of the model chosen now, as text. It is wrong
    after a change of the model to the other agent.
  - The text of the `SKILL.md` in the message. The skill then loses its
    supporting files and its tools.
- A skill chip shows the skill icon, a `/` in a square, and the name of
  the skill without `/`, at the size of a file chip. Its title is the
  description of the skill. A screen reader hears "Skill" before the name.
- A skill chip in the message field is one unit of the text, as a file
  chip is. Its removal is the removal of each chip of the composer, as
  [Remove a chip of the composer](file-mentions.md#remove-a-chip-of-the-composer)
  says.
- A press on a skill chip opens nothing, in the message field and in a
  sent message. Reason: a skill of the Codex home has no file of the
  branch to open, and the title gives the description.
- A copy of a skill chip gives its skill text. A paste of a skill text
  gives a chip when the text names a skill of the list.
- A draft keeps the skill text of each chip. When a draft comes back, its
  skill texts show as chips again.
- A skill chip stays a chip when the agent of the send does not have its
  skill, such as after a change of the model. Reason: the member sees the
  chip and can remove it.

## The stored text

- The text of a skill chip is its skill text, such as `/plans`. A skill
  text that a member types without the list is the same text.
- The draft, the sent message, and the titles from messages hold the
  skill text.
- Reason: the stored text, the titles, and the copies stay short, and
  Claude reads the same form.

## Sent chips

- A sent message shows a skill chip for each skill text that names a
  skill of the current list of either agent. Every other `/` text stays
  text. A skill text in inline code or in a code block stays code.
- When the workspace has no list, a sent message shows each skill text as
  text.
- The answers of the agents keep their text. Reason: only the composer
  writes skill chips.
