# Org prompts for the agent actions

Status: Active. On branch `calummoore/oslo-hse2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The pull request bar has six agent actions: Create PR, Commit and push,
Push, Fix checks, Resolve conflicts, and Address review. Each one sends a
fixed prompt of the app, with the facts of the pull request, as a message
of the member who presses it
([Agent actions](../docs/protocol/github-banner.md#agent-actions)). An org
cannot change the steps of a prompt. For example, Resolve conflicts always
asks the agent to merge the target branch, also for a team that rebases.

This change adds a Prompts tab to the org settings. An admin edits the
steps of each action there, or resets them to the default. The app always
adds the facts and the line "Don't reply on GitHub." after the steps. The
change does not cover messages that members type, routines, the agent instructions,
the base prompt of Claude agents, a prompt for each member, or a prompt
for each repository.

Contract owners:

- [GitHub banner](../docs/protocol/github-banner.md), section "Agent
  actions".
- [Orgs and members](../docs/protocol/orgs-and-members.md), section
  "Members and roles".
- [Command palette actions](../docs/protocol/command-palette-actions.md),
  section "Settings".
- The [Worker app API README](../worker/app-api/README.md).
- The [GitHub bar README](../src/github/actions.md) and the
  [mockups README](../docs/mockups/README.md).

Replaced ways:

- The six prompts with facts inside their sentences, from `agentPrompt` in
  `docs/mockups/src/components/workspace/barCopy.ts` → default steps
  without facts, then the facts block and the fixed line. Consumers:
  `src/github/barPrompts.ts`, `src/github/barPrompts.test.ts`, the banner
  mockups, and `src/github/dev/`. Moved in Milestones 1 and 4. The old
  `agentPrompt` shape is deleted in Milestone 4.

## Decisions

### Prompts decision 1: how an org edits the bar's agent prompts

- **Date:** 16 November 2026. The user, Cal, chose C, in a Prompts tab of
  the org settings.
- **Root question:** How does an org make the app's built-in agent
  requests fit its own way of working?
- **Options:**
  - **A.** Fixed prompts that tell the agent to follow the repository's
    `CLAUDE.md` or `AGENTS.md`. Left out after the user asked for an org
    setting.
  - **B.** Admins add org text after each fixed prompt. The app's own
    steps stay, and the org text wins over them.
  - **C.** Admins replace the steps of each action. The app adds the
    facts and the fixed safety lines. Reset to default restores the steps.
  - **D.** One org text that the runner adds to the agent instructions of
    each new session.
  - **E.** Added by the options check after the choice. Steps for each
    repository in the org settings, which win over the org's steps. Cost: a
    second level in the tab, the routes, and the tests. Effort: Large.
  - **F.** Added by the options check after the choice. C, and the default
    steps tell the agent to follow the repository's agent files when they
    say otherwise, for example a rebase. Cost: a less predictable default,
    and a rebase rewrites a branch that other members can share. Effort:
    Small on top of C.
- **Left out:** change nothing, because the fixed merge step stays. Each
  member's own prompts, because the user asked for an org setting. Edits
  by every member, because org text runs with the GitHub rights of the
  member who presses, as for the scripts of decision 57. An edit in the
  composer before each send, because no rule lasts and the press no
  longer sends at once. Fixed choices such as merge or rebase, because
  they fail for each rule that the app did not foresee. A repository file
  that the app reads before each send, because the send then waits for
  the sandbox, and the user asked for an org setting.
- **Reason for C:** the request asked to "override/edit" the prompts. C
  gives full control of the steps, and the app still adds the facts and
  the safety lines.
- **Options check:** C stays the best option. My call, 16 November 2026:
  E waits for a request, because the user asked for an org setting, and
  org steps can already name a repository. F stays out, because an org
  that rebases now edits Resolve conflicts in the Prompts tab, and the
  default stays predictable. The report is in `.context/org-prompts/`.
- **Previous examples:** the deleted plan `plans/pull-request-bar-actions.md`
  (`git show 60407f8f4^:plans/pull-request-bar-actions.md`, lines 667-669)
  deferred custom prompts for each org. `docs/protocol/base-prompts.md`
  rejected an org setting for the base prompt, because no user asked for
  one.

## Design

### The text of a press

A press sends this text:

```text
<the steps: the org's text, or the app's default>

