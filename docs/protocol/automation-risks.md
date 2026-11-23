# Automation risks

This doc holds the risks that stay open for automations, and the
protections that were rejected, with their reasons. A run acts as its
owner while no person watches it, and text from outside the org can reach
its agent. This doc belongs to [Automations](automations.md).
[Automation runs](automation-runs.md) and
[Pull request runs](pull-request-runs.md) state the rules of the runs. The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## Risks that stay open

- Risk: comments, reviews, and description edits by other GitHub accounts
  reach the agent of a pull request run. The rule of
  [Who may start a run](pull-request-runs.md#who-may-start-a-run) checks
  only the author of the pull request and the sender of the event.
- Risk: such text can steer the agent. The run uses the owner's default
  login and GitHub token, and the env vars of the org. The agent can copy
  the GitHub token and the env vars, or push them to a branch.
- The sandbox of the run holds only a turn token, which spends that login
  through the gateway while the turn runs.
- Risk: a run on the org login spends it while no person watches. The
  account of the org key or of the org endpoint pays, as
  [Risks](org-logins.md#risks) says.
- The owner's GitHub token reaches each repository where the owner
  installed the GitHub App and has access, as
  [GitHub tokens](github-tokens.md) says
  (decision 121).
- Risk: the agent of a run can create more workspaces through the agent
  tools, and their first messages also come from the owner. Those
  workspaces spend starts, and the Runs list does not show them.
- Risk: the agent of a run can also use the workspace tools on each
  workspace of the org, as [Reach](agent-tool-access.md#reach) says
  (decisions 257 and 277). So text that steers a pull request run can read
  every chat, workspace, session, and message of the org.
- While a turn of the run runs, such text can also start sessions and
  turns in each workspace of the org that is not archived. Their messages
  come from the owner. Their turns run on the logins of their sessions.
- While that turn runs, such text can also rename, move, and archive
  workspaces, close and stop sessions, change the sections, and open and
  close previews in the whole org. These writes use the rights of the
  owner. When the owner is an admin, such text can archive each workspace
  of the org. A member can restore each one for 14 days.
- Risk: such text can also make the agent run a command with secrets. A
  secret request in a run waits for a member, as in each workspace
  (secrets decision 5 C). But a secret that a grant covers needs no
  request, such as a chosen secret of the automation or a secret for all
  agents. A command of the agent can copy the value of such a secret, or
  push it to a branch.
- Through the session calls, such text can also start turns in the other
  workspaces and sessions of the org. Those turns use the grants of their
  workspaces and their sessions with no request, as
  [Turns that no person started](secrets.md#turns-that-no-person-started)
  says.
- Risk: such text can also make the agent ask for a command on the Mac of
  the owner, from the first turn of the run. A command that the owner
  always allowed then runs with no question. A turn that the agent starts
  in a workspace where that Mac holds a grant runs each command there with
  no question. [Risks](mac-access.md#risks) states these risks.
- Risk: the [chosen secrets](automations.md#chosen-secrets) stay as
  pre-approvals in each kept run workspace, until a member removes them
  there. Through the session calls, an agent in each workspace of the org
  can start turns in such a run workspace while it is not archived. Those
  turns use the chosen secrets with no request. So text that steers any
  agent of the org can use them, and copy their values.
- Grants that end with the first turn of a run were rejected, as
  [The secrets of a run](automation-runs.md#the-secrets-of-a-run) says.
- Risk: the creator of a chosen secret, or an admin, can replace its value.
  Each later run then uses the new value with no request. So that member
  can send the agents of the runs to an account that the member controls,
  as [Rights](secrets.md#rights) says.
- Risk: a member with a terminal in a run workspace can read the owner's
  GitHub token and the turn token of a running turn, as in each workspace.
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  states that risk (decision 105).
- An instruction or a classifier that makes the agent ignore commands in a
  pull request was rejected. It makes an injection less likely, but it
  does not stop it.
- A network allowlist for the sandboxes of runs was rejected, because a
  controlled run can still push a secret to a branch.
- A first agent without logins that summarizes the pull request was
  rejected, because the agent that pushes a fix must read the code itself.
- Decision 506 C chose the author rule. A token of the GitHub App that
  reaches only the automation's repository was rejected for pull request runs.
  It breaks the rule that pushes show as their sender (decision 50).
