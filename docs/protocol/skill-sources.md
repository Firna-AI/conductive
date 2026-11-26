# Skill sources

This page belongs to [Skill mentions](skill-mentions.md#the-sources-of-the-skills).
It states which skills each agent loads, which of them the runner reports
for the list of `/`, and the order of the list. The terms are those of
[Skill mentions](skill-mentions.md#terms). A skill list decision number,
such as skill list decision 1, names a decision of the change that adds
the list of skills, as
[Decision numbers](../architecture.md#decision-numbers) says. A skill tab
decision number names a decision of the change that adds the
[skill tabs](skill-tabs.md).

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
- The Claude list leaves out a skill whose front matter sets
  `user-invocable` to a value that Claude does not read as true, such as
  `false`. Reason: Claude hides such a skill from the menu of its user.
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
- Each list also holds the org skills that the agent of that list gets,
  as [Org skills](org-skills.md#what-loads) says. They come after the
  skills of the agent's own folders. The user chose this on 2026-11-23,
  after members saw "This repository has no skills" in an org with a
  skills repository.
- Reason: the list then shows each skill that the agent loads, also when
  the workspace's own repository has no skills.
- These ways were rejected:
  - No org skills in the list, with a doc note only. Members then think
    that the org skills do not work, and a Codex message gets no skill
    input for them.
  - Org skills from the read of the skills repository on GitHub that the
    Skills section uses. The list can then name a skill that the agent
    does not get, such as before the first copy or after a name clash.
- The runner reads the org skills from the current
  [copy](org-skills-copy.md#the-copy) of the skills repository. It makes
  the same choice as an agent start: a skill of the workspace's own
  repository wins over an org skill with the same name, and of two org
  skills with one name, the first in path order stays.
- The name and the description of an org skill are those of the safe
  view that the agent reads, by the rules below.
- Without a copy, such as before the first copy ends, the lists hold no
  org skills.
- A Codex skill chip of an org skill gives Codex the skill in the view of
  its own session. When that view does not hold the skill, such as a skill
  of a newer copy, the message gets no skill input for it. Codex then
  reads its skill text as text.
- For a skill from a folder, the name and the description come from the
  front matter of its `SKILL.md`. Without a name, the name is the name of
  the folder, as the agent takes it.
- Without a description, a Claude skill takes the first line of its text
  that is not empty, without a heading mark, as Claude does. A Codex skill
  needs a description, as Codex does, so the Codex list leaves out a skill
  without one.
- The list holds every skill that the agent loads, except a skill whose
  name holds white space, a Claude skill that Claude hides from its menu,
  as said above, and a skill whose `SKILL.md` the runner refuses, as said
  below. The runner warns for a name with white space.
  Reason: no skill text can hold such a name. A stricter rule for names
  was rejected, because the list would then hide skills that the agent
  runs.
- A `SKILL.md` that the runner cannot read leaves out only its skill, and
  the runner warns.
- The same holds for a `SKILL.md` that the runner refuses, such as a link
  to a file of another name. [The read](skill-tabs.md#the-read) gives this
  rule, its exception for the org skills, and its reason (skill tab
  decision 3 B). The agent can still load such a skill, so the list and
  the agent differ for it.
- Each list holds each name once. Of two skills with one name, the list
  keeps the one that the agent gives first.
- The list holds skills only. It holds no built-in command of an agent,
  such as `/compact`, and no command of `.claude/commands/`.
