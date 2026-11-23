import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import {
  approvalDetail,
  secretsPartWords,
  valueDetail,
} from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import styles from '../../../../../src/ui/components/capabilities/Capabilities.module.css'

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
 * The grants that the members of a workspace can end from one session
 * (secrets decision 8): each approval of a secret in this session, and each value that a member
 * gave for the workspace. Each has Remove. A group without grants hides.
 * `grants` holds only the approvals that the control shows, as
 * `shownGrants` gives them. `who` names a member, "you" for the person
 * signed in.
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
          <h4 className={styles.groupTitle}>{secretsPartWords.session}</h4>
          <ul className={styles.grants}>
            {approvals.map((approval) => (
              <GrantRow
                detail={approvalDetail(props.who(approval.by), approval.when)}
                key={approval.secret}
                name={approval.secret}
                what={`${approval.secret} from this session`}
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
