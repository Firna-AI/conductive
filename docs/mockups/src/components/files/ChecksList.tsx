import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleCheck, CircleX, ListChecks } from 'lucide-react'
import {
  checksByState,
  pullRequest,
  reviewByState,
  type BannerState,
  type Check,
} from '../../fixtures/pullRequests'
import a11y from '../common/a11y.module.css'
import { EmptyState } from '../common/EmptyState'
import styles from './ChecksList.module.css'

const stateLabels = {
  passed: 'Passed',
  failed: 'Failed',
  running: 'Running',
} as const

function CheckIcon(props: { check: Check }) {
  const theme = useSharedUiTheme()
  switch (props.check.state) {
    case 'passed':
      return <CircleCheck aria-hidden className={styles.passed} size={14} />
    case 'failed':
      return <CircleX aria-hidden className={styles.failed} size={14} />
    case 'running':
      return <Spinner color={theme.colors.muted} size={12} />
  }
}

/** The GitHub checks of the pull request, as the banner reads them. */
export function ChecksList(props: { state: BannerState }) {
  const checks = checksByState[props.state]
  if (checks.length === 0) {
    return (
      <EmptyState
        body="They appear when the branch has a pull request."
        icon={ListChecks}
        title="GitHub checks show here"
      />
    )
  }
  const failed = checks.filter((check) => check.state === 'failed').length
  const review = reviewByState[props.state]
  const summary = [
    failed > 0
      ? `${failed} of ${checks.length} failed`
      : `${checks.length} checks`,
    review,
  ].filter((part): part is string => part !== undefined)
  return (
    <div className={styles.scroll} data-mokly-scroll="checks">
      <div className={styles.head}>
        <span className={styles.title}>{pullRequest.title}</span>
        <span className={styles.summary}>{summary.join(' · ')}</span>
      </div>
      <ul aria-label="Checks" className={styles.list}>
        {checks.map((check) => (
          <li className={styles.row} key={check.name}>
            <CheckIcon check={check} />
            <span className={styles.name}>{check.name}</span>
            <span className={a11y.hidden}>{stateLabels[check.state]}</span>
            <span className={styles.state}>
              {check.duration ?? stateLabels[check.state]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
