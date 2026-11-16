import {
  approvalDetail,
  secretsPartWords,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import styles from '../../../docs/mockups/src/components/capabilities/Capabilities.module.css'
import type { SessionSecretApproval } from '../../shared/secrets'
import { ActionButton } from '../ui/actions'

/** One approval of a secret in a session, in the words of its row. */
export interface ShownApproval {
  approval: SessionSecretApproval
  secret: string
  /** The title of the session, or Untitled. */
  session: string
  /** Who allowed it: "you", or the name of the member. */
  who: string
  /** When, as words in a sentence, such as "12 minutes ago". */
  when: string
}

/**
 * The approvals of the sessions of a workspace, which its members can end
 * (secrets decision 8 B): each secret with its session, who allowed it, and
 * when, and Remove. The group hides without approvals.
 */
export function GrantList(props: {
  approvals: readonly ShownApproval[]
  remove: (item: ShownApproval) => void
  disabled: boolean
}) {
  if (props.approvals.length === 0) return null
  return (
    <div className={styles.group}>
      <h4 className={styles.groupTitle}>{secretsPartWords.sessions}</h4>
      <ul className={styles.grants}>
        {props.approvals.map((item) => (
          <li
            className={styles.grant}
            key={`${item.approval.secretId} ${item.approval.sessionId}`}
          >
            <span className={styles.grantText}>
              <span className={styles.secretName}>{item.secret}</span>
              <span className={styles.grantDetail}>
                {approvalDetail(item.session, item.who, item.when)}
              </span>
            </span>
            <ActionButton
              accessibilityLabel={`${secretsPartWords.remove} ${item.secret} from ${item.session}`}
              disabled={props.disabled}
              onPress={() => props.remove(item)}
              tone="plain"
            >
              {secretsPartWords.remove}
            </ActionButton>
          </li>
        ))}
      </ul>
    </div>
  )
}
