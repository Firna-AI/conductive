import type { ServiceControlRequest } from '../../shared/generated/ServiceControlRequest'
import type { ServiceControlResult } from '../../shared/generated/ServiceControlResult'
import {
  isUnanswered,
  type ToolResult,
} from '../../terminal/tool-parts/request'

/**
 * What a Stop or a Restart shows when it ends: nothing more than the list,
 * a failure with the message of the server, a reply that did not arrive, or
 * a control for a run that ended before it arrived.
 */
export type ServiceAnswer =
  | { kind: 'done' }
  | { kind: 'failed'; message: string }
  | { kind: 'unconfirmed' }
  | { kind: 'stale' }

function sameRequest(
  sent: ServiceControlRequest,
  answered: ServiceControlRequest,
): boolean {
  return (
    sent.requestId === answered.requestId &&
    sent.action === answered.action &&
    sent.target.bootId === answered.target.bootId &&
    sent.target.serviceId === answered.target.serviceId &&
    sent.target.generation === answered.target.generation
  )
}

/**
 * The answer of one control. A refusal of the API names what failed. A
 * reply that is lost, that the app cannot read, or that answers another
 * request is unconfirmed, because the control may have run. A Stop of a run
 * that no longer runs, and a control that the stop of the computer ended,
 * show only the list: the list and the panel of the computer give their
 * result.
 */
export function controlAnswer(
  sent: ServiceControlRequest,
  result: ToolResult<ServiceControlResult>,
): ServiceAnswer {
  if (!result.ok) {
    return isUnanswered(result.error)
      ? { kind: 'unconfirmed' }
      : { kind: 'failed', message: result.error.message }
  }
  if (!sameRequest(sent, result.value.request)) return { kind: 'unconfirmed' }
  const { outcome } = result.value
  switch (outcome.state) {
    case 'applied':
    case 'unchanged':
    case 'computer_stopped':
      return { kind: 'done' }
    case 'stale':
      return { kind: 'stale' }
    case 'unconfirmed':
      return { kind: 'unconfirmed' }
    case 'failed':
      return { kind: 'failed', message: outcome.error.message }
  }
}
