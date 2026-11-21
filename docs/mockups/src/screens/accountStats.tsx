import type { Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import {
  statsFailed,
  statsLoading,
  statsNumbers,
} from '../entries/components/settings/StatsSections.mockup'
import { accountStats, emptyAccountStats } from '../fixtures/accountStats'
import type { AccountState } from './accountState'

/**
 * The Stats tab of the account in a state of its numbers: shown, the
 * first load, a read that failed with Try again, or a new account whose
 * counts are all zero.
 */
export function StatsTab(props: {
  stats: AccountState['stats']
  viewport: Viewport
}) {
  const narrow = props.viewport === 'mobile'
  switch (props.stats) {
    case 'loading':
      return <statsLoading.Component moklyInstance="stats-loading" />
    case 'failed':
      return (
        <statsFailed.Component
          action={
            <actionButton.Component icon="rotate-cw" moklyInstance="try-again">
              Try again
            </actionButton.Component>
          }
          moklyInstance="stats-failed"
        />
      )
    case 'empty':
      return (
        <statsNumbers.Component
          moklyInstance="stats"
          narrow={narrow}
          stats={emptyAccountStats}
        />
      )
    case 'ready':
      return (
        <statsNumbers.Component
          moklyInstance="stats"
          narrow={narrow}
          stats={accountStats}
        />
      )
  }
}
