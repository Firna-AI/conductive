import { KeyRound, SquareTerminal } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { ComputerStatus } from './ComputerStatus'
import { ownComputerWords, rowMeta, usageText } from './ownComputerCopy'
import { computerState, type OwnComputer } from './ownComputer'
import styles from './OwnComputerList.module.css'

/**
 * The screens that the list opens, in the mockups: the page of each
 * computer by its name, and the dialog of a computer that never connected.
 */
export type ComputerListLinks = {
  pages: Readonly<Record<string, string>>
  showCommand?: string
  newCode?: string
}

/**
 * The action of a computer that never connected, for an admin: the install
 * command again while its code works, or a new code after it expired.
 */
function PendingAction(props: { computer: OwnComputer; to?: string }) {
  const expired = props.computer.connection.kind === 'expired'
  const button = (
    <ActionButton
      icon={expired ? KeyRound : SquareTerminal}
      tone={expired ? 'primary' : 'secondary'}
    >
      {expired ? ownComputerWords.newCode : ownComputerWords.showCommand}
    </ActionButton>
  )
  if (props.to === undefined) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}

/** The name of a computer, as a link to its page when the mockups draw it. */
function Name(props: { name: string; to?: string }) {
  if (props.to === undefined) {
    return <span className={styles.name}>{props.name}</span>
  }
  return (
    <ScreenLink className={styles.nameLink} to={props.to}>
      {props.name}
    </ScreenLink>
  )
}

/**
 * One own computer: its name, which opens its page, its size and its
 * builds under it, then its state and its workspaces. A computer that
 * never connected has no page yet and runs no workspace, so an admin gets
 * its action in the place of its workspaces.
 */
function Row(props: {
  computer: OwnComputer
  links: ComputerListLinks
  admin: boolean
}) {
  const { computer, links } = props
  const state = computerState(computer)
  const pending = state === 'waiting' || state === 'expired'
  return (
    <li className={styles.row}>
      <span className={styles.text}>
        <Name
          name={computer.name}
          to={pending ? undefined : links.pages[computer.name]}
        />
        <span
          className={
            computer.builds.now?.kind === 'failed' && state !== 'build-failed'
              ? `${styles.meta} ${styles.failed}`
              : styles.meta
          }
        >
          {rowMeta(computer, state)}
        </span>
      </span>
      <span className={styles.state}>
        <ComputerStatus computer={computer} />
      </span>
      <span className={styles.usage}>
        {pending && props.admin ? (
          <PendingAction
            computer={computer}
            to={state === 'expired' ? links.newCode : links.showCommand}
          />
        ) : (
          usageText(computer, state)
        )}
      </span>
    </li>
  )
}

/**
 * The own computers of an org, in the order that admins added them. Each
 * row names a computer, its size, its builds, its state, and how many of
 * its workspaces run of its limit. The list takes no fixtures, so the app
 * can draw it too.
 */
export function OwnComputerList(props: {
  computers: readonly OwnComputer[]
  links: ComputerListLinks
  admin: boolean
}) {
  return (
    <ul aria-label={ownComputerWords.tab} className={styles.list}>
      {props.computers.map((computer) => (
        <Row
          admin={props.admin}
          computer={computer}
          key={computer.name}
          links={props.links}
        />
      ))}
    </ul>
  )
}
