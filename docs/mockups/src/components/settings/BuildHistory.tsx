import { ChevronRight, CircleAlert } from 'lucide-react'
import type { Build } from '../../fixtures/computer'
import { StatusText } from '../common/StatusText'
import styles from './BuildSection.module.css'

/** The result of a build that ended: its length, and whether it failed. */
export function BuildResult(props: { build: Build }) {
  const { build } = props
  if (build.result === 'failed') {
    return (
      <StatusText
        icon={CircleAlert}
        label={`Failed after ${build.duration}`}
        tone="danger"
      />
    )
  }
  return <StatusText label={`Succeeded in ${build.duration}`} tone="success" />
}

/**
 * The builds of the computer that ended, newest first, each with its time
 * and result. It shows once a build has ended.
 */
export function BuildHistory(props: {
  builds: readonly Build[]
  open: boolean
}) {
  if (props.builds.length === 0) return null
  return (
    <details className={styles.history} open={props.open}>
      <summary className={styles.summary}>
        <ChevronRight aria-hidden className={styles.chevron} size={14} />
        History ({props.builds.length})
      </summary>
      <ul aria-label="Builds" className={styles.builds}>
        {props.builds.map((build, index) => (
          <li className={styles.build} key={index}>
            <span className={styles.when}>{build.when}</span>
            <BuildResult build={build} />
          </li>
        ))}
      </ul>
    </details>
  )
}
