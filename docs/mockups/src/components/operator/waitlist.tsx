import type { Viewport } from '@mokly/mokly'
import { Check, Hourglass } from 'lucide-react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import {
  samOkafor,
  type ApprovalEmail,
  type WaitingPerson,
} from '../../fixtures/operatorWaitlist'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { Section } from '../settings/Section'
import { NameCell } from './directory'
import { ProfileLink, TargetMark } from './targets'
import styles from './waitlist.module.css'

/**
 * A phone keeps the person and Approve, and gives the age of the GitHub
 * account under the name. It leaves out the join day, as the Users tab
 * leaves out its columns, because the list is oldest first.
 */
export const waitlistColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'person', label: 'Person', flex: 1 },
    { key: 'github', label: 'On GitHub', width: 88 },
    { key: 'joined', label: 'Joined', width: 64 },
    { key: 'approve', align: 'right', width: 136 },
  ],
  mobile: [
    { key: 'person', label: 'Person', flex: 1 },
    { key: 'approve', align: 'right', width: 116 },
  ],
}

/** The words of the approval email under Approved. */
const emailWords: Readonly<Record<ApprovalEmail, string>> = {
  sent: 'Email sent',
  pending: 'Email not sent yet',
}

/**
 * Approve, or the result of an approval in this visit: Approved, and
 * whether its email went. The app sends a late email again on its own, so
 * the row offers no action for it.
 */
function ApprovalCell(props: { person: WaitingPerson; email?: ApprovalEmail }) {
  if (props.email) {
    return (
      <span className={styles.approved}>
        <StatusText icon={Check} label="Approved" tone="success" />
        <span className={styles.email}>{emailWords[props.email]}</span>
      </span>
    )
  }
  const button = <ActionButton>Approve</ActionButton>
  if (props.person.login !== samOkafor.login) return button
  return (
    <ScreenLink asChild to={paths.operatorWaitlistApprove}>
      {button}
    </ScreenLink>
  )
}

/**
 * The cells of a row: the initials disc, the login as a link to the
 * GitHub profile, the name, the age of the GitHub account, the join day,
 * and Approve. A phone gives the age under the name.
 */
export function waitlistCell(
  viewport: Viewport,
  approved: Readonly<Record<string, ApprovalEmail>>,
) {
  return function cell(person: WaitingPerson, key: string) {
    switch (key) {
      case 'person':
        return (
          <NameCell
            detail={person.name}
            mark={
              <TargetMark
                size={22}
                target={{
                  kind: 'user',
                  name: person.login,
                  initials: person.initials,
                }}
              />
            }
            more={
              viewport === 'mobile'
                ? `${person.githubAge} on GitHub`
                : undefined
            }
            name={<ProfileLink login={person.login} />}
          />
        )
      case 'github':
        return <TableCell muted>{person.githubAge}</TableCell>
      case 'joined':
        return <TableCell muted>{person.joined}</TableCell>
      default:
        return <ApprovalCell email={approved[person.login]} person={person} />
    }
  }
}

/** Nobody waits: the tab says so, and where new people show. */
export function EmptyWaitlist() {
  return (
    <Section title="Waitlist">
      <EmptyState
        body="People show here after their first sign-in, oldest first."
        icon={Hourglass}
        title="Nobody is waiting"
      />
    </Section>
  )
}
