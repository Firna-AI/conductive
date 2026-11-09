import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const merge = defineScreen({
  title: 'Merge',
  description:
    'Cal pressed Squash and merge. The merge runs: the button shows a spinner and Merging until GitHub reports the result, and the bar keeps Ready to merge. On a phone the same button stands at the top of the Checks tab.',
  rationale:
    "The user chose decision 220: the app merges as the member who clicks, with that member's own GitHub token, so GitHub shows the member as the merger and checks the member's rights and the rules of the branch. The merge carries the head commit that the bar shows. Decision 228 chose one click with no question. After a merge, the bar shows Merged, as app/banner/checks/merged draws it.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'ready-to-merge', appAction: 'merging' },
  useCasePaths: ['user-flows/merge-and-continue'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'moved-head',
      title: 'New commits before the merge',
      description:
        "GitHub refused the merge, because the branch got new commits after the bar showed it. A message under the bar says so in the app's own words. Merge stays, so Cal can review the new commits and merge again.",
      props: { appAction: 'merge-moved-head' },
    },
    {
      slug: 'no-right',
      title: 'No right to merge',
      description:
        "GitHub refused the merge, because Cal's GitHub access does not allow merges into main. The message says so in the app's own words, and the bar hides Merge, which would fail again.",
      props: { appAction: 'merge-no-right' },
    },
    {
      slug: 'refused',
      title: 'Another refusal',
      description:
        'GitHub refused the merge for another reason, such as a rule of the branch. The message says only that GitHub refused it, with Open on GitHub, where GitHub names the reason. No GitHub error text reaches the app.',
      props: { appAction: 'merge-refused' },
    },
    {
      slug: 'read-access',
      title: 'Ready to merge, without the right',
      description:
        'Priya, a member with read access on GitHub, sees the same Ready to merge without Merge, because GitHub gives her no right to merge. The agent actions of the other states are hidden from her too. Open on GitHub stays.',
      rationale:
        "Decision 221 chose GitHub's own answer: the Worker reads each member's access with that member's token, and shows Merge only for write access or more. When the Worker cannot read the access, Merge is hidden, and the agent actions still show.",
      props: { viewer: 'member', access: 'read' },
    },
  ],
})
