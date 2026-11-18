# Automation capabilities

Status: Active. On branch `calummoore/add-capabilities-to-routines-2bld`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Cal asked on 18 November 2026 to "add capabilities to routines". Routines
are the automations of [Automations](../docs/protocol/automations.md),
since pull request #397. Today each run workspace starts with no
pre-approved secret and with Mac access off. So a run that needs a secret
waits until a member answers its request. This change adds the secrets part
of the Capabilities control to the automation page. Only the owner chooses
the secrets. Each run copies them into its run workspace as normal
pre-approvals. Mac access stays out of automations.

The change does not cover Mac access in runs. The open item
`plans/follow-ups/automation-turns-mac-commands.md` keeps that question. It
does not cover a record of whether a person started a turn, a run grant
that ends with the first turn, or later parts such as MCP servers.

The decisions of this change carry the short name "automation capabilities
decision", such as automation capabilities decision 1. The brainstorm
report is in `.context/automation-capabilities/widen.md`.

Contract owners:

- [Automations](../docs/protocol/automations.md) and
  [Automation runs](../docs/protocol/automation-runs.md).
- [Secrets](../docs/protocol/secrets.md) and
  [Capabilities](../docs/protocol/capabilities.md).
- The [automations README](../worker/automations/README.md) and the
  [secrets README](../worker/secrets/README.md).

## Decisions

Terms:

- **Pre-approval:** a grant of one workspace. Each session there uses the
  secret with no request, for the life of the workspace.
- **Run grant:** a grant that serves only the first turn of a run
  workspace, and ends with that turn.
- **Steering text:** text from outside the org that the agent reads and
  follows, such as a pull request comment.
- **Session calls:** the agent tools `create_session` and `send_message`.
  Any agent of the org can start turns with them in each workspace. Those
  turns use the grants of that workspace.

### Automation capabilities decision 1: How runs get the owner's capabilities

Cal chose A on 18 November 2026: each run copies the chosen secrets into
its run workspace as normal pre-approvals. It reverses the rejection of "a
picker of secrets on the automation form" in secrets decision 5, and the
Grants rule that a run workspace starts with no pre-approval. Secrets
decision 5 C stays: a request for each other secret waits for a member.

Root question: how does the owner give the runs the capabilities they
need, with no person present, and keep steering text from misusing them?
The options as they were asked:

- A. Each run copies the choices into its workspace as normal
  pre-approvals. The grants stay in each kept run workspace. Through the
  session calls, any agent of the org can then use the secret there.
  Effort: Large.
- B. Each run gets a run grant for its first turn. Later turns ask, as in
  each workspace. It costs about one day more than A. Effort: Large.
- C. Each run workspace reads the current list of its automation at each
  use. Members cannot remove the grant in one run workspace. Effort: Large.
- D. Each turn records whether a person or an automation started it.
  Automation turns use only the list of the automation and the All agents
  mark. It is a breaking change of behaviour. Effort: Large.

Left out: change nothing, because the All agents mark serves the whole org
and only admins set it. "Allow for this automation" on a request card,
because the first run still waits. Session approvals of the first session,
because A is as good with less code. A grant that ends after a set time,
because B ends with the work. An org identity, a locked run workspace, and
an "automation Mac", because each breaks a requirement that stays. A
secrets gateway, because it does not meet the goal alone.

Recommendation was B. Wider fix: D.

The options check of 18 November 2026 added two options after Cal's
answer. Its report is in `.context/automation-capabilities/options-check.md`.

- E. Each run copies the chosen secrets as session approvals of its first
  session, with the owner as the approver. The first-turn report removes
  them when the first turn ends. The wire keeps the `session` grant kind.
  The removal must keep the approvals that members give, and a failed
  start that a member retries needs its own end. Effort: Large, about half
  a day more than A.
- F. Each run copies the chosen secrets as pre-approvals that serve only
  the turns that the owner sends. The copies stay in each kept run
  workspace, and it adds the first grant that depends on the sender.
  Effort: Large.

