import {
  approvalDetail,
  secretsPartWords,
  valueDetail,
} from '../../ui/components/capabilities/capabilitiesCopy'
import styles from '../../ui/components/capabilities/Capabilities.module.css'
import type { SessionSecretApproval } from '../../shared/secrets'
import { ActionButton } from '../ui/actions'

/** One approval of a secret in the open session, in the words of its row. */
export interface ShownApproval {
  approval: SessionSecretApproval
  secret: string
  /** Who allowed it: "you", or the name of the member. */
  who: string
  /** When, as words in a sentence, such as "12 minutes ago". */
  when: string
}

/** One value that a member gave for the workspace, in the words of its row. */
export interface ShownValue {
  id: string
  name: string
  /** Who gave it: "you", or the name of the member. */
  who: string
  /** When, as words in a sentence, such as "3 hours ago". */
  when: string
}

/** One grant: the secret, what it covers, and Remove. */
function GrantRow(props: {
  name: string
  detail: string
  /** What Remove ends, for its spoken name. */
  what: string
  remove: () => void
  disabled: boolean
}) {
  return (
    <li className={styles.grant}>
      <span className={styles.grantText}>
        <span className={styles.secretName}>{props.name}</span>
        <span className={styles.grantDetail}>{props.detail}</span>
      </span>
      <ActionButton
        accessibilityLabel={`${secretsPartWords.remove} ${props.what}`}
        disabled={props.disabled}
        onPress={props.remove}
        tone="plain"
      >
        {secretsPartWords.remove}
      </ActionButton>
    </li>
  )
}

/**
 * The grants that the members of a workspace can end from one session
 * (secrets decision 8 B): each approval of a secret in this session, with
 * who allowed it and when, and each value that a member gave for the
 * workspace, with who gave it. Each has Remove. A group without grants
 * hides.
 */
export function GrantList(props: {
  approvals: readonly ShownApproval[]
  values: readonly ShownValue[]
  removeApproval: (item: ShownApproval) => void
  removeValue: (item: ShownValue) => void
  disabled: boolean
}) {
  return (
    <>
      {props.approvals.length > 0 ? (
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{secretsPartWords.session}</h4>
          <ul className={styles.grants}>
            {props.approvals.map((item) => (
              <GrantRow
                detail={approvalDetail(item.who, item.when)}
                disabled={props.disabled}
                key={item.approval.secretId}
                name={item.secret}
                remove={() => props.removeApproval(item)}
                what={`${item.secret} from this session`}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {props.values.length > 0 ? (
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{secretsPartWords.values}</h4>
          <ul className={styles.grants}>
            {props.values.map((item) => (
              <GrantRow
                detail={valueDetail(item.who, item.when)}
                disabled={props.disabled}
                key={item.id}
                name={item.name}
                remove={() => props.removeValue(item)}
                what={`the value of ${item.name}`}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
