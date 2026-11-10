import { Repeat } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/RunLinks.module.css'
import { routes } from '../../app/router'
import type { RunRoutine } from '../../chat/api/read-responses'
import { AppLink } from '../ui/AppLink'

/**
 * The line under the header of a run workspace, which links to its routine
 * and, for a pull request run, to that pull request on GitHub. The header
 * bar has no room left for them, also on desktop. A long routine name gives
 * up its room first and ends with an ellipsis, so the number of the pull
 * request always shows.
 */
export function RunLine(props: { orgId: string; routine: RunRoutine }) {
  const { routine } = props
  const { pullRequest } = routine
  return (
    <p className={styles.line}>
      <Repeat aria-hidden className={styles.icon} size={13} />
      <span className={styles.words}>Run of</span>{' '}
      <AppLink
        aria-label={`Routine: ${routine.name}`}
        className={styles.routine}
        title={routine.name}
        to={routes.routine(props.orgId, routine.id)}
      >
        {routine.name}
      </AppLink>
      {pullRequest ? (
        <>
          {' '}
          <span className={styles.words}>for</span>{' '}
          <a
            aria-label={`Pull request #${pullRequest.number} on GitHub`}
            className={styles.pullRequest}
            href={pullRequest.url}
            rel="noreferrer"
            target="_blank"
          >
            {`#${pullRequest.number}`}
          </a>
        </>
      ) : null}
    </p>
  )
}
