import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorMigration = defineScreen({
  title: 'Migration job',
  description:
    'The Providers tab on 24 November, while the migration job of the host connection runs. Its three boxes come before New orgs. Migration job gives its state, Running, what it does, when it started, and its orgs: every org. Under them, each provider account shows by its ID, with the state of the job there. A row for each state and kind of machine gives how many of the count the job handled. A line gives the starts that are left and their time at this pace: boat has 1,229, about 2 days. e2b had only the org image of Acme Labs, and it is done. Limit to one org and Pause job close the box. Pace of the job holds the starts in each hour and the machines at once of each account, at the default. Failures and skips lists the 4 steps that failed, newest first, then the skips of each reason and the org with no active admin. The child pages show the job before its first start, paused, after a refusal, limited to one org, with a new pace, and done.',
  rationale:
    'Cal chose option D of own computer decision 7 on 22 November 2026: a migration job at the deploy. It installs the host program on each running machine and on each machine that a workspace keeps, and the bootstrap covers the rest. The job paces its starts on each provider account by two operator settings: the starts in each hour, and the machines at once. Reason: the app knows no limit of either account. An operator can pause and continue the job, limit it to one org, and see its progress and its failures. The boxes show only counts, names, IDs, dates, states, and the pace, and nothing of the work in a machine. A failed step names its cloud computer ID, so the Orgs tab can find its org.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'running',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
