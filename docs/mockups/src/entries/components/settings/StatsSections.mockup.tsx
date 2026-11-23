import { defineComponent } from '@mokly/mokly'
import {
  StatsFailed,
  StatsLoading,
  StatsNumbers,
} from '../../../../../../src/ui/components/settings/StatsSections'
import { accountStats, emptyAccountStats } from '../../../fixtures/accountStats'
import { actionButton } from '../common/actions.mockup'

/** A count of each UTC day, as `DailyCount`. */
const daysSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['date', 'count'],
    properties: {
      /** The day as `YYYY-MM-DD`. */
      date: { type: 'string' },
      count: { type: 'integer', minimum: 0 },
    },
  },
} as const

/** A count that is not negative. */
const countSchema = { type: 'integer', minimum: 0 } as const

/** The numbers of the Stats tab as JSON, as `AccountStatsNumbers`. */
const statsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'orgs',
    'workspaces',
    'workspaceStates',
    'automations',
    'newWorkspacesByDay',
    'automationRunsByDay',
  ],
  properties: {
    orgs: countSchema,
    /** The workspaces that the person owns, and the new ones of 7 days. */
    workspaces: {
      type: 'object',
      additionalProperties: false,
      required: ['total', 'lastWeek'],
      properties: { total: countSchema, lastWeek: countSchema },
    },
    /** The workspaces of the person in each state, as `StateCounts`. */
    workspaceStates: {
      type: 'object',
      additionalProperties: false,
      required: ['running', 'stopped', 'failed', 'archived', 'removed'],
      properties: {
        running: countSchema,
        stopped: countSchema,
        failed: countSchema,
        /** The archived workspaces in the list. */
        archived: countSchema,
        /** The archived workspaces that left the list. */
        removed: countSchema,
      },
    },
    automations: countSchema,
    newWorkspacesByDay: daysSchema,
    automationRunsByDay: daysSchema,
  },
} as const

/** The numbers of the Stats tab, registered with Mokly. */
export const statsNumbers = defineComponent({
  slug: 'stats-numbers',
  title: 'Stats numbers',
  description:
    'The Stats tab of the account with its numbers, for the person signed in: the tiles of the workspaces with the new ones of 7 days, the workspaces that run now, the automations, and the orgs, then the workspaces by state, and the charts of the new workspaces and of the automation runs of each day of the last 30 days. The app shares it. Its own page shows the numbers of Cal.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['stats', 'narrow'],
    properties: {
      stats: statsSchema,
      /** The page is as narrow as a phone. */
      narrow: { type: 'boolean' },
    },
  } as const,
  props: { stats: accountStats, narrow: false },
  render: (props) => <StatsNumbers narrow={props.narrow} stats={props.stats} />,
  variants: [
    {
      slug: 'empty',
      title: 'New account',
      description:
        'A new account with one org, whose other counts are all zero.',
      props: { stats: emptyAccountStats },
    },
    {
      slug: 'narrow',
      title: 'Narrow',
      description: 'The numbers on a page as narrow as a phone.',
      props: { narrow: true },
    },
  ],
})

/** The first load of the Stats tab, registered with Mokly. */
export const statsLoading = defineComponent({
  slug: 'stats-loading',
  title: 'Stats loading',
  description:
    'The first load of the Stats tab: the boxes and their titles in place, with placeholders where the numbers come, so that nothing moves when they arrive. The app shares it.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <StatsLoading />,
})

/**
 * The numbers of the Stats tab that could not load, registered with Mokly.
 * A screen supplies Try again in the `action` slot.
 */
export const statsFailed = defineComponent({
  slug: 'stats-failed',
  title: 'Stats failed',
  description:
    'The numbers of the Stats tab could not load: a rose notice with Try again, which reads them again. It shows no number, because a count that did not load is not zero. The app shares it. Its own page shows the notice without its action.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['action'],
  render: (props) => <StatsFailed action={props.action} />,
  variants: [
    {
      slug: 'try-again',
      title: 'With Try again',
      description: 'The notice with Try again.',
      props: {},
      slots: {
        action: (
          <actionButton.Component icon="rotate-cw">
            Try again
          </actionButton.Component>
        ),
      },
    },
  ],
})
