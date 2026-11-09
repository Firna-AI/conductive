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
    'The user chose option A of decision 205: a pull request run starts its own branch from the head commit of the pull request. So its pull request bar does not show that pull request. The user chose option G of decision 207 on 9 November 2026: each workspace has a base branch, and the base branch of an opened or pushed run is the head branch of its pull request. Changes and each diff compare with it from the merge base, so the run shows only its own work, and Create pull request opens a pull request into that branch. Until the run pushes, the bar shows no commits, as for any branch that is not on GitHub. The design adds the links of option D. The first message copies no title or body of the pull request, because the agent reads the pull request itself. A run workspace is a normal workspace in the section of its routine, from decision 204 A.',
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
  ],
})
