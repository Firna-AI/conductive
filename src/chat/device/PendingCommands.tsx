import type { DeviceCommandRecord } from '../../shared/generated/DeviceCommandRecord'
import { useRef } from 'react'
import { Laptop } from 'lucide-react'
import type { DeviceApprovalAction } from '../../shared/device'
import styles from '../../ui/components/chat/PendingCommand.module.css'
import { macLabel } from '../../shared/transcript/command-words'
import type { WaitingItem } from '../secrets/session-secrets'
import { CommandChoices } from './CommandChoices'
import {
  CommandLine,
  CommandStatus,
  RequestDetails,
  type RequestReaders,
} from './CommandParts'
import { answerOf, canAnswer, type DeviceSnapshot } from './device-snapshot'

/**
 * A command that waits for its answer, as a compact message (decision 62):
 * the exact command, the Mac, the time limit, and Details. The Mac app on
 * the Mac that got the request shows Deny and Allow. Every other window
 * shows the state only, because only that Mac app can allow the command. A
 * read-only workspace takes no answer, so it shows the state only too.
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
  const choices = !props.readOnly && canAnswer(devices, request)
  const mac = macLabel(request, choices)
  return (
    <section
      aria-label={choices ? 'Run a command on this Mac?' : `Command on ${mac}`}
      className={styles.pending}
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
 * The Mac commands of the session that wait for an answer, as parts of the
 * region of the requests that wait, which orders them by their time.
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
    key: `command:${request.requestId}`,
    createdAt: request.createdAt,
    node: (
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
