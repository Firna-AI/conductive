# Org skills

This doc holds the requirements and the decisions in force for the skills
repository of an org. An admin names one public GitHub repository of agent
skills. The cloud computer of each workspace copies it, and gives its
skills to the agents. The doc covers the Skills section of the org
settings, the copy, the skills that load, and the list of skills. It
belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md). The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skills
decision number, such as skills decision 1, names the dated record of one
decision of the change that adds the skills repository. Its plan keeps
these records while the change is open. Its pull request keeps them after
the merge. The [mockup catalogue](../mockups/catalogue.md) draws the
Skills section at `app/org-settings/cloud-computer` and
`app/org-settings/cloud-computer/skills`.

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
- Save stays off until the text of the field changes.
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

- The runner gets the newest commit of the skills repository when it
  starts. Then it checks the repository for new commits every 5 minutes
  while it runs, and fetches them (skills decision 1 B).
- No turn waits for a copy or a check. A check before a turn, at most once
  in 5 minutes, was rejected, because the turn then waits for GitHub.
- So a turn that starts before the first copy ends runs without the
  skills of the repository.
- The copy follows the head of the default branch of the repository, as a
  [refresh](org-image.md#the-org-image) of the org image does.
- A new commit takes the place of the old one only after its whole fetch
  ends. No agent sees a half-written skill folder.
- A failed copy or check keeps the last good copy, also across a stop and
  a resume. The runner writes a warning to its log. No start and no turn
  fails.
- Reason: a skill that is missing or old makes no work unsafe. So the
  runner warns and continues, as the steps of the
  [context folder](repository-folders.md#the-context-folder) do.
- After the org removes its skills repository, the runner deletes its copy
  at its next start. The agents then get no skills from it.
- After the org names another repository, the runner deletes the old copy
  at its next start, before it copies the new one. A failed first copy of
  the new repository gives no skills. The agents never keep the skills of
  the old repository.
- The copy lives outside every repository folder. So Changes lists no
  file of the copy.

## What loads

- The agents get the skill folders of the copy. A skill folder is a
  folder that holds a `SKILL.md` file.
- The skill folders lie at any depth under the `skills` folder at the top
  of the repository. This includes the folders whose names start with a
  dot. A folder inside a skill folder is not a skill folder of its own.
  The `.git` folder holds no skill folder.
- In a repository without a `skills` folder, the skill folders are the
  folders at its top level that hold a `SKILL.md` file.
- A repository without a `skills` folder that holds a `SKILL.md` file at
  its top level is one skill folder itself. Reason: a repository can hold
  a single skill.
- Reason: popular skills repositories use these layouts.
  `anthropics/skills` and `futex-ai/skills` use `skills/<name>/`.
  `openai/skills` uses `skills/.curated/<name>/` and
  `skills/.system/<name>/`. `ComposioHQ/awesome-claude-skills` uses
  folders at its top level.
- When two skill folders have the same name, only the first in path order
  loads. The runner writes a warning to its log.
- Only the skill folders load. The agents get no hooks, MCP servers,
  agents, commands, or settings from the repository. Reason: hooks and the
  rest run code that no agent chose.
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
  with the same name.

## Skills in a session

- Claude and Codex both get the skills. Reason: the app offers both
  agents (decision 19).
- New skills and changed skills reach each session at its next turn.
- A cloud computer with an older runner gets no skills from the setting.
  Each build of the org image installs the newest runner, as
  [The agent runner](agent-runner.md#the-agent-runner) says. So the
  workspaces that start from the image of a later build get the skills.
- Risk: the skills steer the agents of every workspace of the org. Each
  person who can push to the skills repository can change them within
  minutes. A skill can tell an agent to run the scripts of its folder.

## The list of skills

- The Skills section looks up the saved repository on GitHub, and lists
  the skills that it finds (skills decision 7 H).
- The lookup runs at each Save and at each load of the section. Nothing
  stores its list. Reason: the list then follows the repository, as the
  copies do.
- The list and its notices belong to the saved repository. Text in the
  field that is not saved changes neither of them.
- The lookup reads the default branch of the repository with the GitHub
  sign-in of the member who views the section, as
  [The skills repository](github-tokens.md#the-skills-repository) says.
- The lookup finds the skill folders by the rule of
  [What loads](#what-loads). So the list names the skill folders of the
  newest commit.
- The list gives the number of skills, then the name of each skill folder,
  in name order. It gives no descriptions. Reason: each description needs
  one more request to GitHub.
- A repository that is private, not found, or without skills gives a
  notice in place of the list. Save still stores the repository. Reason: a
  refusal at Save is a new rejection, and the user did not ask for one.
- The notice of a private repository says that agents get no skills from
  it.
- The notice of a repository that is not found says that GitHub has no
  public repository with this name. Reason: GitHub also answers "not
  found" for a private repository that the sign-in of the viewer cannot
  see.
- Save removes spaces and line breaks at the start and the end of the
  text. Reason: a pasted link often carries them.
- Text that is neither `owner/name` nor a link from GitHub is saved as
  typed. It gives the notice of a repository that is not found, and the
  agents get no skills from it. Reason: a refusal at Save is a new
  rejection.
- A viewer whose GitHub sign-in expired gets the app's sign-in error in
  place of the list, not the notice of a failed lookup.
- The notice of a repository without skills says where the agents look
  for skill folders.
- When GitHub cuts the file tree short, the list gives the skills of the
  part that GitHub sends. A note says that the list can be incomplete, and
  that agents still get all of the skills.
- A cut tree without a skill gives only that note, not the notice of a
  repository without skills. Reason: its skills can lie after the cut, and
  the copy holds the whole repository.
- A lookup that fails, such as in a GitHub outage, gives the notice that
  the app shows for each part that did not load. Its title is "The list of
  skills did not load", and it has Try again. Try again loads the section
  again. The saved repository stays. Reason: the Cloud computer tab shows
  each failed load in this way.
- Members see the list and each notice too. Reason: the lookup runs for
  each viewer. So a member whose agents get no skills learns why, as with
  the [repository notice](org-image.md#the-repository-notice) of
  decision 241.
- The notices of a private repository and of a repository that is not
  found say what an admin can do. A member reads that an admin can act. In
  a suspended org, these notices name no action. The other notices read
  the same for each viewer.
- These ways were rejected (skills decision 7):
  - No sign in the app, with each warning only in the runner log. Admins
    then believe that agents have skills that they do not have.
  - A Save that refuses a repository that GitHub does not find. It is a
    new rejection.
  - A field that lists the repositories that the admin's sign-in reaches,
    as the Repositories tab does. Such a list is slow for many
    installations of the GitHub App.

## No state of the copy

- The app shows no state of the copies, such as the commit of a copy, the
  time of its last check, or a failure (skills decision 7). The list comes
  from GitHub, not from the copies.
- The start steps of a workspace show no step for the copy.
- Each warning of a copy goes only to the runner log.
- A report of the result of each copy, from each runner to the Worker, was
  rejected for this version. It needs a new report from the runner.
- Risk: a copy that fails in one workspace shows nowhere in the app. The
  agents of that workspace then work without the skills, or with old
  skills.
