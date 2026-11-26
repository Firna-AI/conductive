import { Fragment } from 'react'
import { KeyRound } from 'lucide-react'
import styles from '../../ui/components/chat/LateAnswerLine.module.css'
import lineStyles from '../../ui/components/chat/LinkedLine.module.css'
import type { LateAnswerPart } from '../../shared/secret-late-answer'

/**
 * The line of a late Allow, at the place where its turn starts (secrets
 * decision 10 B): the member who answered, each secret, and what the answer
 * gives, never a value. It is a line of the app, not a message of that
 * member. Without the request of the answer, it shows the text that the
 * Worker gave the agent.
 */
export function LateAnswerLine(props: {
  parts: readonly LateAnswerPart[] | null
  text: string
}) {
  return (
    <p className={lineStyles.line}>
      <KeyRound aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {props.parts === null
          ? props.text
          : props.parts.map((part, index) => (
              <Fragment key={part.lead}>
                {index > 0 ? ' ' : null}
                {part.lead}{' '}
                {part.names.map((name, place) => (
                  <Fragment key={name}>
                    {place > 0 ? ', ' : null}
                    <code className={styles.name}>{name}</code>
                  </Fragment>
                ))}{' '}
                {part.tail}
              </Fragment>
            ))}
      </span>
    </p>
  )
}
