import { Laptop } from 'lucide-react'
import type { DeviceCommandRecord } from '../../shared/device'
import card from '../../../docs/mockups/src/components/chat/MacCommand.module.css'
import { limitLabel, macName, outputOf, stateNote } from './command-text'
import { CommandLine, CommandStatus } from './CommandParts'
import { LiteralText } from './LiteralText'

/** A command that ran gives its output back to the agent. */
const ran = (request: DeviceCommandRecord) =>
  request.state === 'completed' || request.state === 'timed-out'

/**
 * A command that the agent asked to run on the Mac of the sender (decision
 * 62), at its place in the chat once it has its answer: the name of the
 * Mac, the state, the command, its folder and time limit, and the output
 * once it ran. A line says what happened when the state needs it.
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
        in <LiteralText className={card.path} text={request.folder} /> · up to{' '}
        {limitLabel(request.timeoutSeconds)}
      </span>
      {ran(request) && output !== null ? (
        <pre className={card.output}>{output}</pre>
      ) : null}
      {ran(request) && output === null ? (
        <span className={card.note}>The command printed nothing.</span>
      ) : null}
      {request.result?.truncated ? (
        <span className={card.note}>
          The output stops at its size limit. The agent got the same part.
        </span>
      ) : null}
      {note ? <span className={card.note}>{note}</span> : null}
    </section>
  )
}
