import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueAdd = defineScreen({
  title: 'Add to merge queue',
  description:
    'Checkout address autocomplete is ready to merge, and the queue of acme/storefront holds two layers in the sidebar. The bar offers Squash and merge, then Add to merge queue in the outline tone, in the form of Archive after a merge. The right column is narrower than 540 px, so Add to merge queue shows only its icon, with its name as a tooltip, and the state keeps its words. Add puts the workspace at the top of the stack, at place 3. On a phone both buttons stand at the top of the Checks tab, with their words.',
  rationale:
    'Cal chose option D of decision 317 on 22 November 2026, and a control in the bar too. Decision 317 records the design call: an outline button beside the main action, or alone, for each state of an open pull request that is not queued. It shows to a member with write access, for a pull request whose unit targets the default branch. Add on a draft first marks it ready for review as the member who adds. Each other page of the bar leaves the button out, so that their pictures stay as they are until the build.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'ready-to-merge', queue: 'open' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'fix-checks',
      title: 'Beside Fix checks',
      description:
        'Two checks failed, so Fix checks is the main action, and Add to merge queue follows it. A pull request with failed checks can join. It takes the last place, and the queue waits for its checks, as app/banner/merge-queue/cannot-merge shows.',
      props: { banner: 'checks-failed' },
    },
    {
      slug: 'alone',
      title: 'Alone',
      description:
        'The checks run, so the bar has no main action, and Add to merge queue stands alone. Blocked has no main action either, and shows the button alone in the same way.',
      props: { banner: 'checks-running' },
    },
    {
      slug: 'header-menu',
      title: 'In the header menu',
      description:
        'A press on the name in the header opens the workspace menu, with Add to merge queue after the line, before Archive, as in the menu of the row. On a phone the menu opens as a sheet.',
      props: {
        banner: 'ready-to-merge',
        overlay: 'workspace-menu',
        focus: 'chat',
      },
    },
  ],
})
