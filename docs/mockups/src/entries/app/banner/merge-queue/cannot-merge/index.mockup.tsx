import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueCannotMerge = defineScreen({
  title: 'An entry that cannot merge',
  description:
    'Two checks of #482 failed. Checkout address autocomplete keeps its place, 2 of 3, in the queue of acme/storefront. The queue sends no fix turn: the bar shows Fix checks, as outside the queue, and the line under the bar says "Place 2 of 3 in the merge queue. The queue waits for its checks." Remove from queue ends the line, for a member who prefers to take the pull request out of the queue. The entry is still queued, so the bar offers no Add to merge queue. In the sidebar, its row stays on the line between Upgrade to Next.js 16 and Apple Pay button, with its red mark. Upgrade to Next.js 16, place 1, can still merge, and Apple Pay button, place 3, waits for #482. On a phone the compact row says Queue 2 of 3, and the line stands at the top of the Checks tab.',
  rationale:
    'Cal chose on 22 November 2026 that a failure is handled as outside the queue: "if something fails it should just be handled normally, I.e by the user. And the user can remove from the queue rather than fix they prefer". So the entry keeps its place and the main action of its bar, and the line says what the queue waits for. This replaces the amber line of the first design, which took the entry out of the stack after one fix turn of the queue.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    banner: 'checks-failed',
    queue: 'cannot-merge',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'review',
      title: 'Changes requested',
      description:
        '@priyaraman requested changes on #482, so its mark in the sidebar is amber, still on the line in place 2. The bar shows Address review, as outside the queue, and the line says "Place 2 of 3 in the merge queue. The queue waits for its review."',
      props: { banner: 'changes-requested' },
    },
    {
      slug: 'above',
      title: 'Above an entry that cannot merge',
      description:
        'The checks of Apple Pay button (#479), place 2, failed. Checkout address autocomplete is place 3 of 3 and ready to merge, but a merge of #482 would land #479 with it. So the bar offers no Merge, and the line says "Place 3 of 3 in the merge queue. The queue waits for #479." In the sidebar, the red mark of Apple Pay button stays on the line, before the green mark of #482.',
      rationale:
        'The layers above an entry that cannot merge wait for it. A member who wants them to merge first removes that entry, or drags it to a later place.',
      props: { banner: 'ready-to-merge', queue: 'above' },
    },
    {
      slug: 'token',
      title: 'The GitHub access of the queuer failed',
      description:
        'Jonas Weber added #482 to the queue, and his stored GitHub access stopped working, so the queue cannot merge as him. Each layer is ready, and the line says "Place 3 of 3 in the merge queue. The GitHub access of the member who added it stopped working." The bar still offers Merge with 2 ahead, which merges with the GitHub access of the member who clicks.',
      rationale:
        'The queue merges with the stored token of the queuer of the highest layer (decision 314 A). A click on Merge goes through the queue with the token of the member who clicks (decision 316 D), so another member can still land the layers.',
      props: { banner: 'ready-to-merge', queue: 'token-failed' },
    },
    {
      slug: 'merge-refused',
      title: 'GitHub refused the merge',
      description:
        'GitHub refused the merge that the queue asked for. #482 keeps place 3 of 3, and the line says "Place 3 of 3 in the merge queue. GitHub refused the merge." Open on GitHub leads to the pull request, where GitHub names the reason, before Remove from queue. The bar keeps Merge with 2 ahead, as Merge outside the queue stays beside a refusal of GitHub.',
      props: { banner: 'ready-to-merge', queue: 'merge-refused' },
    },
  ],
})
