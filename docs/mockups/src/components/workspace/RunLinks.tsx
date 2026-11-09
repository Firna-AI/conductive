import { Repeat } from 'lucide-react'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import styles from './RunLinks.module.css'

/** The routine of a run workspace, and the pull request of its run. */
export type RunSource = {
  routine: string
  /** The page of the routine in the mockups. */
  routineTo: string
  pullRequest?: { number: number; url: string }
}

/**
 * The line under the header of a run workspace, which links to its routine
 * and to the pull request that started the run (decision 205 A, with the
 * links of D). The header bar has no room left for them, also on desktop.
 * A long routine name gives up its room first, and the number of the pull
 * request always shows.
 */
export function RunLinks(props: { run: RunSource }) {
  const { run } = props
  const pullRequestHref = useOutsideHref(run.pullRequest?.url ?? '')
  return (
    <p className={styles.line}>
      <Repeat aria-hidden className={styles.icon} size={13} />
      <span className={styles.words}>Run of</span>
      <ScreenLink
        aria-label={`Routine: ${run.routine}`}
        className={styles.routine}
        to={run.routineTo}
      >
        {run.routine}
      </ScreenLink>
      {run.pullRequest ? (
        <>
          <span className={styles.words}>for</span>
          <a
            aria-label={`Pull request #${run.pullRequest.number} on GitHub`}
            className={styles.pullRequest}
            href={pullRequestHref}
            rel="noreferrer"
            target="_blank"
          >
            {`#${run.pullRequest.number}`}
          </a>
        </>
      ) : null}
    </p>
  )
}
