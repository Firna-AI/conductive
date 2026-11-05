import type { Viewport } from '@mokly/mokly'
import type { ChatItem } from '../../fixtures/conversations'
import { SandboxBar, type SandboxProblem } from '../workspace/SandboxNotice'
import { ChatItemView } from './ChatItemView'
import { Composer, type ComposerState } from './Composer'
import styles from './ChatPane.module.css'

/** The chat transcript, with the composer or a sandbox bar under it. */
export function ChatPane(props: {
  items: readonly ChatItem[]
  composer: ComposerState
  problem?: SandboxProblem
  viewport: Viewport
}) {
  const className =
    props.viewport === 'mobile'
      ? `${styles.chat} ${styles.mobile}`
      : styles.chat
  return (
    <section aria-label="Chat" className={className}>
      <div className={styles.scroll} data-mokly-scroll="chat-transcript">
        <div className={styles.transcript}>
          {props.items.map((item) => (
            <ChatItemView item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div className={styles.footer}>
        {props.problem ? (
          <SandboxBar problem={props.problem} />
        ) : (
          <Composer {...props.composer} />
        )}
      </div>
    </section>
  )
}
