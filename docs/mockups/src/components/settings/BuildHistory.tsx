import { ChevronRight, CircleAlert } from 'lucide-react'
import type { Build } from '../../fixtures/computer'
import { classes } from '../common/classes'
import { StatusText } from '../common/StatusText'
import { jobLabels } from './buildCopy'
import styles from './BuildSection.module.css'

/** The result of a job that ended: its length, and whether it failed. */
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
 * The jobs of the computer that ended, newest first: each build and each
 * refresh, with its time, its kind, and its result. The kind of a refresh
 * says what started it: a push, or the daily refresh. A narrow history puts
 * the kind under the time in each row. The history shows once a job has
 * ended.
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
      <ul
        aria-label="Builds and refreshes"
        className={classes(styles.builds, styles.jobs)}
      >
        {props.builds.map((build, index) => (
          <li className={styles.build} key={index}>
            <span className={styles.job}>
              <span className={styles.jobWhen}>{build.when}</span>
              <span className={styles.kind}>{jobLabels[build.kind]}</span>
            </span>
            <BuildResult build={build} />
          </li>
        ))}
      </ul>
    </details>
  )
}
