import { Ban, CircleCheck, KeyRound } from 'lucide-react'
import card from '../../ui/components/chat/MacCommand.module.css'
import { secretRunWords } from '../../ui/components/chat/secretRunCopy'
import styles from '../../ui/components/chat/SecretRun.module.css'
import { StatusText } from '../../ui/components/common/StatusText'
import type {
  SecretRequest,
  SecretWorkspaceEvent,
} from '../../shared/secret-requests'
import { CommandLine } from '../device/CommandParts'
import { deniedLine, runNote } from './secret-words'

type RunEvent = Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>

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

/** A run, or a request that a member denied in time. */
export type RunCardItem =
  | { kind: 'run'; run: RunEvent; request: SecretRequest | null }
  | { kind: 'denied'; request: SecretRequest }

/**
 * A run of a command with secrets at its place in the chat, with the look
 * of the card of a Mac command: the secrets, Allowed or Denied, the command
 * that the agent says it will run, and what let it run. The Worker gets no
 * output and no time of the command, so the card shows neither. The tool
 * call line of the agent beside it shows whether the command runs or ran. A
 * denied run says who denied it and that the command did not run. The card
 * folds with the work of its turn.
 */
export function SecretRunCard(props: {
  item: RunCardItem
  viewerId: string | null
}) {
  const { item, viewerId } = props
  const denied = item.kind === 'denied'
  const shown = denied
    ? item.request.secrets.map((secret) => secret.name)
    : item.run.names
  const command = denied ? item.request.command : item.run.command
  const note = denied
    ? deniedLine(item.request, viewerId)
    : runNote(item.run, item.request, viewerId)
  return (
    <section
      aria-label={`Command with ${shown.join(', ')}`}
      className={card.card}
    >
      <div className={card.head}>
        <KeyRound aria-hidden className={card.icon} size={14} />
        <span className={styles.names}>{shown.join(', ')}</span>
        <span className={card.spacer} />
        <StatusText
          icon={denied ? Ban : CircleCheck}
          label={denied ? secretRunWords.denied : secretRunWords.allowed}
          tone={denied ? 'muted' : 'success'}
        />
      </div>
      <ClaimedCommand command={command} />
      <span className={card.meta}>{note}</span>
    </section>
  )
}
