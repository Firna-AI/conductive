# Org skills: the copy

This doc holds the requirements and the decisions in force for the copy of
the skills repository in each cloud computer. It covers when the runner
copies and checks the repository, and what a failure or a changed
repository does. It also says why the app shows no state of the copies.
It belongs to [Org skills](org-skills.md), which gives the terms. A
skills decision number names a decision of the change that adds the
skills repository, as that doc says.

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
