import type { Viewport } from '@mokly/mokly'
import { RotateCw } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import {
  StatsFailed,
  StatsLoading,
  StatsNumbers,
} from '../components/settings/StatsSections'
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
      return <StatsLoading />
    case 'failed':
      return (
        <StatsFailed
          action={<ActionButton icon={RotateCw}>Try again</ActionButton>}
        />
      )
    case 'empty':
      return <StatsNumbers narrow={narrow} stats={emptyAccountStats} />
    case 'ready':
      return <StatsNumbers narrow={narrow} stats={accountStats} />
  }
}
