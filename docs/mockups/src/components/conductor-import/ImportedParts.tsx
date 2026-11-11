import { Badge } from '@firna/ui/badge'
import {
  ChevronRight,
  CircleAlert,
  FileText,
  History,
  Power,
} from 'lucide-react'
import type { OldSession } from '../../fixtures/conductorImport'
import { AgentMark } from '../chat/AgentMark'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { LinkedControl } from '../common/LinkedControl'
import type { MenuEntry } from '../common/Menu'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ImportedParts.module.css'

/**
 * The flag of a workspace that came from an import of Conductor. It keeps
 * its width in a line that shortens the parts around it.
 */
export function ImportFlag() {
  return (
    <span className={styles.flag}>
      <Badge size="sm">From Conductor</Badge>
    </span>
  )
}

/** The count and the day of an old session, such as "33 messages · 3 Nov". */
function sessionDetail(session: OldSession): string {
  return `${session.messages} messages · ${session.day}`
}

/** One old session: its agent, its title, and its size, as a link. */
function SessionRow(props: { session: OldSession; to?: string }) {
  const { session } = props
  const content = (
    <>
      <AgentMark agent={session.agent} />
      <span className={styles.title}>{session.title}</span>
      <span className={styles.detail}>{sessionDetail(session)}</span>
      <ChevronRight aria-hidden className={styles.chevron} size={14} />
    </>
  )
  return (
    <li>
      {props.to ? (
        <ScreenLink className={styles.row} to={props.to}>
          {content}
        </ScreenLink>
      ) : (
        <span className={styles.row}>{content}</span>
      )}
    </li>
  )
}

/**
 * The sessions that the workspace kept from Conductor, as links in place of
 * an empty chat. Each one opens its Markdown file in the Markdown view of
 * the app, also before the activation and while the cloud computer is
 * stopped. `links` gives the screen of each session that the mockups draw.
 */
export function OldSessionLinks(props: {
  sessions: readonly OldSession[]
  links: Readonly<Record<string, string>>
}) {
  return (
    <section aria-label="Sessions from Conductor" className={styles.links}>
      <History aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.heading}>From Conductor</h2>
      <p className={styles.body}>Open a session to read it as a document.</p>
      <ul aria-label="Sessions" className={styles.list}>
        {props.sessions.map((session) => (
          <SessionRow
            key={session.key}
            session={session}
            to={props.links[session.key]}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * The old sessions in the session history of an imported workspace, under
 * their own label. Each one opens its Markdown file, so the old sessions
 * stay one click away after the first new session starts. `links` gives
 * the screen of each session that the mockups draw.
 */
export function oldSessionHistory(
  sessions: readonly OldSession[],
  links: Readonly<Record<string, string>>,
): MenuEntry[] {
  return [
    { kind: 'label', label: 'From Conductor' },
    ...sessions.map((session): MenuEntry => ({
      kind: 'item',
      label: session.title,
      mark: <AgentMark agent={session.agent} />,
      detail: session.day,
      trailingIcon: FileText,
      to: links[session.key],
    })),
  ]
}

/**
 * Activate or Try again, which opens the activation at `to`. Null keeps
 * the button static, where the mockups draw no activation for the state.
 */
function ActivationButton(props: { label: string; to: string | null }) {
  return (
    <LinkedControl to={props.to}>
      <ActionButton tone="primary">{props.label}</ActionButton>
    </LinkedControl>
  )
}

/**
 * The question in place of the composer while an imported workspace has no
 * cloud computer. Activate starts one and copies the work in.
 */
export function ActivateBar(props: { to: string | null }) {
  return (
    <Notice
      action={<ActivationButton label="Activate" to={props.to} />}
      body="A cloud computer starts with your work from Conductor."
      icon={Power}
      title="Activate this workspace"
    />
  )
}

/**
 * A failed activation, above the composer. The workspace keeps its old
 * sessions and the stored work, and Try again activates it again.
 * `message` is the message that the app saved for the failure.
 */
export function ActivationFailedNotice(props: {
  message: string
  to: string | null
}) {
  return (
    <Notice
      action={<ActivationButton label="Try again" to={props.to} />}
      body={`${props.message} Your work from Conductor is kept.`}
      icon={CircleAlert}
      title="The workspace couldn't be activated"
      tone="danger"
    />
  )
}

/**
 * What the files and tools panels show while an imported workspace has no
 * cloud computer: before the activation, or after a failed one. A phone
 * shows the chat bar only on its Chat tab, so its panels offer the action
 * too.
 */
export function ImportedPanel(props: {
  state: 'inactive' | 'failed'
  phone: boolean
  to: string | null
}) {
  const failed = props.state === 'failed'
  const label = failed ? 'Try again' : 'Activate'
  return (
    <EmptyState
      action={
        props.phone ? (
          <ActivationButton label={label} to={props.to} />
        ) : undefined
      }
      body={
        failed
          ? 'Your work from Conductor is kept.'
          : 'Activate the workspace to open its files and tools.'
      }
      icon={failed ? CircleAlert : Power}
      title={failed ? "The workspace couldn't be activated" : 'Not active'}
    />
  )
}