The check recommended E over A, because E leaves no secret in kept run
workspaces, as B does. Cal kept A on 18 November 2026, after he read
options E and F.

### Automation capabilities decision 2: Whether Mac access joins

Cal chose A on 18 November 2026: secrets only. Run workspaces keep Mac
access off, as secrets decision 18 A says. The Mac follow-up keeps its own
decision.

The options as they were asked:

- A. Secrets only. Effort: Small.
- B. The automation gets a Mac switch that starts off. Steering text can
  then run each always-allowed command of the owner. Effort: Medium.
- C. B, and each Mac request from a run asks, also for an always-allowed
  command. In practice it serves Run now only. Effort: Medium.
- D. The switch with the turn record of decision 1 D. Effort: Large.

Left out: a switch that turns on Mac access in each run workspace, because
each later member who sends a message there exposes their own Mac.

The options check added two options. It kept the recommendation A.

- E. The automation keeps a list of exact Mac commands with their folders.
  The Worker refuses each Mac request of a run that is not on the list.
  Effort: Large.
- F. A Mac switch that starts off. Each run creates its workspace with
  Mac access on, and the first-turn report turns it off when the first
  turn ends. It reverses secrets decision 18 A for runs. Effort: Medium.

### Automation capabilities decision 3: Pull request runs

Cal chose A on 18 November 2026: one list serves each run of the
automation. The page shows a hint while the automation has a pull request
trigger and a chosen secret.

The options as they were asked:

- A. One list, with a hint. Effort: Small.
- B. Pull request runs get no chosen secret. Effort: Small.
- C. Each trigger row gets its own "Use capabilities" choice. Effort:
  Medium.

Left out: a rule by the author of each event, because the author rule
already decides who starts a run, and comments come from other accounts.

The options check added one option. It kept the recommendation A.

- D. Pull request runs of a public repository get no chosen secret. The
  Worker reads the visibility from each webhook, and the page says so. A
  private repository still takes comments from outside collaborators.
  Effort: Medium.

## Design

My calls, on 18 November 2026:

- The automation stores its chosen secrets in a new table
  `automation_secret_preapprovals`, with foreign keys to `automations` and
  `org_secrets` that cascade on delete. It follows
  `workspace_secret_preapprovals`. Reason: a deleted secret or a deleted
  automation then ends the choice by itself.
- The wire field is `capabilities: { preapprovedSecretIds }` on
  `Automation`, and optional on the create and update requests. Reason:
  the shape matches `WorkspaceCapabilities` without `macAccess`, and later
  parts join the same object.
- An update without `capabilities` keeps the stored list. A create
  without it starts empty. Reason: an older app tab then keeps the
  choices.
- The Worker drops each ID that names no secret of the org, and it saves
  the rest. It refuses a value that is not a list of strings, as it
  refuses other bad input. Reason: no new refusal, and a secret that
  someone deleted while the form was open must not block a save.
- Every member sees the chosen secrets, read-only. Only the owner changes
  them. An admin who is not the owner keeps only Turn off and Delete.
  Reason: decision 502 B and the access rules of automations.
- The owner may choose each secret of the org. Reason: every member uses
  each secret (secrets decision 3 B).
- The run reads the current list of its automation at the create. The
  creation plan keeps it for each retry of that create. A deleted secret
  leaves the list, and the run goes on without it. Reason: graceful
  handling, and the pre-approval insert already skips a missing secret.
- The run workspace records the owner as the member who pre-approved
  each secret. Members can remove each one there, as for each
  pre-approval (secrets decision 8 B).
