import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import {
  StatsFailed,
  StatsLoading,
  StatsNumbers,
} from '../../ui/components/settings/StatsSections'
import { readAccountStats } from '../../app/api/read-account-stats'
import { PageRead } from '../../app/page-read'
import { useStore } from '../../app/store'
import { ACCOUNT_PATHS } from '../../shared/account'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useViewport } from '../ui/viewport'

/**
 * The Stats tab of the account: the counts of the person signed in, which
 * the tab reads each time that it opens. A failed read shows no number,
 * because a count that did not load is not zero, and Try again reads the
 * counts again.
 */
export function StatsTab() {
  const app = useApp()
  const narrow = useViewport() === 'phone'
  const [stats] = useState(
    () => new PageRead(app, ACCOUNT_PATHS.stats, readAccountStats),
  )
  useEffect(() => stats.watch(), [stats])
  const numbers = useStore(stats.value)
  const reading = useStore(stats.reading)
  switch (numbers.state) {
    case 'loading':
      return <StatsLoading />
    case 'failed':
      return (
        <StatsFailed
          action={
            <ActionButton
              busy={reading}
              icon={RotateCw}
              onPress={() => void stats.refresh()}
            >
              Try again
            </ActionButton>
          }
        />
      )
    case 'ready':
      return <StatsNumbers narrow={narrow} stats={numbers.value} />
  }
}
