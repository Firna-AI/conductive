import { Input } from '@firna/ui/input'
import { Trash2, Unplug } from 'lucide-react'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { DetailList, type Detail } from '../settings/DetailList'
import { Section } from '../settings/Section'
import { ComputerStatus } from './ComputerStatus'
import { computerPageWords as words, sizeText } from './ownComputerCopy'
import { defaultLimit, type OwnComputer } from './ownComputer'
import styles from './ComputerSections.module.css'

/** The notice at the top of the page of a computer that is offline. */
export function OfflineNotice(props: { computer: OwnComputer }) {
  return (
    <Notice
      body={words.offlineBody}
      icon={Unplug}
      title={words.offlineTitle(props.computer.name)}
    />
  )
}

/** The state of a computer, and when an offline computer was last seen. */
function StateLine(props: { computer: OwnComputer }) {
  const { connection } = props.computer
  return (
    <span className={styles.state}>
      <ComputerStatus computer={props.computer} />
      {connection.kind === 'offline' ? (
        <span className={styles.seen}>Last seen {connection.lastSeen}</span>
      ) : null}
    </span>
  )
}

/**
 * The facts of an own computer: its state, its workspaces of its limit,
 * its size and its system from its newest connection, and when an admin
 * added it.
 */
export function ComputerDetails(props: { computer: OwnComputer }) {
  const { computer } = props
  const rows: Detail[] = [
    { term: words.state, value: <StateLine computer={computer} /> },
  ]
  if (computer.limit !== undefined) {
    const running = `${computer.running} of ${computer.limit} running`
    rows.push({
      term: words.workspaces,
      value:
        computer.workspaces > 0
          ? `${running} · ${words.inAll(computer.workspaces)}`
          : running,
    })
  }
  if (computer.resources) {
    rows.push(
      { term: words.size, value: sizeText(computer.resources) },
      { term: words.system, value: computer.resources.system },
    )
  }
  rows.push({ term: words.added, value: computer.added })
  return (
    <Section title={words.details}>
      <DetailList rows={rows} />
    </Section>
  )
}

/**
 * The number of workspaces that run on the computer at once, which only an
 * admin sets. The hint gives the default for the size of the computer.
 * Save is on only after a change.
 */
export function LimitSection(props: { computer: OwnComputer; org: string }) {
  const { field } = useControlSizes()
  const { computer } = props
  const { resources, limit } = computer
  if (resources === undefined || limit === undefined) return null
  return (
    <Section
      actions={<ActionButton disabled>{words.save}</ActionButton>}
      description={words.limitBody(computer.name, props.org)}
      title={words.limitTitle}
    >
      <div className={styles.limit}>
        <Input
          accessibilityLabel={words.limitTitle}
          hint={words.limitHint(resources, defaultLimit(resources))}
          inputMode="numeric"
          onChangeText={noop}
          size={field}
          value={String(limit)}
        />
      </div>
    </Section>
  )
}

/**
 * Remove computer, for an admin. It asks first, because a removed
 * computer cannot connect again, and its workspaces cannot start again.
 */
export function RemoveSection(props: {
  computer: OwnComputer
  org: string
  to?: string
}) {
  const button = (
    <ActionButton icon={Trash2} tone="danger">
      {words.remove}
    </ActionButton>
  )
  return (
    <Section
      actions={
        props.to ? (
          <ScreenLink asChild to={props.to}>
            {button}
          </ScreenLink>
        ) : (
          button
        )
      }
      description={words.removeBody(props.computer.name, props.org)}
      title={words.removeTitle}
    />
  )
}
