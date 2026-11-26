# Org skills: repository trust

This doc holds the requirements and the decisions in force for the trust
choice of the skills repository. An admin chooses whether Claude may run
the inline commands of the shared skills. The doc covers the switch in the
Skills section, who changes it, its saves, when a change applies, and its
effect on Claude and Codex. It belongs to
[Org skills](org-skills.md), which gives the other terms. A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skills
decision number names a decision of the change that adds the skills
repository, as [Org skills](org-skills.md) says. A trust decision number,
such as trust decision 403, names the dated record of one decision of the
change that adds repository trust. Its plan keeps these records while the
change is open. Its pull request keeps them after the merge. The
[mockup catalogue](../mockups/catalogue.md) draws the choice at
`app/org-settings/cloud-computer/skills/trust` and its variants.

## Terms

- **Named repository:** a saved skills repository whose text is a valid
  `owner/name`. A repository is named also when GitHub has no public
  repository with that name, and when it holds no skills.
- **Trusted repository:** the repository that the saved trust choice
  names.
- **Claude's restriction:** the setting of Claude that stops the inline
  commands of every skill and every custom slash command in a whole
  session.

## The trust choice

- The Skills section holds a trust choice for the saved repository (trust
  decision 403 C). Trust lets Claude run the inline commands of the skills
  of that repository.
- These commands run with the access of the workspace, as each command of
  an agent does.
