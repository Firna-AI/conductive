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
  [Automation runs](../docs/protocol/automation-runs.md), with
  [Automation risks](../docs/protocol/automation-risks.md).
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

Design calls of the mockups, on 18 November 2026:

- The Capabilities icon stands before the model picker in the bar of the
  prompt box, as in a composer. Its control opens above the icon, from its
  start. Reason: the order of the bar of a composer.
- A phone keeps the icon in the bar of the prompt box, with no + menu. A
  press opens the control as a sheet. Reason: the bar holds only the icon
  and the model picker, so both fit at 360 px. A composer has the + menu
  because its bar holds more (secrets decision 16 G).
- The secrets part of an automation has its own hint: "Each run workspace
  starts with the checked secrets pre-approved, so agents use them with no
  question." Reason: a check acts on each later run workspace, not on a
  workspace that exists.
- A line under the prompt box names the chosen secrets, after the line of
  the logins: "Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no
  question." It has the key icon, and each name is in the monospace font.
  It hides while no secret is chosen. Every member sees it, also the
  owner. It is the read-only view of each member who is not the owner.
  Reason: the closed icon shows no choice, and the hint needs the names
  that it means.
- The line names only the chosen secrets, not the secrets for all agents.
  Reason: it says what the automation adds, and decision 3 A shows the
  hint for a chosen secret.
- The pull request hint follows that line, with the warning icon: "Text in
  a pull request, such as a comment, can steer the agent to use these
  secrets." Every member sees it, not only the owner. For the owner it
  follows the triggers of the form, also before Save. For each other
  member it follows the saved triggers. Reason: decision 3 A says that the
  page shows it, and an admin can turn the automation off.
- A suspended org keeps the line of the secrets, and shows no hint, as
  it shows no line of logins. Reason: the settings of a suspended org stay
  readable ("an org suspension takes away no access to read" in
  `docs/protocol/automations.md`), and no run starts.
- The state `app/automations/automation/capabilities` uses Cal's
  automation that reviews pull requests. It has pull request triggers, so
  the same state shows the hint, and it needs no variant. In the fixtures,
  that automation chooses FIGMA_TOKEN and VERCEL_TOKEN, and Priya's weekly
  automation chooses VERCEL_TOKEN. So the canonical page, its child pages,
  and the Runs pages show the lines too.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The automation page gets the Capabilities control in its prompt box.

- [x] Add the Capabilities icon to the bar of the prompt box in
      `docs/mockups/src/components/automations/PromptBox.tsx`, beside the
      model picker.
- [x] Add an automation intro to
      `docs/mockups/src/components/capabilities/capabilitiesCopy.ts`, and
      a secrets-only list of parts for an automation.
- [x] Add the state `app/automations/automation/capabilities`: the
      control open for the owner, with two secrets chosen, on a desktop
      and on a phone.
- [x] Show the chosen secrets read-only on the member view and the admin
      view of the automation page.
- [x] Show the pull request hint on the state with a pull request trigger
      and a chosen secret.
