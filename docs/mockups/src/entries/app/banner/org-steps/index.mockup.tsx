import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const orgSteps = defineScreen({
  title: 'Steps of the org',
  description:
    'Cal saved steps of Acme for Resolve conflicts, because the team rebases, as app/org-settings/prompts/edited shows. Then Cal pressed Resolve conflicts. The message starts with the steps of Acme: fetch the target branch, rebase on it, resolve each conflict, run the tests, and push with `git push --force-with-lease`. The line of three dashes, the pull request, main, and "Don\'t reply on GitHub." follow, as after the default steps.',
  rationale:
    'The user chose option C of Prompts decision 1, the first decision of the org prompts change, on 16 November 2026: the steps of the org take the place of the default steps, and the app still adds the facts and the line "Don\'t reply on GitHub." So the agent gets the pull request and the target branch, which the steps of the org call "below".',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    focus: 'chat',
    banner: 'conflict',
    conversation: 'sent-org-steps',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
