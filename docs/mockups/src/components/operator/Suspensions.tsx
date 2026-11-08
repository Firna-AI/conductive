import { LockOpen } from 'lucide-react'
import { suspensions, type Suspension } from '../../fixtures/operator'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { InitialsTile, PersonAvatar } from '../orgs/OrgTile'
import { Section, SectionText } from '../settings/Section'
import styles from './Suspensions.module.css'

/** The name of a target as the page writes it: a login, or an org name. */
export function targetName(target: Suspension): string {
  return target.kind === 'user' ? `@${target.name}` : target.name
}

/** A person shows on a disc, and an org on a square, as in the rest of the app. */
function TargetMark(props: { target: Suspension }) {
  const { initials } = props.target
  return props.target.kind === 'user' ? (
    <PersonAvatar initials={initials} size={26} />
  ) : (
    <InitialsTile initials={initials} size={26} />
  )
}

function SuspensionRow(props: { target: Suspension; lift: string }) {
  const { target } = props
  const kind = target.kind === 'user' ? 'User' : 'Org'
  return (
    <li className={styles.row}>
      <TargetMark target={target} />
      <span className={styles.text}>
        <span className={styles.name}>{targetName(target)}</span>
        <span className={styles.detail}>
          {kind} · suspended {target.since} by @{target.by}
        </span>
      </span>
      <ScreenLink asChild to={props.lift}>
        <ActionButton
          accessibilityLabel={`Lift the suspension of ${targetName(target)}`}
          icon={LockOpen}
        >
          Lift
        </ActionButton>
      </ScreenLink>
    </li>
  )
}

/** The page of the lift dialog of each kind of target. */
const liftPaths = {
  user: paths.operatorLift,
  org: paths.operatorLiftOrg,
} as const

/**
 * The users and orgs that are suspended now, each with the day, the
 * operator, and Lift, which asks first. With no suspension, one line says
 * that everyone has access.
 */
export function Suspensions(props: { empty: boolean }) {
  return (
    <Section title="Suspended">
      {props.empty ? (
        <SectionText muted>Every user and org has access.</SectionText>
      ) : (
        <ul aria-label="Suspended users and orgs" className={styles.list}>
          {suspensions.map((target) => (
            <SuspensionRow
              key={`${target.kind}-${target.name}`}
              lift={liftPaths[target.kind]}
              target={target}
            />
          ))}
        </ul>
      )}
    </Section>
  )
}
