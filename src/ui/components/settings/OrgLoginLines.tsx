import type { Agent } from '../../../shared/generated/Agent'
import styles from './OrgLoginLines.module.css'

/**
 * For each agent, the names of the orgs whose org login serves the new
 * sessions of the person signed in, such as Acme for Claude.
 */
export type OrgLoginUse = Readonly<Partial<Record<Agent, readonly string[]>>>

/** The words of an org login that serves the person. The app takes them here. */
const orgLoginCopy = {
  /** The line under the row of the agent, such as for Acme. */
  line: (org: string) => `Your new sessions in ${org} use ${org}'s login.`,
} as const

/**
 * One line under the row of an agent for each org whose org login serves
 * the new sessions of the person signed in, from decisions 4, 6 A, and 7 B
 * of the org logins plan: the person has no usable login of their own for
 * the agent, or an admin of that org turned on "Use for every member". The
 * account names the default login of each org and agent, so the screens
 * show that value and do not work it out.
 */
export function OrgLoginLines(props: { orgs?: readonly string[] }) {
  if (!props.orgs?.length) return null
  return (
    <>
      {props.orgs.map((org) => (
        <p className={styles.line} key={org}>
          {orgLoginCopy.line(org)}
        </p>
      ))}
    </>
  )
}
