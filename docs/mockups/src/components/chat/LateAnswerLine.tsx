import { KeyRound } from 'lucide-react'
import type { MemberGrant } from '../../fixtures/secretRequests'
import { lateAnswerWords } from './secretRunCopy'
import lineStyles from './LinkedLine.module.css'
import styles from './LateAnswerLine.module.css'

/**
 * The line of a late Allow, at the place where its turn starts (secrets
 * decision 10 B): the member who answered, each secret, and what the
 * answer gives, never a value. It is a line of the app, not a message of
 * that member, because the turn acts for the sender of the turn that
 * asked. `who` is "You" for the member who answered. It takes no
 * fixtures, so the app can use it too.
 */
export function LateAnswerLine(props: {
  names: readonly string[]
  grant: MemberGrant
  who: string
  org: string
}) {
  const words = lateAnswerWords(
    props.grant,
    props.who,
    props.names.length,
    props.org,
  )
  return (
    <p className={lineStyles.line}>
      <KeyRound aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {words.lead}{' '}
        {props.names.map((name, index) => (
          <span key={name}>
            {index > 0 ? ', ' : null}
            <code className={styles.name}>{name}</code>
          </span>
        ))}{' '}
        {words.tail}
      </span>
    </p>
  )
}
