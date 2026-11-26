import { CircleAlert } from 'lucide-react'
import type { ServiceControlAction } from '../../../../shared/generated/ServiceControlAction'
import type { ServiceStatus } from '../../../../shared/generated/ServiceStatus'
import { StatusText } from '../../../../ui/components/common/StatusText'
import {
  serviceEndedText,
  serviceStartedText,
  serviceStateLabels,
  type ServiceShownState,
} from '../../../../ui/components/tools/serviceCopy'
import { serviceStatusOf } from '../../../../ui/components/tools/ServiceState'
import stateStyles from '../../../../ui/components/tools/ServiceState.module.css'
import { formatAgo } from '../../../../chat/state/format'

/** The state that a row shows: a control that runs, or the state of the run. */
function shownState(
  status: ServiceStatus,
  pending: ServiceControlAction | null,
): ServiceShownState {
  if (pending === 'stop') return 'stopping'
  if (pending === 'restart') return 'restarting'
  return status.state
}

/**
 * The words after the state: the start of a run that runs, the time of a
 * Stop, or the result and the time of an end, such as `Exit code 1 · 2m ago`.
 */
function detailOf(status: ServiceStatus, now: number): string {
  if (status.state === 'running')
    return serviceStartedText(formatAgo(status.startedAt, now))
  const ago = formatAgo(status.endedAt ?? status.startedAt, now)
  return status.state === 'stopped' ? ago : serviceEndedText(status.result, ago)
}

/**
 * The state of the latest run of a service and the time after it, as a row
 * and the log show them. A Stop or a Restart that runs shows its spinner and
 * no time. The state never depends on colour alone.
 */
export function ServiceStatusLine(props: {
  status: ServiceStatus
  pending: ServiceControlAction | null
  now: number
}) {
  const shown = shownState(props.status, props.pending)
  const look = serviceStatusOf(shown)
  return (
    <>
      <StatusText
        busy={look.busy}
        icon={look.failed ? CircleAlert : undefined}
        label={serviceStateLabels[shown]}
        tone={look.tone}
      />
      {props.pending === null ? (
        <span className={stateStyles.detail}>
          {detailOf(props.status, props.now)}
        </span>
      ) : null}
    </>
  )
}
