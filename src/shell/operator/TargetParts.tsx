import { Fragment, type ReactNode } from 'react'
import { Ban, Trash2 } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import directory from '../../../docs/mockups/src/components/operator/directory.module.css'
import styles from '../../../docs/mockups/src/components/operator/targets.module.css'
import type { OperatorOrgSummary } from '../../shared/operator'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'

/** A user or an org of the operator pages, as a row names it. */
export type Target =
  | { kind: 'user'; login: string; name: string | null }
  | { kind: 'org'; name: string; initials: string | null }

/** The name of a target as the pages write it: a login, or an org name. */
function targetName(target: Target): string {
  return target.kind === 'user' ? `@${target.login}` : target.name
}

/** A user shows on a disc, and an org on a square, as in the rest of the app. */
export function TargetMark(props: { target: Target; size?: number }) {
  const { target } = props
  const size = props.size ?? 26
  if (target.kind === 'org') {
    const org = { name: target.name, initials: target.initials ?? undefined }
    return <OrgTile org={org} size={size} />
  }
  return (
    <PersonAvatar
      person={{ displayName: target.name, githubLogin: target.login }}
      size={size}
    />
  )
}

/** The state of a suspended or deleted target. A target in use shows none. */
export function TargetState(props: { status: OperatorOrgSummary['status'] }) {
  switch (props.status) {
    case 'active':
      return null
    case 'suspended':
      return <StatusText icon={Ban} label="Suspended" tone="danger" />
    case 'deleted':
      return <StatusText icon={Trash2} label="Deleted" tone="muted" />
  }
}

/**
 * The parts of a muted line, such as a name and a state, with a dot
 * between them. A missing part leaves no dot.
 */
export function Joined(props: { parts: readonly ReactNode[] }) {
  const parts = props.parts.filter(
    (part) => part !== null && part !== undefined && part !== '',
  )
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      {part}
    </Fragment>
  ))
}

/** The name of a user or an org as a link to its page. */
export function NameLink(props: { to: string; children: ReactNode }) {
  return (
    <AppLink className={styles.nameLink} to={props.to}>
      {props.children}
    </AppLink>
  )
}

/** A name cell of a table: the mark, the name, and a muted line under it. */
export function NameCell(props: {
  mark: ReactNode
  name: ReactNode
  detail?: ReactNode
}) {
  return (
    <span className={directory.nameCell}>
      {props.mark}
      <span className={directory.nameText}>
        {props.name}
        {props.detail ? (
          <span className={directory.nameDetail}>{props.detail}</span>
        ) : null}
      </span>
    </span>
  )
}

/**
 * A row of a list that names a user or an org: its mark, its name as a
 * link to its page, a muted line under it, and an end, such as a role.
 */
export function TargetRow(props: {
  target: Target
  to: string
  detail?: ReactNode
  end?: ReactNode
}) {
  return (
    <li className={styles.row}>
      <TargetMark target={props.target} />
      <span className={styles.text}>
        <NameLink to={props.to}>{targetName(props.target)}</NameLink>
        {props.detail ? (
          <span className={styles.detail}>{props.detail}</span>
        ) : null}
      </span>
      {props.end ? <span className={styles.end}>{props.end}</span> : null}
    </li>
  )
}

/** The box with a full outline that holds the rows of targets. */
export function TargetList(props: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={props.label} className={styles.list}>
      {props.children}
    </ul>
  )
}

/** A list or a search with no row says so in place of the rows. */
export function EmptyRows(props: { children: string }) {
  return <p className={directory.empty}>{props.children}</p>
}
