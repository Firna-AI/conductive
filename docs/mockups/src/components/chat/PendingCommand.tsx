import { ChevronDown, Laptop } from 'lucide-react'
import type { ChatItem } from '../../fixtures/conversations'
import { thisMac, type MacCommandRequest } from '../../fixtures/mac'
import { people } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { CommandActions } from '../mac/CommandActions'
import { useMacApp } from '../mac/MacApp'
import type { Detail } from '../settings/DetailList'
import { CommandLine, CommandStatus } from './MacCommand'
import styles from './PendingCommand.module.css'

/** A command on the Mac that waits for its answer. */
type PendingItem = Extract<ChatItem, { kind: 'mac-command' }> & {
  state: 'waiting'
}

/** Whether a chat item is a command on the Mac that waits for its answer. */
export function isPendingCommand(item: ChatItem): item is PendingItem {
  return item.kind === 'mac-command' && item.state === 'waiting'
}

/** The facts of a request that Details shows. */
function factsOf(request: MacCommandRequest, mac: boolean): Detail[] {
  const sender = people[thisMac.owner].name
  return [
    { term: 'Folder', value: request.folder, mono: true },
    { term: 'Reason', value: request.reason },
    {
      term: 'Workspace',
      value: `${checkoutAutocomplete.name}, in ${orgs.acme.name}`,
    },
    { term: 'Sender', value: mac ? `${sender} (you)` : sender },
  ]
}

/**
 * The Mac and the time limit, then Details, which opens the other facts.
 * A longer time limit shows its reason without a click.
 */
function RequestDetails(props: { request: MacCommandRequest; mac: boolean }) {
  const { request } = props
  const where = props.mac ? 'This Mac' : thisMac.name
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        <span className={styles.meta}>
          <span>
            {where} · up to {request.limit}
          </span>
          <span className={styles.toggle}>
            Details
            <ChevronDown aria-hidden className={styles.chevron} size={12} />
          </span>
        </span>
        {request.longerBecause ? (
          <span className={styles.why}>
            Longer than usual. {request.longerBecause}
          </span>
        ) : null}
      </summary>
      <dl className={styles.facts}>
        {factsOf(request, props.mac).map((fact) => (
          <div className={styles.fact} key={fact.term}>
            <dt className={styles.term}>{fact.term}</dt>
            <dd className={fact.mono ? styles.mono : styles.value}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/**
 * The command that waits for approval, as a compact message that the chat
 * pins just above the composer (decision 62): the exact command, the Mac,
 * the time limit, and Details. The Mac app of the sender shows Deny and
 * Allow. A browser shows the state only, because only the Mac app can
 * allow a command on the Mac.
 */
export function PendingCommand(props: { request: MacCommandRequest }) {
  const mac = useMacApp()
  const { request } = props
  return (
    <section
      aria-label={
        mac ? 'Run a command on this Mac?' : `Command on ${thisMac.name}`
      }
      className={styles.pending}
    >
      <div className={styles.head}>
        <Laptop aria-hidden className={styles.icon} size={14} />
        <span className={styles.command}>
          <CommandLine command={request.command} />
        </span>
        <span className={styles.end}>
          {mac ? (
            <CommandActions choicesOpen={mac.choicesOpen} />
          ) : (
            <CommandStatus state="waiting" />
          )}
        </span>
      </div>
      <RequestDetails mac={mac !== undefined} request={request} />
    </section>
  )
}
