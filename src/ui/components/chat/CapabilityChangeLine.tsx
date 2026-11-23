import { Fragment } from 'react'
import { Blocks } from 'lucide-react'
import {
  capabilityChangeWords,
  type CapabilityChange,
} from './capabilityChangeCopy'
import lineStyles from './LinkedLine.module.css'
import styles from './LateAnswerLine.module.css'

/**
 * The note of a change of the capabilities of the workspace, in each
 * session whose facts it changed (capability prompts decision 4 B). It
 * shows at the time of the change, as the note of Continue, not in a turn,
 * and it does not fold with the work of a turn. It names the member and
 * each change, with each secret in code style, never a value. The agent
 * gets the same words. It is a line of the app, with the Capabilities
 * icon. `who` is "You" for the member who made the change. It takes no
 * fixtures, so the app can use it too.
 */
export function CapabilityChangeLine(props: {
  who: string
  changes: readonly CapabilityChange[]
}) {
  const pieces = capabilityChangeWords(props.who, props.changes)
  return (
    <p className={lineStyles.line}>
      <Blocks aria-hidden className={lineStyles.icon} size={13} />
      <span>
        {pieces.map((piece, index) => (
          <Fragment key={index}>
            {typeof piece === 'string' ? (
              piece
            ) : (
              <code className={styles.name}>{piece.name}</code>
            )}
          </Fragment>
        ))}
      </span>
    </p>
  )
}
