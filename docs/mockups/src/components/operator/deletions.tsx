import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { TableCell, type TableColumn } from '@firna/ui/table'
import type { DeletionRequest } from '../../fixtures/deletionRequests'
import type { UserPage } from '../../fixtures/operatorUserPages'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { deletionCopy as copy } from './deletionCopy'
import { NameCell } from './directory'
import { NameLink, TargetMark } from './targets'

/**
 * The columns of the Deletions tab: the user, and the day of the request.
 * Both fit a phone, so a phone keeps them.
 */
const columns: TableColumn[] = [
  { key: 'user', label: copy.user, flex: 1 },
  { key: 'requested', label: copy.requested, width: 100 },
]

export const deletionColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: columns,
  mobile: columns,
}

/**
 * The cells of a row: the initials disc, the login as a link to the page
 * of the person with the request, the name, and the day of the request.
 * The row shows no email address, because the section shows one only on
 * the page of a user. The person, the day, and the link come from one
 * record, so the row and the page that it opens agree.
 */
export function deletionCell(request: DeletionRequest, key: string) {
  if (key === 'requested') {
    return <TableCell muted>{request.day}</TableCell>
  }
  const { user } = request
  return (
    <NameCell
      detail={user.name}
      mark={
        <TargetMark
          size={22}
          target={{ kind: 'user', name: user.login, initials: user.initials }}
        />
      }
      name={<NameLink to={request.page}>@{user.login}</NameLink>}
    />
  )
}

/** No request waits: the tab says so, and where a request shows. */
export function EmptyDeletions() {
  return (
    <section.Component moklyInstance="deletions-section" title={copy.title}>
      <emptyState.Component
        body={copy.empty.body}
        icon="user-x"
        moklyInstance="deletions-empty"
        title={copy.empty.title}
      />
    </section.Component>
  )
}

/**
 * The notice at the top of the page of a user whose deletion request
 * waits, with the day of the request. It offers no action, because the
 * plan has not decided how an operator completes a request.
 */
export function DeletionNotice(props: { user: UserPage }) {
  const day = props.user.deletionRequested
  if (day === undefined) return null
  return (
    <notice.Component
      icon="user-x"
      moklyInstance="deletion-notice"
      title={copy.notice(day)}
    />
  )
}
