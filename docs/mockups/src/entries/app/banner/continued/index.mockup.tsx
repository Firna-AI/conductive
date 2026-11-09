import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const continued = defineScreen({
  title: 'After Continue',
  description:
    'The workspace is on its new branch, calummoore/porto-3f8d, from the latest main. The bar starts again at the state without a pull request: the new branch has no commit yet. The session keeps its chat, and a note at the place of Continue names who pressed it, the new branch, and its base.',
  rationale:
    'Each session shows the note, so every member sees why the branch changed. The new branch follows the rule of a new workspace: the GitHub login of the workspace owner, a city name, and four random characters. The workspace keeps its name. The merged pull request belongs to the old branch, which stays on GitHub.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    focus: 'chat',
    branch: 'continued',
    banner: 'no-commits',
    conversation: 'continued',
  },
  useCasePaths: ['user-flows/merge-and-continue'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'moved-files',
      title: 'With the changed files',
      description:
        'The changed files moved to the new branch, so the sandbox has local work. The bar offers Create pull request, and a phone shows it at the top of the Checks tab.',
      props: { localWork: 'changes', focus: 'files' },
    },
    {
      slug: 'by-member',
      title: 'Continued by a member',
      description:
        "Priya pressed Continue in Cal's workspace, and Cal sees her name in the note. The new branch still starts with the GitHub login of Cal, the owner.",
      props: { conversation: 'continued-by-member' },
    },
  ],
})
