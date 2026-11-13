import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import { ActionButton } from '../common/actions'
import {
  approvalDetail,
  secretsPartWords,
  valueDetail,
} from './capabilitiesCopy'
import styles from './Capabilities.module.css'

/** One grant: the secret, what it covers, and Remove. */
function GrantRow(props: { name: string; detail: string; what: string }) {
  return (
    <li className={styles.grant}>
      <span className={styles.grantText}>
        <span className={styles.secretName}>{props.name}</span>
        <span className={styles.grantDetail}>{props.detail}</span>
      </span>
      <ActionButton
        accessibilityLabel={`${secretsPartWords.remove} ${props.what}`}
        tone="plain"
      >
        {secretsPartWords.remove}
      </ActionButton>
    </li>
  )
}

/**
 * The grants of a workspace that its members can end (secrets decision
 * 8): each approval of a secret in a session, and each value that a member
 * gave for the workspace. Each has Remove. A group without grants hides.
 * `who` names a member, "you" for the person signed in.
 */
export function GrantList(props: {
  grants: WorkspaceGrants
  who: (person: PersonKey) => string
}) {
  const { approvals, values } = props.grants
  return (
    <>
      {approvals.length > 0 ? (
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{secretsPartWords.sessions}</h4>
          <ul className={styles.grants}>
            {approvals.map((approval) => (
              <GrantRow
                detail={approvalDetail(
                  approval.session,
                  props.who(approval.by),
                  approval.when,
                )}
                key={`${approval.secret} ${approval.session}`}
                name={approval.secret}
                what={`${approval.secret} from ${approval.session}`}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {values.length > 0 ? (
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{secretsPartWords.values}</h4>
          <ul className={styles.grants}>
            {values.map((value) => (
              <GrantRow
                detail={valueDetail(props.who(value.by), value.when)}
                key={value.name}
                name={value.name}
                what={`the value of ${value.name}`}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