- Trust also covers each later commit of the trusted repository, which
  [the copy](org-skills-copy.md#the-copy) follows.
- Reason: an explicit choice of an admin then decides whether shared
  skills run commands that no model chose. Without trust, Claude's
  restriction keeps these commands off, also when a later Claude version
  adds a new form of inline command.
- These ways were rejected (trust decision 403):
  - Only a filter of the app that makes inline commands inert. Each new
    form that a Claude version adds can need another fix.
  - Claude's restriction in every session, with no choice. The skills and
    custom slash commands of each workspace then always lose their inline
    commands. An untrusted repository still gets this restriction.
  - A trust choice for each member. It needs a second scope of settings,
    and the agents of different members then act in different ways.
  - Trust for one reviewed commit. Each later push then needs another
    approval of an admin, and the app must store and show that commit.
  - A trust choice for each workspace. It needs a new scope of settings,
    its rights, and rules for the run workspaces of automations.
- These ways were left out:
  - No skill folders for Claude. They break
    [What loads](org-skills.md#what-loads).
  - An own reader of inline commands, or a changed build of Claude. Each
    change of Claude still needs work on it.
  - A skill text that only points to the files of the skill. Claude still
    adds text of its own before it reads the inline commands.
  - A hook on the Skill tool. It misses the other ways to start a skill.
  - A source of skill folders that gives Claude only their text. The
    agent SDK has no such source.

## Who changes the choice

- Only an admin changes the trust choice (trust decision 403 C). Reason:
  the reason of skills decision 2 A applies, because the choice changes
  the work of every agent of the org.
- A member who is not an admin sees the saved choice as text, with no
  switch. Its term is Trust, and its value is Trusted or Not trusted. The
  hint of that value shows under it.
- In a suspended org, every member sees the choice in this way, also an
  admin.
- A choice of each member and a choice of each workspace were rejected, as
  [The trust choice](#the-trust-choice) says.

## The switch and its hint

- The switch has the label "Trust this skills repository". It shows under
  the Repository field of an admin.
- The switch shows only while the field names a repository, as
  `owner/name` or as a link from GitHub. It hides while the field is empty
  or holds other text.
- Saved text that names no repository has no trust choice. The read-only
  section then shows no Trust row.
- Reason: a trust choice belongs to one named repository.
- The hint under the label says what the value does:
  - On: Claude can run the inline commands of this repository's skills,
    also of later updates, with the access of the workspace.
  - Off: Claude runs no inline command of any skill or custom slash
    command, also of the workspace's own. Agents can still choose to run
    a command that a skill suggests.
- While the field names another repository than the saved one, the hint
  of off first says that a new repository starts untrusted.
- The hint then says that a running cloud computer keeps its trust until
  its next start or resume.
- The hint ends with a link to the guide on trust, at
  `/docs/cloud-computer#trust-a-skills-repository` on the marketing site.
  The link opens in a new tab.
- The hint names no setting of the agent software.
- Reason: the settings show a short hint, and a guide holds the long
  explanation, as for the other settings.

## The trusted repository

- Trust starts off for each org and each repository (trust decision 403
  C). A repository that an org saved before trust existed starts untrusted
  too.
- The saved choice names the trusted repository, or no repository. Trust
  holds only while that name matches the saved repository.
- Reason: a stale save or stale values of a start then cannot attach trust
  to another repository. A saved on or off value was rejected for that
  reason.
- Two names match without regard to letter case. Reason: GitHub
  repository names ignore letter case. The section shows the saved
  repository as it was saved.
- Each grant of trust names its repository. The app never applies a grant
  to a repository that the grant does not name.
- A cloud computer reads a trusted name that is missing, not valid, or
  different from the saved repository as untrusted.

## Save

- The field and the switch form one draft. Save repository saves both in
  one request. Save stays off until one of them changes, as
  [The Skills section](org-skills.md#the-skills-section) says.
- A change of the repository in the draft turns the switch off. The admin
  can then turn it on for the new repository before Save.
- A failed Save keeps the draft in the section. The saved values stay as
  they were.
- A Save that removes the repository, or names another repository, clears
  the trust choice. Only a grant in the same Save that names the new
  repository trusts it.
- So an older app that sends only a new repository cannot carry trust to
  that repository.
- A request that names neither a new repository nor a trust choice keeps
  the saved choice. So a save of a script or an env var changes neither
  the repository nor its trust.
- A Save of text that names no repository saves no trust, also when the
  request asks for trust.
- When a grant names another repository than the repository after its own
  Save, the Worker saves that repository untrusted (trust decision 403 C).
  It then returns the saved values. This holds also when the Worker tries
  the Save again after a change by another request.
- Reason: the reply tells the app which choice took effect. A refusal of
  such a Save was rejected, because it adds a new rejection. A move of the
  grant to the saved repository was rejected, because each grant names its
  repository.
- Two saves at the same time never attach a grant to a repository that
  its own request did not name.
- A changed trust choice starts no build of the org image. Reason: the
  choice reaches each cloud computer at its start, not through the image.
- The reply of the settings gives the trusted repository. The app reads a
  reply without it, such as a reply of an older Worker, as untrusted.

## When a change applies

- The Worker gives each cloud computer the saved repository and the
  trusted repository at each start, also at a resume. No org env var
  replaces either value.
- So a changed choice applies at the next start or resume of each cloud
  computer, as a changed repository does (trust decision 403 C). Reason:
  the cloud computer then needs no new call to the Worker, as
  [The Skills section](org-skills.md#the-skills-section) says.
- A Save changes no running cloud computer, session, or turn. A running
  cloud computer keeps the choice of its start for all of its sessions.
- Restart in the workspace header keeps that choice, because it does not
  stop or resume the cloud computer, as
  [Restart](restart-the-software.md#restart) says. An update of the
  [sandbox software](sandbox-software.md#updates) keeps it too.
- To revoke trust on a running cloud computer, the cloud computer must
  stop, then start again.
- A cloud computer stops after the configured stop time without user
  activity and without a running agent turn, as
  [The stop](stop-and-resume.md#the-stop) says. A member who may archive
  the workspace can also archive it, restore it, and then resume it.
- No control of the app applies a new choice to a running cloud computer
  at once.
- Risk: an active cloud computer can keep an old trust with no time limit.
  Until it stops and starts again, each new commit of the repository
  reaches it within 5 minutes. Claude can then run the inline commands of
  that commit there.

## What Claude and Codex get

The saved repository and the trust choice set what each Claude session
gets:

| Saved repository | Trust | Org skills that Claude gets | Inline commands in the session |
| --- | --- | --- | --- |
| None, or text that names no repository | None | None | As the settings of Claude allow |
| Named | Off | With each inline command inert | None, of any skill or custom slash command |
| Named | On | As the repository writes them | As the settings of Claude allow |

- Without a named repository, Claude keeps the behavior of its own
  settings and of the workspace. Reason: no shared source then needs a
  choice.
- With an untrusted named repository, Claude runs no inline command in the
  whole session. This covers each org skill, each skill of the workspace's
  own repository, and each custom slash command.
- This holds also while the repository is private, missing, or without
  skills, before its first copy ends, and when no skill folder loads.
  Reason: the saved choice sets the rule, not the state of the copy.
- Reason: Claude's restriction acts on a whole session. Claude has no
  restriction for one folder of skills.
- The settings of the workspace's repository cannot turn Claude's
  restriction off. The restriction also holds after a change of the model,
  the effort, or fast mode.
- Each org skill then also keeps its inline commands inert, as a second
  guard. Reason: the agent SDK does not document that its restriction
  covers the skill folders that the app adds.
- The shell tool of the agent stays available. An agent can still choose
  to run a command that a skill suggests.
- With a trusted named repository, Claude gets the inline commands of each
  org skill as the repository writes them.
- Trust only removes the restriction of the app. A setting of Claude or a
  managed policy that stops inline commands still stops them.
- With either choice, only the skill folders of the repository load, as
  [What loads](org-skills.md#what-loads) says. A skill of the workspace's
  own repository still wins over an org skill with the same name.
- Trust changes nothing for Codex. Codex gets each org skill with its
  inline commands inert, with either choice. Reason: trust decision 403
  concerns the inline commands of Claude. So the hint of the switch names
  Claude.
- Older software applies no trust choice, as
  [Skills in a session](org-skills.md#skills-in-a-session) says.

## Risks

- Risk: with trust, each person who can push to the trusted repository can
  add commands that Claude runs in every workspace within minutes. The
  commands run with the access of the workspace.
- Risk: an untrusted repository also stops the inline commands of the
  workspace's own skills and custom slash commands in Claude. A team that
  relies on them must trust the skills repository, or remove it.
