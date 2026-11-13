import { Ban, CircleCheck, KeyRound } from 'lucide-react'
import { people, type PersonKey } from '../../fixtures/members'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import { StatusText } from '../common/StatusText'
import { CommandLine } from './MacCommand'
import { deniedNote, grantNote, secretRunWords } from './secretRunCopy'
import card from './MacCommand.module.css'
import styles from './SecretRun.module.css'

/**
 * A member as the words of a run name them: `subject` starts a sentence,
 * and `object` follows a word. The viewer reads "You" and "you".
 */
export function whoOf(
  person: PersonKey,
  viewer: PersonKey,
): { subject: string; object: string } {
  if (person === viewer) return { subject: 'You', object: 'you' }
  const { name } = people[person]
  return { subject: name, object: name }
}

/** The names of the secrets of a run, in the order of the request. */
export function runNames(item: SecretRunItem): string {
  return item.request.secrets.map((secret) => secret.name).join(', ')
}

/** The state of a run, as a glyph and a word. */
function RunStatus(props: { item: SecretRunItem }) {
  const { item } = props
  if (item.state === 'running') {
    return <StatusText busy label={secretRunWords.running} tone="active" />
  }
  if (item.state === 'done' && item.result) {
    return (
      <StatusText
        icon={CircleCheck}
        label={`Done in ${item.result.duration}`}
        tone="success"
      />
    )
  }
  return <StatusText icon={Ban} label={secretRunWords.denied} tone="muted" />
}

/** What let the run use its secrets, or who denied it. */
function runNote(item: SecretRunItem, viewer: PersonKey): string | undefined {
  if (item.state === 'denied' && item.deniedBy) {
    return deniedNote(whoOf(item.deniedBy, viewer).subject)
  }
  if (!item.grant) return undefined
  const by = 'by' in item.grant ? item.grant.by : viewer
  return grantNote(item.grant, whoOf(by, viewer).object)
}

/**
 * A run of a command with secrets at its place in the chat, once the
 * agent may use them or a member denied them: the secrets, the state, the
 * command, what let it run, and its output once it ran. The output hides
 * each value, as the chat does. When its turn ends, the card folds with
 * the work of the turn, as a Mac command card does. `viewer` is the person
 * signed in, who reads "you" for their own answer.
 */
export function SecretRun(props: { item: SecretRunItem; viewer: PersonKey }) {
  const { item } = props
  const note = runNote(item, props.viewer)
  return (
    <section
      aria-label={`Command with ${runNames(item)}`}
      className={card.card}
    >
      <div className={card.head}>
        <KeyRound aria-hidden className={card.icon} size={14} />
        <span className={styles.names}>{runNames(item)}</span>
        <span className={card.spacer} />
        <RunStatus item={item} />
      </div>
      <CommandLine command={item.request.command} />
      {note ? <span className={card.meta}>{note}</span> : null}
      {item.state === 'done' && item.result ? (
        <pre className={card.output}>{item.result.output}</pre>
      ) : null}
    </section>
  )
}
