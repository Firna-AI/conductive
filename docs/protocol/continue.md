# Continue

This doc holds the requirements and the decisions in force for Continue:
the action that moves a workspace to its next task after its pull request
merged. [After the merge](github-banner.md#after-the-merge) states where
the pull request bar offers it. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A branch-name decision number names a decision of the
change that names a branch after its workspace, as
[The branch and the name](create-a-workspace.md#the-branch-and-the-name)
says.

## One task after another

- After the merge of its pull request, Continue moves a workspace to a new
  branch (decision 223). The new branch starts from the latest commit of
  the base that [The base and the new branch](#the-base-and-the-new-branch)
  gives (decision 300).
- The workspace keeps its sandbox, with its files, its installed software,
  and its running processes. It keeps its sessions, and their agents keep
  their context.
- A workspace has one branch at a time. The new branch takes the place of
  the earlier branch in the record of the workspace.
- The workspace keeps its name. Reason: a member can have given that name,
  and no automatic name replaces it, as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says.
- The workspace keeps the software that the install script of its org
  image installed, for each later task. The app's own software in the
  sandbox updates itself, as [Updates](sandbox-software.md#updates) says.
- Reason: Continue keeps the context of the agents and the warm sandbox, as
  in Conductor.
- These ways were rejected (decision 223):
  - Continue in a new workspace. Its sandbox starts cold, and its agents
    start without the earlier context.
  - Continue in a new workspace that forks the sandbox. Its sessions start
    new, and it needs one more start on the provider account of its org.
  - Archive only. After each merge, the member then waits for a new
    sandbox, and the new agent starts without the earlier context.
  - More work on the merged branch. After a squash merge, a new pull
    request from that branch shows the earlier commits again. The bar also
    finds the merged pull request of that branch, so Create PR
    never shows.

## Who may continue

- Every member of the org may continue each workspace of the org
  (decision 224), as
  [Members and roles](orgs-and-members.md#members-and-roles) says.
- Reason: every member can go on with the work after a merge, and Continue
  deletes no work. The changed files move to the new branch, and the
  commits stay in the sandbox.
- Continue only for the workspace owner and the admins, as for Archive, was
  rejected (decision 224). Archive keeps that rule (decision 42).

## When Continue runs

- The app accepts Continue only when the pull request of the workspace
  branch merged.
- The app refuses Continue in an archived workspace and in a workspace of
  a suspended org.
- The app refuses Continue while a turn runs in a session of the
  workspace. The bar then shows Continue as not available, and says that
  it waits for the agent.
- Reason: a branch change under a running agent can mix its edits into the
  new branch.
- Continue starts a stopped sandbox first, because the branch change runs
  in the sandbox.

## Local work

- Before the branch change, Continue checks the sandbox for local work.
  The check counts the changed files, also untracked files, and the
  commits that no remote branch holds, on every local branch.
- When the check finds local work, a question lists it. The member can
  continue anyway or cancel.
- Reason: the member sees the work before it leaves the current branch.
- The changed files move to the new branch. The commits stay on their
  local branches in the sandbox.
- When Git cannot move the changed files to the new branch, Continue
  stops, keeps the earlier branch, and names the reason.
- Reason: a forced move can lose work.

## The base and the new branch

- Continue builds on the branch that the pull request merged into, when
  GitHub still has that branch (decision 300). Otherwise, it builds on the
  default branch of the repository.
- Continue reads that branch from the merged pull request on GitHub, at
  the time of Continue. So it follows a change of the base of the pull
  request on GitHub before the merge.
- That branch becomes the base branch of the workspace, as
  [Base branches](base-branches.md#the-base-branch-of-a-workspace) says.
- Continue changes only the base branch of the workspace. The default
  branch of the repository stays the branch that GitHub names.
- Reason: a workspace on a long-lived branch, such as `develop`, then stays
  on that branch after each merge.
- These ways were rejected (decision 300):
  - Always the default branch. A workspace on `develop` would then move to
    `main` after each merge.
  - Always the stored base branch. It fails when GitHub deleted that
    branch.
  - The stored base branch when GitHub still has it, else the default
    branch. It picks the wrong branch after a change of the base on GitHub.
  - A choice of the base when the member presses Continue. It adds a
    question and a mockup.
- Continue fetches the latest commit of that branch with the GitHub access
  of the member who pressed Continue (decision 226), as
  [Continue](github-tokens.md#continue) in GitHub tokens says.
- The new branch starts from that commit.
- The name of the new branch has the current GitHub login of the
  workspace owner, the name part from the workspace name, the version, and
  four new random characters, such as `calummoore/saved-carts-v2-7k2q`
  (branch-name decision 3 B). This holds also when another member presses
  Continue.
- The name part follows the rule of a new workspace, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says. A workspace without a name, or a name with no letter or digit,
  uses a city name, such as `calummoore/lisbon-v2-7k2q`.
- The version is `v` and the number of the task. The first task of a
  workspace is task 1, and its branch has no version. Each Continue adds 1
  to the number, so the first Continue gives `v2`.
- Reason: decision 53 keeps the branches of each person together. The
  workspace name and the version say which work the branch holds. A city
  name was rejected, because it says nothing of the work. A branch name
  from the next message was rejected, because it needs a rename of a
  branch that exists.
- Reason: the app counts the tasks. A version read from the earlier branch
  name was rejected, because a name such as "Upgrade to Node v24" ends
  with a version too.

## After Continue

- The pull request bar starts again at the state without a pull request.
  The GitHub events of the workspace follow the new branch.
- The earlier branch stays on GitHub, with its merged pull request.
- Each session shows a note at the place of Continue, as
  [What the chat shows](chat-and-events.md#what-the-chat-shows) says.
- Each session works on the new branch, also a session that starts or
  reopens later, as [The branch line](message-lines.md#the-branch-line)
  says (decision 227).
