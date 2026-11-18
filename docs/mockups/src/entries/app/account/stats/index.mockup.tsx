import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import {
  accountSchema,
  accountStatsTab,
} from '../../../../screens/accountState'

export const stats = defineScreen({
  title: 'Stats',
  description:
    'The Stats tab of the account, after Keyboard shortcuts, holds the counts of the person signed in. Four tiles lead it: the workspaces that the person owns with the new ones of the last 7 days, the workspaces that run now, the automations that the person owns, and the orgs of the person. Under them come the workspaces by state, with Removed after Archived for the workspaces that left the list, then the new workspaces and the automation runs of each UTC day of the last 30 days, each with its total and a data table. The tab reads the numbers each time that it opens.',
  rationale:
    "The user chose option A of account stats decision 1 on 16 November 2026: a Stats tab in the account, for the person's own activity. The user chose option A of account stats decision 2 on the same day: only the counts that the app already records. So the tab counts no agent sessions or turns. The tiles, the state list, and the charts are those of the operator Overview, so the two pages read the same way. The user chose option B with E of decision 521 on 16 November 2026: the state list shows the workspaces that left the list, 14 days after their Archive, in their own Removed row after Archived, as the Overview does. The Workspaces tile still counts them, so it does not drop 14 days after each Archive. The rows of the tab are its own, so a change of the Overview for the operator does not change them. The tab comes before This Mac, so the tabs of a browser keep their places. The counts leave out deleted orgs, because the person can no longer open them. A workspace counts for its owner now, and the automation runs leave out skipped runs, which started no agent.",
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountStatsTab,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The tab while it reads the numbers. The boxes and their titles are in place, with placeholders where the numbers come, so nothing moves when they arrive.',
      props: { stats: 'loading' },
    },
    {
      slug: 'failed',
      title: 'Numbers not loaded',
      description:
        'The numbers could not load. The notice says so, and Try again reads them again. The tab shows no old numbers.',
      rationale:
        'A count that the tab could not read is not zero, so the tab shows no number until a read works.',
      props: { stats: 'failed' },
    },
    {
      slug: 'empty',
      title: 'New account',
      description:
        'A new account with one org and no workspace or automation yet. Orgs shows 1. Each other count is zero, and the charts lie flat at zero.',
      rationale:
        'Zero is a real count here, so the tab shows it in the same layout as the other states.',
      props: { stats: 'empty' },
    },
  ],
})
