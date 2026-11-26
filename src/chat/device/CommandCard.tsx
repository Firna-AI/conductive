import type { DeviceCommandRecord } from '../../shared/generated/DeviceCommandRecord'
import { Laptop } from 'lucide-react'

import card from '../../ui/components/chat/MacCommand.module.css'
import {
  commandCopy,
  commandRan,
  limitLabel,
  macName,
  outputOf,
  stateNote,
} from '../../shared/transcript/command-words'
import { CommandOutput } from './CommandOutput'
import { CommandLine, CommandStatus } from './CommandParts'
import { LiteralText } from './LiteralText'

/**
 * A command that the agent asked to run on the Mac of the sender (decision
 * 62), at its place in the chat once it has its answer: the name of the
 * Mac, the state, the command, its folder and time limit, and the output
 * once it ran, cut short with Show all when it is long. A line says what
 * happened when the state needs it.
 */
export function CommandCard(props: {
  request: DeviceCommandRecord
  viewerId: string | null
}) {
  const { request } = props
  const mac = macName(request)
  const output = outputOf(request)
  const note = stateNote(request, props.viewerId)
  return (
    <section aria-label={`Command on ${mac}`} className={card.card}>
      <div className={card.head}>
        <Laptop aria-hidden className={card.icon} size={14} />
        <span className={card.mac}>{mac}</span>
        <span className={card.spacer} />
        <CommandStatus request={request} />
      </div>
      <CommandLine command={request.command} />
      <span className={card.meta}>
        {commandCopy.in}{' '}
        <LiteralText className={card.path} text={request.folder} /> ·{' '}
        {commandCopy.upTo} {limitLabel(request.timeoutSeconds)}
      </span>
      {commandRan(request) && output !== null ? (
        <CommandOutput text={output} />
      ) : null}
      {commandRan(request) && output === null ? (
        <span className={card.note}>{commandCopy.empty}</span>
      ) : null}
      {request.result?.truncated ? (
        <span className={card.note}>{commandCopy.truncated}</span>
      ) : null}
      {note ? <span className={card.note}>{note}</span> : null}
    </section>
  )
}
