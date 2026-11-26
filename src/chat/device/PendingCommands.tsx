import type { DeviceCommandRecord } from '../../shared/generated/DeviceCommandRecord'
import { useRef } from 'react'
import { Laptop } from 'lucide-react'
import type { DeviceApprovalAction } from '../../shared/device'
import styles from '../../ui/components/chat/PendingCommand.module.css'
import { classes } from '../../ui/components/common/classes'
import { macLabel } from '../../shared/transcript/command-words'
import type { WaitingItem } from '../components/request-stack'
import { CommandChoices } from './CommandChoices'
import {
  CommandLine,
  CommandStatus,
  RequestDetails,
  type RequestReaders,
} from './CommandParts'
import { answerOf, canAnswer, type DeviceSnapshot } from './device-snapshot'

/**
 * Whether this window answers a command that waits: only the Mac app on
 * the Mac that got the request, and only in a workspace that takes answers.
 */
function showsChoices(
  devices: DeviceSnapshot,
  request: DeviceCommandRecord,
  readOnly: boolean,
): boolean {
  return !readOnly && canAnswer(devices, request)
}

/**
 * A command that waits for its answer, as a compact message (decision 62):
 * the exact command, the Mac, the time limit, and Details. The Mac app on
 * the Mac that got the request shows Deny and Allow. Every other window
 * shows the state only, because only that Mac app can allow the command. A
 * read-only workspace takes no answer, so it shows the state only too. The
 * command waits in the stack above the composer, which draws its outline.
 */
function PendingCommand(props: {
  request: DeviceCommandRecord
  devices: DeviceSnapshot
  readers: RequestReaders
  readOnly: boolean
  onAnswer: (requestId: string, action: DeviceApprovalAction) => void
}) {
  const { request, devices } = props
  const actions = useRef<HTMLSpanElement>(null)
  const choices = showsChoices(devices, request, props.readOnly)
  const mac = macLabel(request, choices)
  return (
    <section
      aria-label={choices ? 'Run a command on this Mac?' : `Command on ${mac}`}
      className={classes(styles.pending, styles.stacked)}
    >
      <div className={styles.head}>
        <Laptop aria-hidden className={styles.icon} size={14} />
        <span className={styles.command}>
          <CommandLine command={request.command} />
        </span>
        <span className={styles.end} ref={actions}>
          {choices ? (
            <CommandChoices
              actions={actions}
              answering={answerOf(devices, request.requestId)}
              onAnswer={(action) => props.onAnswer(request.requestId, action)}
            />
          ) : (
            <CommandStatus request={request} />
          )}
        </span>
      </div>
      <RequestDetails mac={mac} readers={props.readers} request={request} />
    </section>
  )
}

/**
 * The Mac commands of the session that wait for an answer, as cards of the
 * stack of the requests above the composer. Each call waits, and a command
 * never hides another request. A window that cannot answer a command puts
 * it after the requests that it can answer.
 */
export function pendingCommandItems(props: {
  requests: readonly DeviceCommandRecord[]
  devices: DeviceSnapshot
  readers: RequestReaders
  /** The workspace takes no answer: it is archived, or its org is suspended. */
  readOnly: boolean
  onAnswer: (requestId: string, action: DeviceApprovalAction) => void
}): WaitingItem[] {
  return props.requests.map((request) => ({
    id: request.requestId,
    key: `command:${request.requestId}`,
    createdAt: request.createdAt,
    order: 0,
    callWaits: true,
    secrets: null,
    answerable: showsChoices(props.devices, request, props.readOnly),
    card: () => (
      <PendingCommand
        devices={props.devices}
        onAnswer={props.onAnswer}
        readOnly={props.readOnly}
        readers={props.readers}
        request={request}
      />
    ),
  }))
}
