# Get started

This doc holds the requirements and the decisions in force for Get
started, the first run of the app. It covers its steps, the agent step,
the state of the first build in its org step, and its finish. It belongs
to [Orgs and members](orgs-and-members.md). The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An org login decision number names a decision of the change that
adds the org logins, as [Tokens and secrets](tokens-and-secrets.md) says.

## The first run

- Get started is the only first run.
- Get started opens only after app access. A person who waits sees the
  [waitlist screen](waitlist.md#the-waitlist-screen) instead. Reason: the
  steps of Get started need app access.
- It has three steps, in this order (decisions 33 and 80):
  1. Install the GitHub App.
  2. Create the first org.
  3. Connect Claude or Codex.
- The agent step is complete when a login serves the person for an agent
  (org login decision 4). That login is a personal login, or the org login
  of an org of the person.
- With only an org login, the step names that login. It says that the
  person can start now, and can connect their own login at any time in
  the account.
- Get started asks for no Boat account and no Boat key.
- [Chat and events](messages-and-attachments.md#messages) states the notice for a
  missing agent login.
- The second step, the org step, shows the cloud computer of the org once
  the org exists (decision 150 of PR #92). Create org starts its first build, as
  [The first build](org-image.md#the-first-build) says.
- While the org has no good image, the org step shows the state of the
  newest build of the org:
  - While a build runs, the step says that the cloud computer is being
    prepared, with the time since the build began.
  - After a failed build, the step shows the failure with the message
    that the app saved for the build. An admin gets Try again and a link
    to the log of the build on the Cloud computer tab.
  - With no build, such as after a first build that could not start, the
    step says that the org has no build yet. An admin gets Build computer.
- Once the org has a good image, the step says that the cloud computer is
  ready. A later build does not change that, also when it fails
  (decision 9).
- A member who is not an admin sees each state with no action. Reason:
  only an admin builds (decision 57).
- The person can connect an agent while the build runs.
- While the person has a deleted org, Get started lists it before the
  steps, with Restore, as [Delete org](delete-org.md) says.
- When every step is done, Get started shows its finish: a line about the
  org, and an Open button for the org, such as "Open Acme".
- The Open button stays on in every state of the build (decision 150 of PR #92).
  New workspace also shows the state of the build, as
  [Create a workspace](workspaces-and-sandboxes.md#create-a-workspace)
  says.
- The finish says that the org is ready for a new workspace only once the
  org has a good image. Before that, it says that the cloud computer of the
  org is still being prepared, did not build, or needs a build.
- Reason: the person sees the build where it starts. The person never
  waits in Get started for the build, which can run for up to 60 minutes.
  A fourth step for the build was rejected for that reason.
