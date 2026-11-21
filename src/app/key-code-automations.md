# Key code: automations

This page is part of the [web app guide](README.md), beside
[Key code](key-code.md). It names the entry points of the automations:
their readers, models, and drafts, the Automations page, the automation
page, and the Runs list. Each path is relative to `src/app/`, the folder
of this page. [Automations](../../docs/protocol/automations.md) gives their
requirements.

- `api/read-automations.ts`: the readers of the automations, each with its newest run, and of one automation. `api/read-automation-runs.ts`: the readers of the runs.
- `automation-model.ts`: `AutomationModel`, one automation with its reads, its
  saves, and its runs, and `automationModel`, the model that the org keeps for
  each automation. Its `client` sends the other requests of the automation page,
  and an `automation_not_found` from any of them reads the automation again.
  Its `runLogin` is the login of the runs that the last answer names, and its
  `chosenSecrets` the chosen secrets that it names, or null for the answer of
  a previous Worker.
  `automation-actions.ts`: create, update, Turn off, Delete, and Run now,
  which also update the Automations list.
- `automation-runs.ts`: `AutomationRuns`, the Runs list of one automation: the
  pages that it shows, which each read gets again from the newest run
  while the page shows them, Show older runs, which adds a page, and Run
  now.
- `automation-draft.ts`: the draft of the automation page, the equality of each
  of its fields, its create and update requests, and whether Save can send
  it. `automation-triggers.ts`: the
  defaults of a new trigger and the edits of an author filter.
  `automation-cron.ts`: the rule of a custom cron, which the Worker applies
  too.
- `../shell/automations/AutomationsScreen.tsx`: the Automations page, which the
  Automations link of the sidebar and of the phone list opens.
  [Automations](../../docs/protocol/automations.md#the-automation-pages) states what
  it shows.
- `../shell/automations/AutomationScreen.tsx`: the automation page and the page of
  a new automation. `AutomationEditor.tsx` is the form of the owner, and
  `AutomationReader.tsx` the read-only view of every other member, with Turn
  off and Delete for an admin. Its line under the prompt names the login of
  the runs that the answer names, with `loginOwnerName`. `useAutomationSave.ts` is Save, with the login
  that a save refused. `AutomationFrame.tsx` puts the Runs list beside the
  form on desktop, and on the Runs tab of a phone. It alone shows the
  notice of a suspended org, in every view of the page. `AutomationNote.tsx`
  is the note above an automation, which reads the saved repository from the
  repository list of the org. `RunSecrets.tsx` is the line under the prompt
  that names the chosen secrets for every member, with the pull request
  hint. It names a saved choice from the answer, or from the secrets list of
  the org for the answer of a previous Worker. A secret that the owner checks
  before Save takes its name from the secrets list that the control loaded.
- `../shell/automations/RunsPanel.tsx` and `RunList.tsx`: the Runs list, with
  the mark, the state, the trigger, the pull request, and the time of each
  run, and the link to its workspace. `run-copy.ts`: the mark of a run, the
  cause of a failed run in words, from the agent and the owner of the run
  itself, and the reason of a skipped run, with the login of an account
  outside the org. `RunNow.tsx`: Run now of the owner.
- `../shell/workspace/RunLine.tsx`: the line under the header of a run
  workspace, which links to its automation, and to the pull request of a pull
  request run.
