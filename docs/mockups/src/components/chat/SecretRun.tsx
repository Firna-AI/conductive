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

/**
 * The command that the run call sent, under its label (secrets decision
 * 11 D). The agent names it, and nothing checks that it runs it, so the
 * label says so.
 */
export function ClaimedCommand(props: { command: string }) {
  return (
    <span className={styles.claimed}>
      <span className={styles.claimedLabel}>
        {secretRunWords.claimedCommand}
      </span>
      <CommandLine command={props.command} />
    </span>
  )
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
 * agent may use them or a member denied them: the secrets, Allowed or
 * Denied, the command that the agent says it will run, and what let it
 * run. The Worker gets no output and no time of the command, so the card
 * shows none. The tool call line of the agent beside it shows whether the
 * command runs or ran. When its turn ends, the card folds with the work of
 * the turn, as a Mac command card does. `viewer` is the person signed in,
 * who reads "you" for their own answer.
 */
export function SecretRun(props: { item: SecretRunItem; viewer: PersonKey }) {
  const { item } = props
  const note = runNote(item, props.viewer)
  const denied = item.state === 'denied'
  return (
    <section
      aria-label={`Command with ${runNames(item)}`}
      className={card.card}
    >
      <div className={card.head}>
        <KeyRound aria-hidden className={card.icon} size={14} />
        <span className={styles.names}>{runNames(item)}</span>
        <span className={card.spacer} />
        <StatusText
          icon={denied ? Ban : CircleCheck}
          label={denied ? secretRunWords.denied : secretRunWords.allowed}
          tone={denied ? 'muted' : 'success'}
        />
      </div>
      <ClaimedCommand command={item.request.command} />
      {note ? <span className={card.meta}>{note}</span> : null}
    </section>
  )
}