---
<one line for each fact of the action>
<the fixed line: "Don't reply on GitHub.">
```

- The facts use labeled lines, as the run text of a routine does
  (`worker/routines/run-text.ts:27`). Examples: `Pull request: #12`,
  `Target branch: main`, `Failed checks: lint and test`, and
  `Requested changes: @alice`.
- Each action keeps the facts that its prompt names today. Commit and push
  and Push have no facts.
- The fixed line is the rule "Don't reply on GitHub." It goes into every
  action, because the user chose C with the no-reply line in the app's
  part. It stops a reply that the agent would post on its own, as the
  member who pressed. An org text that asks for a reply conflicts with it.
  So the Prompts tab shows the fixed line beside each box.
- My call, 16 November 2026: the `gh` fallback belongs to the default
  steps, not to the fixed line. Reason: each fallback fits the steps of
  its action, as the earlier bar plan says. A fixed fallback would
  contradict edited steps that do not use `gh`. An unedited action sends
  the same fallback as today.
- The default steps are the steps of today's prompts, with their `gh`
  fallback, and without the facts. For example, Fix checks says "Fix the failed checks
  below. Find out why with `gh pr checks`, and read the logs of failed
  GitHub Actions jobs with `gh run view --log-failed`..." The banner
  mockups give the exact words.

### Storage and routes

- A new D1 table `org_prompts` holds one row for each edited action: the
  org ID, the action, the steps, the time of the change, and the member
  who changed it. The primary key is the org ID and the action. A deleted
  org deletes its rows.
- My call, 16 November 2026: the table is separate from `settings`. Reason:
  it holds one row for each action, and a prompt save then never takes part
  in the guarded writes of the scripts and the env vars
  (`worker/app-api/feature-settings-data.ts`).
- An action without a row uses the default steps. So the app's later
  changes to a default reach each org that did not edit that action.
- `GET <org path>/prompts`, beside `<org path>/settings` in
  `src/shared/org-settings.ts`, returns the edited steps of each action.
  Every member of the org can read it.
- `PUT <org path>/prompts/:action` saves the steps of one action.
  A body with `steps: null` deletes the row, which is Reset to default.
  Only an admin of an org that is not suspended can write. The Worker uses
  the same access check as the scripts (`assertCanChangeSharedSettings`).
- An unknown action name gets the existing `invalid_input` error.

### The Prompts tab

- The org settings get a fifth tab, Prompts, after Members. Its route is
  `settings(orgId, 'prompts')`.
- The tab lists the six actions in the order of the bar. Each one shows
  its label, a text box with the current steps, and the fixed part below
  the box, read-only, with sample facts. The fixed part says that the app
  adds it to each press.
- An edited action shows a mark, such as "Edited", and a Reset to default
  button. Each action has its own Save.
- An admin edits. Every other member sees the same tab read-only, as for
  the scripts (decision 57).
- My call, 16 November 2026: Save with an empty box, or with the default
  text, stores no row. The action then follows the default. Reason: an
  empty prompt has no task, and a copy of the default would stop later
  improvements. No save is refused.
- No new length limit. The scripts have none either.
- The command palette's Settings group gets the fifth tab.

### A press of the bar

- The browser keeps building the text, in `src/github/barPrompts.ts`.
- The org model gets a `prompts` resource, which the bar watches while it
  shows, as other org parts do (`src/app/org-model.ts`).
- My call, 16 November 2026: each press reads the prompts again and waits
  for the read, which is one small request. The bar shows its busy state
  meanwhile. When the read fails, the press shows the existing send error
  and sends nothing. Reason: old steps or default steps would be the wrong
  output for an org that edited them. No live event for prompts.
