import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueSteps = defineScreen({
  title: 'Steps of a merge',
  description:
    'The queue merges Apple Pay button, place 2, and GitHub lands Upgrade to Next.js 16, place 1, with it in one step. Both rows keep the still green mark of a pull request that is ready to merge, and the bar of each says "Merging into main", as app/banner/merge-queue/merge/merging shows. Checkout address autocomplete, place 3, waits for its checks: a light runs around its grey mark. Fix flaky cart test, place 4, failed its checks. The queue sends it no fix turn, so no light runs around its red mark: no agent works on it. It stays on the line in its place, and its bar shows Fix checks, as outside the queue. The layers before it merge without it.',
  rationale:
    'The Worker merges the highest layer that is ready to merge when each layer below it is ready too, and GitHub lands every layer below it with it (decision 313). A red layer waits in its place for a member, who fixes it or removes it, as Cal chose on 22 November 2026, and the layers below it still merge. The rows say no step in words: the mark shows the GitHub state in its colour and the work of an agent or of the checks with its motion, as in a section, and the bar names the step.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'merging',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'merged',
      title: 'After the merge',
      description:
        'The merge landed #476 and #479 in main. Both left the queue and stand in their sections again, with the purple mark of a merge: Apple Pay button in Checkout, and Upgrade to Next.js 16 in the collapsed Infra. The line joins the two layers that stay, from place 1 again. GitHub moved Checkout address autocomplete onto main, so it waits for its checks again. Fix flaky cart test, now place 2, still waits for a member, with its red mark on the line.',
      rationale:
        'A merge is a cause of the one leave step of the queue, so a merged workspace goes back to its section, where Continue and Archive wait in its bar.',
      props: { mergeQueue: 'merged' },
    },
    {
      slug: 'empty',
      title: 'After the last merge',
      description:
        'The queue merged its last layers. No queue has entries, so the list shows no Merge queue group, and the four workspaces stand in their sections with the mark of a merge.',
      rationale:
        'Cal asked for a group that shows only while a queue has entries. An empty group would take room at the top of each list and say nothing.',
      props: { mergeQueue: 'empty' },
    },
  ],
})