- A workspace that the agent of a run creates gets no capability. Reason:
  [Grants](../docs/protocol/secrets.md#grants).
- When the owner leaves, the moved automation keeps its list and turns
  off, as today. Reason: the new owner decides when it runs.
- Run now uses the same list as the other triggers.
- The run text does not name the secrets. Reason: `list_secrets` already
  marks each available secret.
- The automation page puts the Capabilities icon in the bar of the prompt
  box, beside the model picker. It reuses the parts of
  `src/shell/capabilities/capability-parts.tsx` without the Mac part. Its
  intro says what the agents of each run can use. Reason: secrets
  decision 6 G keeps one control.
- The pull request hint shows under the prompt box while the form has a
  pull request trigger and at least one chosen secret. It says that text
  in a pull request can steer the agent to use these secrets.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The automation page gets the Capabilities control in its prompt box.

- [ ] Add the Capabilities icon to the bar of the prompt box in
      `docs/mockups/src/components/automations/PromptBox.tsx`, beside the
      model picker.
- [ ] Add an automation intro to
      `docs/mockups/src/components/capabilities/capabilitiesCopy.ts`, and
      a secrets-only list of parts for an automation.
- [ ] Add the state `app/automations/automation/capabilities`: the
      control open for the owner, with two secrets chosen, on a desktop
      and on a phone.
- [ ] Show the chosen secrets read-only on the member view and the admin
      view of the automation page.
- [ ] Show the pull request hint on the state with a pull request trigger
      and a chosen secret.
- [ ] Update `docs/mockups/catalogue.md` for the new state.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/automations.md`: the chosen secrets of an
      automation, who sees and changes them, the pull request hint, the
      owner move, and the new risk under Risks that stay open.
- [ ] `docs/protocol/automation-runs.md`: a run workspace starts with the
      chosen secrets as pre-approvals. Mac access stays off.
- [ ] `docs/protocol/secrets.md`: the Grants rule and Turns that no
      person started. Remove the rejection of a picker on the automation
      form, and keep its reason in this plan.
- [ ] `docs/protocol/capabilities.md`: the control on the automation page,
      with its secrets part only.
- [ ] Add the risk that the creator of a chosen secret, or an admin, can
      replace its value, and each later run then uses the new value.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact.
- [ ] Read each guide in `src/marketing/docs/` that names automations,
      secrets, or Capabilities in full. Update each sentence that restates
      a changed fact.
- [ ] Update `worker/automations/README.md` and `worker/secrets/README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Store and use the chosen secrets

Depends on: 2

- [ ] Add the migration `automation_secret_preapprovals`, with its entry
      in `migrations/README.md`. Check that the previous Worker keeps
      working on the new schema.
- [ ] Add `AutomationCapabilities` and the `capabilities` field to
      `src/shared/automations.ts`.
- [ ] Read and write the list in `worker/automations/` with each
      automation: the read, the create, the update, and the reply.
- [ ] Pass the list to the create in `worker/automations/run-starter.ts`,
      with `macAccess: false`. Read it right before the create, and keep
      only the IDs that name a secret of the org. The create refuses a
      missing secret with `secret_not_found`
      (`worker/lifecycle/create-request.ts:40`). So when a secret goes
      between the read and the create, read the list again and create
      once more.
- [ ] Tests: save and read the list, keep it on an update without it, drop
      an unknown ID, copy it into the run workspace, go on after a deleted
      secret, end the choice when the secret is deleted, and refuse a
      change by a member who is not the owner.
- [ ] Update the automations of the dev fake in
      `src/app/dev/automation-records.ts`.

## Milestone 4: Automation page

Tags: ui

Depends on: 1, 3

- [ ] Add the list to the draft in `src/app/automation-draft.ts`, so that
      Save turns on after a change and the update sends the field.
- [ ] Add the Capabilities tool to the prompt box of
      `src/shell/automations/AutomationEditor.tsx`, as the mockup draws it.
- [ ] Show the chosen secrets read-only in
      `src/shell/automations/AutomationReader.tsx`.
- [ ] Show the pull request hint.
- [ ] Tests for the draft and the screens.
- [ ] Check the page in a browser: choose a secret, save, reload, and
      Run now. Check that the run workspace shows the pre-approval.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
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
