import { Laptop } from 'lucide-react'
import { LiteralText } from '../../../../../src/chat/device/LiteralText'
import {
  safariDuration,
  safariOutput,
  thisMac,
  type MacCommandRequest,
  type MacCommandState,
} from '../../fixtures/mac'
import { people } from '../../fixtures/members'
import { defined } from '../../defined'
import type { IconKey } from '../../entries/components/common/icons'
import { actionButton } from '../../entries/components/common/actions.mockup'
import type { StatusTone } from '../../../../../src/ui/components/common/StatusText'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import styles from '../../../../../src/ui/components/chat/MacCommand.module.css'

type StatePresentation = {
  label: string
  tone: StatusTone
  icon?: IconKey
  busy?: boolean
}

const sender = people[thisMac.owner].name

const states: Readonly<Record<MacCommandState, StatePresentation>> = {
  waiting: { label: 'Waiting for approval', tone: 'active', busy: true },
  denied: { label: 'Denied', tone: 'muted', icon: 'ban' },
  done: {
    label: `Done in ${safariDuration}`,
    tone: 'success',
    icon: 'circle-check',
  },
  unavailable: {
    label: 'Mac not available',
    tone: 'warning',
    icon: 'monitor-off',
  },
  'mac-access-off': {
    label: 'Mac access off',
    tone: 'muted',
    icon: 'shield-off',
  },
}

/**
 * The line under the command that says what happened, by state. A waiting
 * request has none, because the chat pins it above the composer.
 */
const notes: Readonly<Partial<Record<MacCommandState, string>>> = {
  denied: `${sender} denied it in the Mac app.`,
  unavailable: 'The Mac is asleep, or the Mac app is closed.',
  'mac-access-off': 'Mac access is off in the Capabilities of this workspace.',
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

/**
 * The state of a command on the Mac, as a glyph and a word. `id` is the id
 * of the chat item of the command, which names the state for Mokly.
 */
export function CommandStatus(props: { id: string; state: MacCommandState }) {
  const presentation = states[props.state]
  return (
    <statusText.Component
      label={presentation.label}
      moklyInstance={`command-${props.id}`}
      tone={presentation.tone}
      {...defined({ busy: presentation.busy, icon: presentation.icon })}
    />
  )
}

/**
 * A command that the agent asked to run on the Mac of the person who sent
 * the turn (decision 62), at its place in the chat: the Mac, the state, the
 * command, its folder and time limit, and the output once it ran. Long
 * output shows its first ten lines with a fade and Show all.
 */
export function MacCommand(props: {
  /** The id of the chat item of the command. */
  id: string
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
        <CommandStatus id={props.id} state={state} />
      </div>
      <CommandLine command={request.command} />
      <span className={styles.meta}>
        in <code className={styles.path}>{request.folder}</code> · up to{' '}
        {request.limit}
      </span>
      {state === 'done' ? (
        <div className={styles.output}>
          <pre
            className={`${styles.outputText} ${styles.outputShort} ${styles.outputFaded}`}
          >
            {safariOutput}
          </pre>
          <span className={styles.outputMore}>
            <actionButton.Component
              moklyInstance={`show-all-${props.id}`}
              tone="plain"
            >
              Show all
            </actionButton.Component>
          </span>
        </div>
      ) : null}
      {note ? <span className={styles.note}>{note}</span> : null}
    </section>
  )
}
