# Capabilities: show the approvals of this session only

Status: Active. On branch `calummoore/allow-sessions-vs-above-ejtv`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Capabilities control of a workspace opens beside the message box of one
session. Its Secrets part lists each secret of the org with a checkbox, which
pre-approves the secret for every session of the workspace. Under the list, the
group "Allowed in sessions" lists the session approvals of every session of the
workspace. A session approval comes from "Allow for this session" on a request,
and it covers one session only. Cal found the two lists confusing: one secret
can show unchecked above and allowed below, and the title does not say that an
approval covers one session only.

This change shows only the approvals of the session that the control opens
from, under the title "This session". It hides an approval when the workspace
already allows its secret. It does not change the Worker, the stored data, New
workspace, Mac access, or "Values for this workspace".

Contract owners:

- [Secrets](../docs/protocol/secrets.md), under Grants and Capabilities.
- The [mockup design notes for secrets](../docs/mockups/design-secrets.md) and
  the [secrets catalogue](../docs/mockups/catalogue-secrets.md).

## Decisions

### 1. Each secret shows twice in Capabilities

Answered by Cal on 20 November 2026: **E**, with one addition. "If a secret is
allowed in the workspace, then don't show allowed in session at all."

- **Root question:** How does a member see at a glance which secrets each
  session can use with no question, and how do they change that?
- **Options:**
  - **A.** Keep the layout and rename the lists only. The secret still shows
    twice. Effort: Small.
  - **B.** Show each secret once, with lines under it for the sessions that
    allowed it. Effort: Medium.
  - **C.** List only the secrets that agents can use, grouped by scope, with
    an Add menu. It changes the rule that a secret for all agents shows as a
    checked box. Effort: Medium.
  - **D.** Give each secret a choice: Ask, This session, or Every session. It
    needs a new Worker route that grants a secret with no request. Effort:
    Large.
  - **E.** Show only the approvals of the open session, under "This
    session". A member opens another session to see or remove its
    approvals. Effort: Medium. (Cal's option.)
  - **F.** E, plus a folded list of the approvals of the other sessions.
    Effort: Medium.
- **Left out:** change nothing, because Cal asked for a cleanup. Approvals in
  each chat only, outside Capabilities, because the control keeps each grant
  in one place. Allow for the whole workspace, because the session is the
  unit of approval.
- **Recommendation:** E. It matches the scope of a session approval and the
  chat note "Allowed for this session".
- **Reason (Cal's choice):** a session approval belongs to one session, so it
  shows in that session. An approval that a wider grant covers adds nothing,
  so it does not show.
- **Effect on earlier decisions:** this narrows secrets decision 8 B of
  [agent secrets](agent-secrets.md). Every member still removes each session
  approval in Capabilities, but from the session of the approval. A closed
  session opens again from History.

## Design calls

My calls, on 20 November 2026:

- "Allowed in the workspace" covers a pre-approval and a secret for all
  agents. Reason: both cover every session of the workspace.
- A hidden approval stays stored. It shows again when a member unchecks the
  secret. Reason: Cal asked to hide it, not to delete it, and a check that
  deletes data cannot be undone with an uncheck.
- The row keeps the secret name, then "Allowed by you, 5 minutes ago", and
  Remove. The session name goes, because the title gives it.
- The group hides when it holds no shown approval, as the groups do today.
  It also hides when no session is open.
- The Worker read stays as it is. The app filters the approvals by the open
  session. Reason: the read already gives every approval, and no API
  change keeps older Mac apps working.
- "Values for this workspace" stays as it is, because a value covers the
  whole workspace.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The control of `app/capabilities` shows the approvals of the open session
only, under "This session", and hides an approval of a pre-approved secret.

- [x] Change the words in `docs/mockups/src/components/capabilities/capabilitiesCopy.ts`:
      the title "This session" and the detail "Allowed by <who>, <when>".
- [x] Change `docs/mockups/src/components/capabilities/GrantList.tsx` and its
      fixtures, so that the page shows the approvals of one session. Keep one
      approval of a pre-approved secret in the fixture, hidden by the control.
- [x] Update the steps and the decision text of
      `docs/mockups/src/entries/app/capabilities/index.mockup.tsx`.
- [x] Update `docs/mockups/design-secrets.md` and
      `docs/mockups/catalogue-secrets.md`.
- [x] Run `npm run mockups:check`. Smoke-test `app/capabilities` and its
      variants at desktop and phone width.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update the Grants and Capabilities sections of
      `docs/protocol/secrets.md`: the control of a session lists the
      approvals of that session, and it hides an approval whose secret the
      workspace allows.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates the changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates the changed fact.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: App

Tags: ui

Depends on: 2

- [x] Pass the open session to the control from
      `src/shell/capabilities/WorkspaceCapabilities.tsx`, and keep only its
      approvals whose secret the workspace does not allow.
- [x] Change `src/shell/capabilities/GrantList.tsx` to the new title and
      detail.
- [x] Update `src/shell/capabilities/WorkspaceCapabilities.test.tsx`: an
      approval of another session does not show, an approval of a checked
      secret or a secret for all agents does not show, and it shows again
      after an uncheck.
- [ ] Smoke-test the control in the app at desktop and phone width.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and `npm run check`.
- [x] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