- [x] Update `docs/mockups/catalogue.md` for the new state.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/automations.md`: the chosen secrets of an
      automation, who sees and changes them, the pull request hint, the
      owner move, and the new risk under Risks that stay open. Add the
      line under the prompt that names the chosen secrets, and say that
      every member sees it and the hint, and that a suspended org keeps
      the line and shows no hint, as the design calls of the mockups say.
- [x] Move Risks that stay open from `docs/protocol/automations.md`
      to the new page `docs/protocol/automation-risks.md`, because the
      new sections take the doc past about 250 lines. Update each link
      to the section, and the list in
      `docs/architecture/protocol-docs.md`.
- [x] `docs/protocol/automation-runs.md`: a run workspace starts with the
      chosen secrets as pre-approvals. Mac access stays off.
- [x] `docs/protocol/secrets.md`: the Grants rule and Turns that no
      person started. Remove the rejection of a picker on the automation
      form, and keep its reason in this plan.
  - The removed line rejected option B of secrets decision 5, "The
    routine form gets the secret picker of New workspace". Cal chose C
    on 13 November 2026, because the time limit of a request ends the
    wait of its tool call, so an unanswered request keeps no cloud
    computer awake (`plans/agent-secrets.md`). That reason still holds
    for each secret that the automation did not choose.
- [x] `docs/protocol/capabilities.md`: the control on the automation page,
      with its secrets part only. Only the owner opens it.
- [x] Add the risk that the creator of a chosen secret, or an admin, can
      replace its value, and each later run then uses the new value.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact.
- [x] Read each guide in `src/marketing/docs/` that names automations,
      secrets, or Capabilities in full. Update each sentence that restates
      a changed fact.
- [x] Update `worker/automations/README.md` and `worker/secrets/README.md`.
- [x] Check each relative link of each changed Markdown file.
  - [x] The protocol docs, the architecture docs, and the READMEs.
  - [x] The guides in `src/marketing/docs/`.

## Milestone 3: Store and use the chosen secrets

Depends on: 2

- [x] Add the migration `automation_secret_preapprovals`, with its entry
      in `migrations/README.md`. Check that the previous Worker keeps
      working on the new schema.
- [x] Add `AutomationCapabilities` and the `capabilities` field to
      `src/shared/automations.ts`.
- [x] Read and write the list in `worker/automations/` with each
      automation: the read, the create, the update, and the reply.
- [x] Pass the list to the create in `worker/automations/run-starter.ts`,
      with `macAccess: false`. Read it right before the create, and keep
      only the IDs that name a secret of the org. The create refuses a
      missing secret with `secret_not_found`
      (`worker/lifecycle/create-request.ts:40`). So when a secret goes
      between the read and the create, read the list again and create
      once more.
- [x] Tests: save and read the list, keep it on an update without it, drop
      an unknown ID, copy it into the run workspace, go on after a deleted
      secret, end the choice when the secret is deleted, and refuse a
      change by a member who is not the owner.
- [x] Update the automations of the dev fake in
      `src/app/dev/automation-routes.ts`.

Implementation and check evidence: `.context/automation-capabilities/m3-report.md`.

## Milestone 4: Automation page

Tags: ui

Depends on: 1, 3

- [x] Add the list to the draft in `src/app/automation-draft.ts`, so that
      Save turns on after a change and the update sends the field.
- [x] Add the Capabilities tool to the prompt box of
      `src/shell/automations/AutomationEditor.tsx`, as the mockup draws it.
- [x] Add a secrets-only list of parts to
      `src/shell/capabilities/capability-parts.tsx`, with no grants and no
      Mac part. Take the words from `capabilitiesIntro.automation` and
      `secretsPartWords.automationHint`.
- [x] On a phone, keep the icon in the bar of the prompt box, and open the
      control as a sheet. Today a tool opens its sheet only from the +
      menu of a composer (`src/chat/components/ComposerMenu.tsx`).
- [x] Show the line of the chosen secrets under the prompt box, in the
      editor and in `src/shell/automations/AutomationReader.tsx`, with
      `runSecretsWords`. Keep it in a suspended org.
- [x] Show the pull request hint for every member, with
      `hasPullRequestTrigger` of
      `docs/mockups/src/components/automations/triggerCopy.ts`: the
      triggers of the form for the owner, and the saved triggers for each
      other member. Hide it in a suspended org.
- [x] Tests for the draft and the screens.
- [x] Check the page in a browser: choose a secret, save, return to the
      page, and Run now. The dev fake gives no chat for a workspace that
      it makes, so its Capabilities do not show. The post-merge smoke test
      below checks the run workspace with a real cloud computer.
- [x] The dev fake's Run now pre-approves the chosen secrets in the run
      workspace, with Mac access off, as the Worker does.
- [x] Describe the page parts in `src/app/screens.md`,
      `src/app/data-lifecycle.md`, `src/app/suspended-org.md`, and
      `src/app/dev-fake.md`.

Implementation and check evidence: `.context/automation-capabilities/m4/`.

Design calls of Milestone 4, on 18 November 2026:

- The order of chosen secrets does not count for Save. Reason: the Worker
  answers in its own order, and a check that the owner takes back must
  leave Save off.
- The line lists names in the order of the org's secrets list, and leaves
  out an ID with no name. The page reads the secrets only when a chosen ID
  has no name in the list. The line and the hint hide until the names
  load, because the hint refers to "these secrets".
- The phone sheet lives in `src/shell/automations/PromptTool.tsx`. A later
  change can move it into `src/chat/components/ComposerTools.tsx`.
- The icon and the checks are off while a save runs. The other fields stay
  editable, as today.
- My call: the run-workspace part of the browser check moves to a
  post-merge smoke test. Reason: a run needs a real cloud computer, and
  the `plans` skill puts such a check after the merge.
  `worker/automations/run-capabilities.test.ts` covers the copy into the
  run workspace before the merge.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, choose a secret on an automation, use Run
      now, and check that the Capabilities of the run workspace show it as
      pre-approved by the owner, with Mac access off.
