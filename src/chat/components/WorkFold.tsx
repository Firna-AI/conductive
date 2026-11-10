import { useState, type ReactNode } from 'react'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { LostEventLine } from './LostEventLine'
import { MessageLine } from './MessageLine'
import { CallLine, FoldLine } from './ToolGroup'
import {
  workSummary,
  type WorkStep,
} from '../../shared/transcript/transcript-entries'
import { useFold } from './useFold'

/** One step of an open work fold, in the list of an open run of tool calls. */
function Step(props: { step: WorkStep<ReactNode> }) {
  const { step } = props
  if (step.kind === 'insert') {
    return <li className={styles.card}>{step.insert.content}</li>
  }
  const { item } = step
  switch (item.kind) {
    case 'tool':
      return (
        <li className={styles.call}>
          <CallLine call={item.tool} />
        </li>
      )
    case 'agent':
      return (
        <li>
          <MessageLine text={item.text} />
        </li>
      )
    case 'lost':
      return (
        <li>
          <LostEventLine align="start" marker={item.marker} />
        </li>
      )
  }
}

/**
 * The work of an ended turn before an answer, folded into one line, such as
 * "8 tool calls, 7 messages". The line has the icons of the tool kinds and
 * the left-out output, as the line of a run of tool calls has. A Mac
 * command card and a lost line fold with the work at their place, and add
 * no count and no mark, as "The work of a turn" in
 * `docs/protocol/chat-and-events.md` says. The fold starts closed. Once
 * the user opens it, it lists the steps in order: a tool call as its call
 * line, a message as its first words, a card as the card, and a lost line
 * at the left edge. It keeps that choice, and its line keeps its place.
 */
export function WorkFold(props: { steps: readonly WorkStep<ReactNode>[] }) {
  const { steps } = props
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const { calls, messages } = workSummary(steps)
  return (
    <details className={styles.group} {...fold.details}>
      <FoldLine calls={calls} line={fold.line} messages={messages} />
      <ul className={styles.calls}>
        {steps.map((step) => (
          <Step
            key={step.kind === 'item' ? step.item.id : step.insert.key}
            step={step}
          />
        ))}
      </ul>
    </details>
  )
}
