import type { PersonKey } from '../../fixtures/members'
import type { WorkItem } from './groupItems'
import { LostLine } from './LostLine'
import { MacCommand } from './MacCommand'
import { MessageLine } from './MessageLine'
import { SecretRun } from './SecretRun'
import { CallLine, FoldLine } from './ToolGroup'
import styles from './ToolGroup.module.css'

/**
 * How the mockups draw the folds of ended turns: closed, as each fold
 * starts, open, or open with the last message line of each fold open too.
 */
export const foldStates = ['closed', 'open', 'open-message'] as const

export type FoldState = (typeof foldStates)[number]

/** One step of an open fold, in the list style of an open run of tool calls. */
function Step(props: { step: WorkItem; open: boolean; viewer: PersonKey }) {
  const { step } = props
  switch (step.kind) {
    case 'tool':
      return (
        <li className={styles.call}>
          <CallLine call={step} />
        </li>
      )
    case 'agent':
      return (
        <li>
          <MessageLine message={step} open={props.open} />
        </li>
      )
    case 'mac-command':
      return (
        <li className={styles.card}>
          <MacCommand request={step.request} state={step.state} />
        </li>
      )
    case 'secret-run':
      return (
        <li className={styles.card}>
          <SecretRun item={step} viewer={props.viewer} />
        </li>
      )
    case 'lost':
      return (
        <li>
          <LostLine align="start" reason={step.reason} what={step.what} />
        </li>
      )
  }
}

/**
 * The work of an ended turn before its answer, folded into one line, such
 * as "11 tool calls, 2 messages". The line has the icons of the tool kinds
 * and the left-out output, as the line of a run of tool calls has. A Mac
 * command card, the card of a run with secrets, and a lost line fold with
 * the work at their place, and add no count and no mark. The open fold
 * lists the steps in order: a tool call as its call line, a message as its
 * first words, a card as the card, and a lost line as the lost line.
 * `viewer` is the person signed in, whom a card names as "you".
 */
export function WorkFold(props: {
  steps: readonly WorkItem[]
  state: FoldState
  viewer: PersonKey
}) {
  const { steps, state } = props
  const calls = steps.filter((step) => step.kind === 'tool')
  const messages = steps.filter((step) => step.kind === 'agent')
  const openMessage = state === 'open-message' ? messages.at(-1) : undefined
  return (
    <details className={styles.group} open={state !== 'closed'}>
      <FoldLine calls={calls} messages={messages.length} />
      <ul className={styles.calls}>
        {steps.map((step) => (
          <Step
            key={step.id}
            open={step === openMessage}
            step={step}
            viewer={props.viewer}
          />
        ))}
      </ul>
    </details>
  )
}
