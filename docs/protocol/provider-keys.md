# The app's provider keys

This doc holds the requirements and the decisions in force for the keys of
the app's provider accounts: the Boat key and the E2B key. It belongs to
[Isolation of orgs and sandboxes](isolation.md), which covers the checks
that keep the orgs apart, what a sandbox holds, and the agent logins and
the turn tokens in a sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An e2b decision number names a decision of the change that adds E2B
as the second [sandbox provider](workspaces-and-sandboxes.md#the-provider),
as that doc says.

## The app's Boat key

- One Boat key, the app's own, runs every sandbox and every org image of
  the orgs on `boat` (decision 80). The Worker holds it as a Worker secret.
- The key never goes to the browser, into a sandbox, into a log, or into
  a saved snapshot. Reason: the key reaches the sandboxes of every org on
  `boat`.
- The key is limited to one Boat environment and to the actions that the
  app uses.
- The app's Boat account is a Boat organization of its own. It holds no
  other Boat work of the operator (decisions 5 and 80).
- Every Boat call names that organization. A Boat user can reach several
  organizations, so a change of the active one in Boat moves no work of
  the app.
- The deploy run never gets the key. It asks the Worker to build the
  [software image](org-image.md#the-software-image) with a token of its
  own.

## The app's E2B key

- One E2B key, the app's own, runs every sandbox and every org image of
  the orgs on `e2b` (e2b decision 222). The Worker holds it as a Worker
  secret.
- The key never goes to the browser, into a sandbox, into a log, or into
  a saved snapshot. Reason: the key reaches the sandboxes of every org on
  `e2b`.
- The app's E2B account is an E2B project of its own, in E2B's EU
  cluster. It holds no other E2B work of the operator. Reason: the
  workspace objects run in Western Europe.
- Every E2B sandbox has private traffic. A request to any of its ports
  needs the traffic token of that sandbox, as
  [Port previews](terminal-previews-and-desktop.md#port-previews) says.
- The Worker keeps the traffic token of each E2B sandbox encrypted in its
  own storage. The token never goes into a log. Reason: E2B gives the
  token when it creates or resumes the sandbox, and a later read of the
  token resumes a stopped sandbox.