- A session that starts with a press takes its title from the first line
  of the steps, as [Agents and sessions](../docs/protocol/agents-and-sessions.md)
  says. The title then no longer names the pull request number. My call,
  16 November 2026: accept this, because the facts block must follow the
  steps.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Prompts tab, and the new shape of each prompt in the banner mockups.

- [ ] Change `agentPrompt` in
      `docs/mockups/src/components/workspace/barCopy.ts` into the default
      steps with their `gh` fallback, the facts lines, and the fixed
      line, as the design says.
- [ ] Add the Prompts tab to the org settings mockups under
      `docs/mockups/src/entries/app/org-settings/prompts/`: the admin view
      with defaults, an edited action with Reset to default, a save in
      progress, and the read-only view of a member who is not an admin.
- [ ] Add Prompts to the tab list of every org settings mockup, and update
      the descriptions that say "four tabs".
- [ ] Update the banner mockups at `app/banner` that show a sent prompt.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/github-banner.md`, "Agent actions": the steps come
      from the org or the default. The app adds the facts and the fixed
      lines. Prompts decision 1 with its reason. Keep the no-reply rule
      and the `gh` fallback.
- [ ] `docs/protocol/orgs-and-members.md`: only an admin changes the
      prompts. Other members see them read-only.
- [ ] `docs/protocol/command-palette-actions.md`, "Settings": five tabs.
- [ ] `docs/protocol/messages-and-attachments.md`, "Messages from the
      bar": the message holds the org's steps when an admin edited them.
- [ ] `docs/protocol/chat-and-events.md` ("its fixed prompt", line 51):
      the prompt comes from the org or the default.
- [ ] Define "Prompts decision" as the short name of this change in the
      doc that cites it, as `docs/architecture.md` says.
- [ ] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact, such as the data that an org stores.
- [ ] Read each guide in `src/marketing/docs/` in full. Update
      `pull-requests.md` ("a fixed message"), `sessions-and-chat.md`
      ("a fixed message"), `orgs-and-members.md` (the
      settings tabs and the admin table), and each other sentence that
      restates a changed fact.

## Milestone 3: Storage and routes

Depends on: 2

- [ ] Add the migration for `org_prompts` under `migrations/`.
- [ ] Add the read and write routes, with the admin check and the
      suspended-org check, under `worker/app-api/`.
- [ ] Tests: a member reads, an admin saves and resets, a member who is
      not an admin cannot write, an unknown action is refused, a suspended
      org cannot write, and another org's prompts cannot be read or
      written.
- [ ] Update `worker/app-api/README.md`.

## Milestone 4: The Prompts tab and the press

Tags: ui

Depends on: 3

- [ ] Add `'prompts'` to the settings tabs in `src/app/router.ts` and
      `src/shell/settings/OrgSettingsScreen.tsx`.
- [ ] Add the `prompts` resource to `src/app/org-model.ts`, with its
      reader under `src/app/api/`.
- [ ] Build the Prompts tab in `src/shell/settings/`, as the mockup shows.
- [ ] Add the fifth tab to the command palette's Settings group.
- [ ] Build each press from the org's steps or the default in
      `src/github/barPrompts.ts`. Read the prompts at each press. Show the
      send error when the read fails.
- [ ] Move `src/github/barPrompts.test.ts`, `src/github/dev/`, and every
      other consumer to the new shape. Delete the old shape.
- [ ] Tests: a press with defaults, a press with org steps, the fixed line
      after org steps, a press after an admin's change, a failed read, and
      the tab for an admin and for a member.
- [ ] Update `src/github/actions.md` and the settings README, if one
      covers the tabs.
- [ ] Smoke-test in the browser at `npm run dev`: edit Resolve conflicts
      as an admin, press it, and check the sent message.

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

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, edit a prompt as an admin, press its action in
      a workspace, and check that the agent gets the org's steps.
