import { suspensions, type Suspension } from '../../fixtures/operator'
import { paths } from '../../paths'
import { Section, SectionText } from '../settings/Section'
import { TargetList, TargetRow } from './targets'

/** The page of each kind of suspended target, which holds Lift. */
const pagePaths = {
  user: paths.operatorUserSuspended,
  org: paths.operatorOrgSuspended,
} as const

function detail(target: Suspension): string {
  const kind = target.kind === 'user' ? 'User' : 'Org'
  return `${kind} · suspended ${target.since} by @${target.by}`
}

/**
 * The users and orgs that are suspended now, each with the day and the
 * operator. Each row opens the page of its user or org, which holds Lift.
 * With no suspension, one line says that everyone has access.
 */
export function Suspensions(props: { empty: boolean }) {
  return (
    <Section title="Suspended">
      {props.empty ? (
        <SectionText muted>Every user and org has access.</SectionText>
      ) : (
        <TargetList label="Suspended users and orgs">
          {suspensions.map((target) => (
            <TargetRow
              detail={detail(target)}
              key={`${target.kind}-${target.name}`}
              target={target}
              to={pagePaths[target.kind]}
            />
          ))}
        </TargetList>
      )}
    </Section>
  )
}
