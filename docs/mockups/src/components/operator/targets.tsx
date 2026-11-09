import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { InitialsTile, PersonAvatar } from '../orgs/OrgTile'
import styles from './targets.module.css'

/** A user or an org of the operator pages, as a list row names it. */
export type Target = { kind: 'user' | 'org'; name: string; initials: string }

/** The name of a target as the pages write it: a login, or an org name. */
function targetName(target: Target): string {
  return target.kind === 'user' ? `@${target.name}` : target.name
}

/** A person shows on a disc, and an org on a square, as in the rest of the app. */
export function TargetMark(props: { target: Target; size?: number }) {
  const { initials } = props.target
  const size = props.size ?? 26
  return props.target.kind === 'user' ? (
    <PersonAvatar initials={initials} size={size} />
  ) : (
    <InitialsTile initials={initials} size={size} />
  )
}

/** The name of a user or an org as a link to its page, in a row or a cell. */
export function NameLink(props: { to: string; children: ReactNode }) {
  return (
    <ScreenLink className={styles.nameLink} to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * The login of a person as a link to their profile on GitHub, which opens
 * in a new tab. The operator judges a person who waits from it.
 */
export function ProfileLink(props: { login: string }) {
  const href = useOutsideHref(`https://github.com/${props.login}`)
  return (
    <a
      aria-label={`@${props.login} on GitHub`}
      className={styles.profileLink}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className={styles.profileName}>@{props.login}</span>
      <ExternalLink aria-hidden className={styles.profileIcon} size={11} />
    </a>
  )
}

/** A link inside a line of text, such as the owner of a referral code. */
export function InlineLink(props: { to: string; children: ReactNode }) {
  return (
    <ScreenLink className={styles.inlineLink} to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * A row of a list that names a user or an org: its mark, its name as a
 * link, a muted line under it, and an end, such as a role or a count.
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
