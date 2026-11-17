import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const blocked = defineScreen({
  title: 'Blocked or closed',
  description:
    'The pull request has a merge conflict with main, so GitHub blocks the merge. The bar names the conflict, and Resolve conflicts asks the agent to merge main into the branch and resolve each conflict. Its number leads to the pull request on GitHub. The Checks tab keeps the checks of the last push.',
  rationale:
    'The user chose decision 18: the bar shows each state that blocks a merge, so a member without write access on GitHub still sees it. Decision 220 gives the agent a fixed prompt for a conflict and for requested changes. Decision 64 adds Blocked for each other reason that GitHub blocks a merge, and it shows only when no other state applies. On 17 November 2026 the user chose Ready for review as the action of a draft, which the app runs as the member, as it merges. A closed pull request and Blocked get no action of their own, only Open on GitHub. A conflict, requested changes, and Blocked wait for someone to act, so they tint the bar amber, with an icon and words. A draft and a closed pull request stay neutral.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'conflict' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'changes-requested',
      title: 'Changes requested',
      description:
        'A reviewer requested changes on GitHub. The bar names the reviewer, and Address review asks the agent to read the open review comments and make the changes, with no reply on GitHub. The summary of the Checks tab adds the review.',
      props: { banner: 'changes-requested' },
    },
    {
      slug: 'draft',
      title: 'Draft',
      description:
        "The pull request is a draft, which GitHub does not merge until it is ready for review. The bar says Draft in neutral words. Ready for review marks the pull request ready on GitHub at once, with Cal's own GitHub token, so no agent turn runs. A member without write access on GitHub sees no button.",
      props: { banner: 'draft' },
    },
    {
      slug: 'marking-ready',
      title: 'Marking ready',
      description:
        'Cal pressed Ready for review. The button shows a spinner and Marking ready until GitHub answers. The bar then shows the new state of the pull request, such as Checks running or Ready to merge. When GitHub refuses, a message under the bar says why, in the words of the app.',
      props: { banner: 'draft', appAction: 'marking-ready' },
    },
    {
      slug: 'closed',
      title: 'Closed without a merge',
      description:
        'The pull request was closed without a merge a day ago. The bar says so, and offers neither Continue nor Archive, because they follow a merge, as decisions 16 and 223 say.',
      props: { banner: 'closed' },
    },
    {
      slug: 'blocked',
      title: 'Blocked',
      description:
        'Every check passed, but GitHub blocks the merge for another reason, here a missing approval. The bar says Blocked, names no reason, and offers no Merge. Its number leads to the pull request on GitHub, where GitHub names it.',
      props: { banner: 'blocked' },
    },
  ],
})
