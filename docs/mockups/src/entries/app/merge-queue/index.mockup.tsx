import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const mergeQueue = defineScreen({
  title: 'Merge queue',
  description:
    'The Merge queue group stands at the top of the list of Acme, above the sections, because a queue holds entries. Each row is a normal workspace row, as in a section: its list mark, its name, and its time. Place 1, the next to merge, shows first, and a thin line joins the list marks of the layers of the GitHub stack. Upgrade to Next.js 16 is green, ready to merge. Apple Pay button is grey, and a light runs around its mark while its checks run. Checkout address autocomplete is green, and a light runs around its mark while its agent rebases it onto #479, the pull request before it. Fix flaky cart test still fails its checks after its one fix turn, so it left the stack: it shows after the joined rows, off the line, with its red mark and no label. Its bar names the reason. Acme has one queue, so the group names no repository. A queued workspace shows only in the group, so Checkout keeps only Retry failed webhooks, and Infra counts one workspace. On a phone the group stands at the top of the list page, with the line through the marks of its taller rows. The child pages show the steps of a merge, two queues, a member stack, the drags, a row that cannot join, sub-workspaces, and the menus.',
  rationale:
    'Cal asked on 20 November 2026 for a merge queue with a group of its own, shown only while it has entries. In his review of the mockups on 22 November 2026, Cal asked for normal workspace rows, with no labels, and a vertical line that shows that they are connected. The list mark already shows the GitHub state in its colour and running work with its motion, and the bar names the place, the step, and the reason. Decision 313 F makes each queue one GitHub stack of a repository, into its default branch (decision 320), and place 1 is the bottom layer. An entry that needs attention left the GitHub stack, so the line does not join it. Decision 318 D moves a queued workspace out of its section to one flat row of the group, as Archive does.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'one',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
