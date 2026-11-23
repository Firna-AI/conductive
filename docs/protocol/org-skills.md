# Org skills

This doc holds the requirements and the decisions in force for the skills
repository of an org. An admin names one public GitHub repository of agent
skills. The cloud computer of each workspace copies it, and gives its
skills to the agents. The doc covers the Skills section, the public
repositories that give skills, the skills that load, and the skills in a
session. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md). The terms are
those of the [architecture doc](../architecture.md#terms) and the terms
below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skills
decision number, such as skills decision 1, names the dated record of one
decision of the change that adds the skills repository. Its plan keeps
these records while the change is open. Its pull request keeps them after
the merge. A trust decision number names a decision of the change that
adds [repository trust](org-skills-trust.md), as that doc says. The
[mockup catalogue](../mockups/catalogue.md) draws the Skills section at
`app/org-settings/cloud-computer` and
`app/org-settings/cloud-computer/skills`.

Three pages belong to this doc:

- [Org skills: the copy](org-skills-copy.md) gives the copy in each cloud
  computer, its checks, its failures, and why the app shows no state of it.
- [Org skills: the list of skills](org-skills-list.md) gives the lookup
  on GitHub, the list of skills in the Skills section, and its notices.
- [Org skills: repository trust](org-skills-trust.md) gives the trust
  choice, who changes it, its saves, when it applies, and its effect on
  Claude and Codex.

## Terms

- **Skill:** a folder with a `SKILL.md` file. The file holds the
  instructions for one kind of task, and the folder holds the other files
  of that task.
- **Skills repository:** the one GitHub repository of an org whose skills
  the agents of every workspace of the org get.
- **Copy:** the copy of the skills repository in the cloud computer of a
  workspace.
- **Lookup:** the read of the skills repository on GitHub that lists its
  skills in the Skills section.
- **Custom slash command:** a Claude command that a Markdown file
  defines, such as a file in the `.claude/commands` folder of a repository.
- **Inline command:** a shell command in the text of a skill or of a
  custom slash command. Claude runs it while it reads that text, before the
  model chooses a tool. The app calls it an automatic command.
- **Trust choice:** the choice of an admin whether Claude may run the
  inline commands of the skills repository, as
  [Repository trust](org-skills-trust.md) says.

## The skills repository

- The agent runner of each workspace copies the skills repository into the
  cloud computer of the workspace (skills decision 1 B). It gives the
  skills of the copy to Claude and to Codex.
- This holds for each workspace of the org, also a run workspace of an
  automation.
- Reason: running workspaces then stay current within minutes. The change
  needs no new token type, storage, or provider route.
- These ways were rejected (skills decision 1):
  - A skills mark on a repository of the Repositories tab, which each
    build copies into the org image. A running workspace then never gets
    an update, and the GitHub App must reach the repository.
  - A copy that the Worker keeps and sends to each runner. It needs a new
    storage path and a size limit.
  - The plugin marketplaces of the agents. The Agent SDK downloads no
    marketplace, and a plugin also loads hooks.
  - A copy that the install script makes. The agents do not read such a
    copy, and no section of the org settings names the repository.
  - Skills through the workspace tools. Agents find skills only in files.
  - Pull requests from a bot that copy the skills into each repository.
    Each update then needs a merge in every repository.

## The Skills section

- The Cloud computer tab of the org settings ends with a Skills section,
  after the env vars. It names the skills repository of the org.
- An org has at most one skills repository. A new org has none.
- The section holds the repository as `owner/name`. The field also takes
  a link from GitHub, such as `https://github.com/owner/name`. Save stores
  the link as `owner/name`. Reason: members copy links from GitHub.
- A Save of an empty field removes the repository.
- Save stays off until the text of the field or the trust choice
  changes.
- The section also holds the trust choice of the repository, under the
  field, as [Repository trust](org-skills-trust.md#the-switch-and-its-hint)
  says.
- Only an admin changes the skills repository (skills decision 2 A).
- Reason: the reason of decision 57 applies. A skills repository changes
  the work of every agent of the org, as a script or an env var does.
- A skills repository that each member chooses on the Account page was
  rejected for that reason. A choice of the org together with a choice of
  each member was rejected too.
- A member who is not an admin sees the saved repository as text, with no
  field and no Save. Without a saved repository, the section tells the
  member that an admin can choose one.
- In a suspended org, every member sees the section in this way, also an
  admin. Without a saved repository, the section says only that no
  repository is chosen. Reason: nobody can choose one there, and the
  notice of the org says why.
- A changed repository applies at the next start of each workspace's
  cloud computer, also at a resume, as a changed env var does. The hint
  under the field says so.
- Reason: the cloud computer then needs no new call to the Worker. So the
  [workspace token](tokens-and-secrets.md#the-workspace-token) allows
  nothing new.

## Public repositories only

- Only a public repository gives skills (skills decision 6 A). The
  description of the Skills section says so.
- The copy uses no GitHub token, as
  [The skills repository](github-tokens.md#the-skills-repository) says. So
  a private repository and a repository that does not exist give no
  skills.
- Reason: with no token, no token rule of the cloud computer changes.
- These ways to read a private repository were rejected (skills
  decision 6):
  - The GitHub token of the workspace owner, which `gh` gets outside a
    turn. It changes the rule that Git gets no GitHub access outside a
    turn, and the owner must be able to read the repository.
  - A fetch at the start of each turn, with the token of its sender. A
    private repository then updates only while agents work, and its first
    copy waits for the first turn.
  - A read-only token or deploy key that an admin stores in the section.
    Every member with a terminal can read it, and someone must renew it.
  - A Worker that reads the repository with an installation token of the
    GitHub App, and sends its files to the runner. It needs a new storage
    path, a size limit, and the GitHub App on the repository.
  - A Worker that streams the archive of the repository to the runner. It
    needs a new call of the workspace token, and archives in place of Git.
  - An installation token that reads only the one repository, for each
    copy and check. A workspace sandbox then gets an installation token,
    and the workspace token gains a call.

## The copy

[The copy](org-skills-copy.md#the-copy) states when the runner copies and
checks the skills repository, and what a failure or a changed repository
does.

## What loads

- The agents get the skill folders of the copy. A skill folder is a
  folder that holds a `SKILL.md` file.
- A link that leaves the copy, or points nowhere, is removed.
- The skill folders lie at any depth under the `skills` folder at the top
  of the repository. This includes the folders whose names start with a
  dot. A folder inside a skill folder is not a skill folder of its own.
  The `.git` folder holds no skill folder.
- In a repository without a `skills` folder, the skill folders are the
  folders at its top level that hold a `SKILL.md` file.
- A repository without a `skills` folder that holds a `SKILL.md` file at
  its top level is one skill folder itself. Reason: a repository can hold
  a single skill.
  The top-level folders of a root skill are not skill folders.
- Reason: popular skills repositories use these layouts.
  `anthropics/skills` and `futex-ai/skills` use `skills/<name>/`.
  `openai/skills` uses `skills/.curated/<name>/` and
  `skills/.system/<name>/`. `ComposioHQ/awesome-claude-skills` uses
  folders at its top level.
- When two skill folders have the same name that the agent shows, only
  the first in path order loads. The runner writes a warning to its log.
- Only the skill folders load. The agents get no hooks, MCP servers,
  agents, separate custom slash commands, or settings from the repository.
  Reason: hooks and the rest run code that no agent chose.
- The agents get no frontmatter key that runs code or grants tools.
- Both rules hold also for a trusted repository.
- No inline command of an org skill runs, unless an admin trusts the
  repository. Then only Claude runs these commands, as
  [What Claude and Codex get](org-skills-trust.md#what-claude-and-codex-get)
  says.
- No rules file of the repository, such as a root `AGENTS.md`, reaches the
  agents (skills decision 3 A).
- Reason: popular skills repositories keep no always-on rules in a common
  place. Most of their root rules files hold the rules for work on the
  repository itself.
- A rules file in the agent instructions of each new session was rejected
  for that reason.
- Risk: a skill that relies on a rules file outside its folder works
  without those rules. For example, the skills of `futex-ai/skills` rely
  on its `global/AGENTS.md`.
- A skill of the workspace's own repository wins over a skill of the copy
  with the same name that the agent shows.

## Skills in a session

- Claude and Codex both get the skills. Reason: the app offers both
  agents (decision 19).
- New skills and changed skills reach each session at its next turn.
- The list of `/` in the composer of a workspace chat shows the org
  skills of each agent, as
  [The sources of the skills](skill-mentions.md#the-sources-of-the-skills)
  says. A new copy updates the list without a turn.
- A cloud computer needs [sandbox software](../architecture.md#terms)
  that supports org skills. Sandbox software released before org skills
  gets no skills from the setting, and it applies no trust choice.
- Updated software reaches each cloud computer by the rules of
  [Updates](sandbox-software.md#updates). It needs no new build of the
  org image.
- An update of the software does not apply a changed repository or trust
  choice. Such a change applies only at the next start or resume, as
  [The Skills section](#the-skills-section) says.
- Risk: the skills steer the agents of every workspace of the org. Each
  person who can push to the skills repository can change them within
  minutes. A skill can tell an agent to run the scripts of its folder.
- With trust, such a person can also add inline commands that Claude runs,
  as [Risks](org-skills-trust.md#risks) says.

## The list of skills

[The list of skills](org-skills-list.md#the-list-of-skills) states the
lookup of the saved repository on GitHub, the list in the Skills section,
and its notices.

## No state of the copy

[No state of the copy](org-skills-copy.md#no-state-of-the-copy) states
why the app shows no state of the copies.

## Repository trust

[Repository trust](org-skills-trust.md) states the trust choice, who
changes it, its saves, when it applies, and its effect on Claude and Codex.
