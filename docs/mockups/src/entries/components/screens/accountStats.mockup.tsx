import { defineComponent } from '@mokly/mokly'
import { StatsTab } from '../../../screens/accountStats'
import type { AccountState } from '../../../screens/accountState'
import { viewports } from '../common/viewports'

/** The states of the numbers of the Stats tab, as `AccountState` lists them. */
const statsStates = [
  'ready',
  'loading',
  'failed',
  'empty',
] as const satisfies readonly AccountState['stats'][]

/**
 * The Stats tab of the account, registered with Mokly. A screen that draws
 * a screen of another viewport passes `viewport`. Without it, a page of the
 * tab draws the layout of its own view.
 */
export const statsTab = defineComponent({
  slug: 'stats-tab',
  title: 'Stats tab',
  description:
    'The Stats tab of the account in a state of its numbers: shown, the first load with placeholders, a read that failed with Try again, or a new account whose counts are all zero. A phone draws narrow charts. Its own page shows the numbers of Cal.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['stats'],
    properties: {
      stats: { enum: statsStates },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { stats: 'ready' },
  render: (props, context) => (
    <StatsTab
      stats={props.stats}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description: 'The first load: placeholders where the numbers come.',
      props: { stats: 'loading' },
    },
    {
      slug: 'failed',
      title: 'Failed',
      description: 'A read that failed: the notice with Try again.',
      props: { stats: 'failed' },
    },
    {
      slug: 'empty',
      title: 'New account',
      description: 'A new account whose counts are all zero.',
      props: { stats: 'empty' },
    },
  ],
})
