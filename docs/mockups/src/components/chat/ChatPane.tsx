import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { ChatItem } from '../../fixtures/conversations'
import type { StartingLog } from '../../fixtures/starting'
import { classes } from '../common/classes'
import { SandboxBar, type SandboxProblem } from '../workspace/SandboxNotice'
import { StartingCard } from '../workspace/StartingCard'
import { ChatItemView } from './ChatItemView'
import { Composer, type ComposerState } from './Composer'
import { groupItems } from './groupItems'
import { ToolGroup } from './ToolGroup'
import styles from './ChatPane.module.css'

/**
 * The chat transcript, with the composer or a sandbox bar under it. While
 * the sandbox starts, its steps show at the end of the transcript. An empty
 * transcript shows `empty` instead.
 */
export function ChatPane(props: {
  items: readonly ChatItem[]
  composer: ComposerState
  problem?: SandboxProblem
  starting?: StartingLog
  empty?: ReactNode
  /** A message above the composer, such as a failed create. */
  notice?: ReactNode
  viewport: Viewport
}) {
  const empty = props.items.length === 0 && !props.starting
  return (
    <section
      aria-label="Chat"
      className={classes(
        styles.chat,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      {empty && props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.scroll} data-mokly-scroll="chat-transcript">
          <div className={styles.transcript}>
            {groupItems(props.items).map((entry) =>
              entry.kind === 'tools' ? (
                <ToolGroup calls={entry.calls} key={entry.id} />
              ) : (
                <ChatItemView item={entry.item} key={entry.item.id} />
              ),
            )}
            {props.starting ? <StartingCard log={props.starting} /> : null}
          </div>
        </div>
      )}
      <div className={styles.footer}>
        {props.notice}
        {props.problem ? (
          <SandboxBar problem={props.problem} />
        ) : (
          <Composer {...props.composer} />
        )}
      </div>
    </section>
  )
}
