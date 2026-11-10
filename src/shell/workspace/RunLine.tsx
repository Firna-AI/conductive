import { Repeat } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/RunLinks.module.css'
import { routes } from '../../app/router'
import type { RunRoutine } from '../../chat/api/read-responses'
import { AppLink } from '../ui/AppLink'

/**
 * The line under the header of a run workspace, which links to its routine.
 * The header bar has no room left for it, also on desktop. A long routine
 * name ends with an ellipsis.
 */
export function RunLine(props: { orgId: string; routine: RunRoutine }) {
  const { routine } = props
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
    </p>
  )
}
