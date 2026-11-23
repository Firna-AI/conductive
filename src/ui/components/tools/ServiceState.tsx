import { CircleAlert } from 'lucide-react'
import { StatusText, type StatusTone } from '../common/StatusText'
import {
  servicePhaseDetail,
  serviceStateLabels,
  type ServicePhase,
  type ServiceShownState,
} from './serviceCopy'
import styles from './ServiceState.module.css'

/**
 * The tone and the glyph of a state, so it never depends on colour alone:
 * a spinner while a control runs, and an icon for a failed run.
 */
export function serviceStatusOf(kind: ServiceShownState): {
  tone: StatusTone
  busy: boolean
  failed: boolean
} {
  switch (kind) {
    case 'running':
      return { tone: 'success', busy: false, failed: false }
    case 'stopping':
    case 'restarting':
      return { tone: 'neutral', busy: true, failed: false }
    case 'stopped':
    case 'ended':
      return { tone: 'muted', busy: false, failed: false }
    case 'failed':
      return { tone: 'danger', busy: false, failed: true }
  }
}

/** The state of a service and the time after it, as a row and its log show. */
export function ServiceState(props: { phase: ServicePhase }) {
  const status = serviceStatusOf(props.phase.kind)
  const detail = servicePhaseDetail(props.phase)
  return (
    <>
      <StatusText
        busy={status.busy}
        icon={status.failed ? CircleAlert : undefined}
        label={serviceStateLabels[props.phase.kind]}
        tone={status.tone}
      />
      {detail === null ? null : <span className={styles.detail}>{detail}</span>}
    </>
  )
}
