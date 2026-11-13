import type { LucideIcon } from 'lucide-react'
import { Ban, CircleCheck, Laptop, MonitorOff } from 'lucide-react'
import { LiteralText } from '../../../../../src/chat/device/LiteralText'
import {
  safariDuration,
  safariOutput,
  thisMac,
  type MacCommandRequest,
  type MacCommandState,
} from '../../fixtures/mac'
import { people } from '../../fixtures/members'
import { StatusText, type StatusTone } from '../common/StatusText'
import styles from './MacCommand.module.css'

type StatePresentation = {
  label: string
  tone: StatusTone
  icon?: LucideIcon
  busy?: boolean
}

const sender = people[thisMac.owner].name

const states: Readonly<Record<MacCommandState, StatePresentation>> = {
  waiting: { label: 'Waiting for approval', tone: 'active', busy: true },
  denied: { label: 'Denied', tone: 'muted', icon: Ban },
  done: {
    label: `Done in ${safariDuration}`,
    tone: 'success',
    icon: CircleCheck,
  },
  unavailable: {
    label: 'Mac not available',
    tone: 'warning',
    icon: MonitorOff,
  },
}

/**
 * The line under the command that says what happened, by state. A waiting
 * request has none, because the chat pins it above the composer.
 */
const notes: Readonly<Partial<Record<MacCommandState, string>>> = {
  denied: `${sender} denied it in the Mac app.`,
  unavailable: 'The Mac is asleep, or the Mac app is closed.',
}

/** The exact command, after a muted shell prompt. Long commands wrap. */
export function CommandLine(props: { command: string }) {
  return (
    <LiteralText
      className={styles.command}
      lead={
        <span aria-hidden className={styles.prompt}>
          ${' '}
        </span>
      }
      syntax="shell"
      text={props.command}
    />
  )
}

/** The state of a command on the Mac, as a glyph and a word. */
export function CommandStatus(props: { state: MacCommandState }) {
  const presentation = states[props.state]
  return (
    <StatusText
      busy={presentation.busy}
      icon={presentation.icon}
      label={presentation.label}
      tone={presentation.tone}
    />
  )
}

/**
 * A command that the agent asked to run on the Mac of the person who sent
 * the turn (decision 62), at its place in the chat: the Mac, the state, the
 * command, its folder and time limit, and the output once it ran.
 */
export function MacCommand(props: {
  request: MacCommandRequest
  state: MacCommandState
}) {
  const { request, state } = props
  const note = notes[state]
  return (
    <section aria-label={`Command on ${thisMac.name}`} className={styles.card}>
      <div className={styles.head}>
        <Laptop aria-hidden className={styles.icon} size={14} />
        <span className={styles.mac}>{thisMac.name}</span>
        <span className={styles.spacer} />
        <CommandStatus state={state} />
      </div>
      <CommandLine command={request.command} />
      <span className={styles.meta}>
        in <code className={styles.path}>{request.folder}</code> · up to{' '}
        {request.limit}
      </span>
      {state === 'done' ? (
        <pre className={styles.output}>{safariOutput}</pre>
      ) : null}
      {note ? <span className={styles.note}>{note}</span> : null}
    </section>
  )
}
