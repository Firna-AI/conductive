import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const runWorkspace = defineScreen({
  title: 'Run workspace',
  description:
    "The workspace of the run of PR opened #482, in General. Its header links to the routine Review pull requests and to the pull request on GitHub. Its base branch is the head branch of #482, so the bar shows calummoore/porto-3f8m → calummoore/checkout-autocomplete, and Changes stays empty until the run edits files. Its first message is the prompt, a separator line, and the facts of the trigger: the routine, the trigger, the number and the address of the pull request, its head branch with the head commit, the branch that it merges into, and the branch that the run's work goes to. The agent works on it.",
  rationale:
    'The user chose option A of decision 505: a pull request run starts its own branch from the head commit of the pull request. So its pull request bar does not show that pull request. The user chose option G of decision 507 on 9 November 2026: each workspace has a base branch, and the base branch of an opened or pushed run is the head branch of its pull request. Changes and each diff compare with it from the merge base, so the run shows only its own work, and Create pull request opens a pull request into that branch. Until the run pushes, the bar shows no commits, as for any branch that is not on GitHub. The design adds the links of option D. The first message copies no title or body of the pull request, because the agent reads the pull request itself. A run workspace is a normal workspace in the section of its routine, from decision 504 A.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    run: 'pull-request',
    conversation: 'first-turn',
    banner: 'no-commits',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'starting',
      title: 'Starting',
      description:
        'The cloud computer of the run starts. The first message waits, and the steps fetch the pull request before they create the branch. The bar already names the base branch, the head branch of #482.',
      props: { sandbox: 'starting', conversation: 'queued' },
    },
    {
      slug: 'run-now',
      title: 'Run of Run now',
      description:
        'The workspace of the run that Run now started, on a new branch from main. Its base branch is the default branch, main, as for a workspace that a person created. Its header links to Morning summary only, and its first message names the routine and the trigger, Run now.',
      props: { run: 'run-now', banner: 'no-commits' },
      useCasePaths: ['user-flows/create-routine'],
    },
    {
      slug: 'start-failed',
      title: 'First start failed',
      description:
        'The workspace of the run of PR opened #486, whose first start failed. The line under the header still links to the routine and to #486. The bar shows the message that the app saved for the start, and Try again starts a new sandbox in the same workspace. The first message of the run waits in the queue, and the composer under the bar takes more messages. The files and the tools show the error. The row of the run in the Runs list opens this workspace.',
      rationale:
        'The user chose option D of decision 130 and option B of decision 512: a run whose first start fails keeps its workspace in the error state, as app/new-workspace/error shows for a workspace that a person created. The run stays failed after Try again, and its failed start counts toward the turn-off after three failed runs in a row, from decision 513 B.',
      props: { run: 'start-failed', sandbox: 'error', conversation: 'queued' },
    },
    {
      slug: 'turn-failed',
      title: 'First turn failed',
      description:
        'The workspace of the run of PR pushed #486, whose first turn stopped with an error of the model provider. The error names the cause, and Try again retries the turn. The Runs list shows the run as failed with the same words, and its row opens this workspace.',
      rationale:
        'A failed first turn keeps its workspace, so Try again is in the chat, as for any turn. A failed turn counts as output for the state of a workspace, so the workspace shows Ready. The Runs list shows the run as failed, because the state of its workspace would hide the failure.',
      props: { run: 'turn-failed', conversation: 'failed' },
    },
  ],
})
