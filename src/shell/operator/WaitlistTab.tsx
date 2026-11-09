import { useState } from 'react'
import { Check, Hourglass } from 'lucide-react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import {
  approvedEmailLines,
  approvedLabel,
  emptyWaitlist,
} from '../../../docs/mockups/src/components/operator/accessCopy'
import styles from '../../../docs/mockups/src/components/operator/waitlist.module.css'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { readWaitlistPage } from '../../app/api/read-operator-waitlist'
import { approveUser } from '../../app/operator-access'
import {
  OperatorDirectory,
  type DirectoryResult,
} from '../../app/operator-directory'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import {
  operatorWaitlistPath,
  type OperatorApprovalEmail,
  type OperatorWaitlistEntry,
} from '../../shared/operator-waitlist'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useViewport, type Viewport } from '../ui/viewport'
import { ApproveDialog } from './ApproveDialog'
import { dayWidth, DirectoryList, type DirectoryKind } from './DirectoryList'
import { counted, formatAge, formatShortDay } from './format'
import { OperatorPage } from './OperatorPage'
import { SearchField } from './SearchField'
import { NameCell, ProfileLink, TargetMark } from './TargetParts'

type Person = OperatorWaitlistEntry

/** The state of the approval email of each person approved in this visit. */
type Approved = ReadonlyMap<number, OperatorApprovalEmail['state']>

/**
 * A phone keeps the person and Approve, and gives the age of the GitHub
 * account under the name. It leaves out the join day, because the list
 * is oldest first.
 */
const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'person', label: 'Person', flex: 1 },
    { key: 'github', label: 'On GitHub', width: 88 },
    { key: 'joined', label: 'Joined', width: dayWidth },
    { key: 'approve', align: 'right', width: 136 },
  ],
  phone: [
    { key: 'person', label: 'Person', flex: 1 },
    { key: 'approve', align: 'right', width: 116 },
  ],
}

/** Nobody waits: the tab says so, and where new people show. */
const nobody = (
  <Section title="Waitlist">
    <EmptyState
      body={emptyWaitlist.body}
      icon={Hourglass}
      title={emptyWaitlist.title}
    />
  </Section>
)

/**
 * The line above the rows. A person approved in this visit keeps their row
 * until the list loads again, and the count leaves them out.
 */
function summaryOf(result: DirectoryResult<Person>, approved: Approved) {
  const shown = result.rows.filter((row) => approved.has(row.githubId))
  const waiting = result.total - shown.length
  if (result.search === '') {
    return `${counted(waiting, 'person waits', 'people wait')}, oldest first.`
  }
  const verb = waiting === 1 ? 'matches' : 'match'
  return `${counted(waiting, 'person', 'people')} ${verb} “${result.search}”.`
}

/** Approved, and whether the approval email went, in place of Approve. */
function ApprovedCell(props: { email: OperatorApprovalEmail['state'] }) {
  return (
    <span className={styles.approved}>
      <StatusText icon={Check} label={approvedLabel} tone="success" />
      <span className={styles.email}>{approvedEmailLines[props.email]}</span>
    </span>
  )
}

/**
 * The Waitlist tab of the operator: the people who wait for app access,
 * oldest first, with a search by GitHub login, name, or numeric GitHub ID.
 * Each login opens the GitHub profile of the person, and Approve asks
 * first. After an approval, the row shows Approved and the state of the
 * email until the list loads again. With nobody on the waitlist, the tab
 * says so and has no search.
 */
export function WaitlistTab(props: { search: string }) {
  const app = useApp()
  const { now, timeZone } = useServices()
  const phone = useViewport() === 'phone'
  const [directory] = useState(
    () => new OperatorDirectory(app, operatorWaitlistPath, readWaitlistPage),
  )
  const [approved, setApproved] = useState<Approved>(new Map())
  const [asking, ask] = useState<Person | null>(null)
  const { result } = useStore(directory.state)
  const today = now()
  const age = (row: Person) =>
    row.githubCreatedAt === null
      ? 'Unknown'
      : formatAge(row.githubCreatedAt, today)
  const approve = async (person: Person) => {
    const reply = await approveUser(app, person.githubId)
    setApproved((current) =>
      new Map(current).set(person.githubId, reply.approvalEmail.state),
    )
  }
  const cell = (row: Person, key: string) => {
    switch (key) {
      case 'person':
        return (
          <NameCell
            detail={row.name ?? undefined}
            mark={
              <TargetMark
                size={22}
                target={{ kind: 'user', login: row.login, name: row.name }}
              />
            }
            more={phone ? `${age(row)} on GitHub` : undefined}
            name={<ProfileLink login={row.login} />}
          />
        )
      case 'github':
        return <TableCell muted>{age(row)}</TableCell>
      case 'joined':
        return (
          <TableCell muted>
            {formatShortDay(row.joinedAt, today, timeZone)}
          </TableCell>
        )
      default: {
        const email = approved.get(row.githubId)
        if (email) return <ApprovedCell email={email} />
        return (
          <ActionButton
            accessibilityLabel={`Approve @${row.login}`}
            onPress={() => ask(row)}
          >
            Approve
          </ActionButton>
        )
      }
    }
  }
  const kind: DirectoryKind<Person> = {
    title: 'Waitlist',
    one: 'person',
    many: 'people',
    keys: 'Search by GitHub login, name, or GitHub ID.',
    columns,
    rowKey: (row) => String(row.githubId),
    summary: (found) => summaryOf(found, approved),
    noMatch: (search) => `Nobody on the waitlist matches “${search}”.`,
    nothing: nobody,
    failure: 'waitlist',
  }
  const empty = result?.search === '' && result.total === 0
  return (
    <OperatorPage tab="waitlist" title="Operator">
      {empty ? null : (
        <SearchField
          address={routes.operatorWaitlist}
          label="Search the waitlist"
          placeholder="GitHub login, name, or GitHub ID"
          search={props.search}
        />
      )}
      <DirectoryList
        cell={cell}
        directory={directory}
        kind={kind}
        search={props.search}
      />
      {asking ? (
        <ApproveDialog
          approve={() => approve(asking)}
          close={() => ask(null)}
          person={{
            login: asking.login,
            name: asking.name,
            verifiedEmail: asking.hasVerifiedEmail,
          }}
        />
      ) : null}
    </OperatorPage>
  )
}
