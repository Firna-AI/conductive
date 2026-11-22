import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const mergeQueue = defineScreen({
  title: 'Merge queue',
  description:
    'The Merge queue group stands at the top of the list of Acme, above the sections, because a queue holds entries. Its block for acme/storefront lists the layers of its stack from place 1, which merges first. Each row shows its place, its list mark in the colour of its checks, its name, and its step under the name: Upgrade to Next.js 16 is ready to merge, Apple Pay button waits for its checks, and Checkout address autocomplete rebases onto #479, the pull request below it. Fix flaky cart test needs attention below the stack: its checks still fail after its one fix turn, so it left the stack. A queued workspace shows only in the group, so Checkout keeps only Retry failed webhooks, and Infra counts one workspace. On a phone the group stands at the top of the list page. The child pages show the steps of a merge, two queues, a member stack, the drags, sub-workspaces, and the menus.',
  rationale:
    'Cal asked on 20 November 2026 for a merge queue with a group of its own, shown only while it has entries. Decision 313 F makes each queue one GitHub stack of a repository, into its default branch (decision 320), so each block names its repository, and place 1 is the bottom layer. Decision 318 D moves a queued workspace out of its section to one flat row of the group, as Archive does. The mark keeps the colours of the sections, and the step adds the words of the queue, so a state never depends on colour alone. The words of each step and each reason come from `queueCopy.ts`.',
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
