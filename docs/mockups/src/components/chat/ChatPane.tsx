import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import type { StartingLog } from '../../fixtures/starting'
import { classes } from '../common/classes'
import { DrawnChoices } from '../mac/CommandActions'
import { useMacApp } from '../mac/MacApp'
import { SandboxBar, type SandboxProblem } from '../workspace/SandboxNotice'
import { StartingCard } from '../workspace/StartingCard'
import { ChatItemView } from './ChatItemView'
import { Composer, type ComposerState } from './Composer'
import { groupItems } from './groupItems'
import { isPendingCommand, PendingCommand } from './PendingCommand'
import { ToolGroup } from './ToolGroup'
import styles from './ChatPane.module.css'

/**
 * The chat transcript, with the composer or a sandbox bar under it. While
 * the sandbox starts, its steps show at the end of the transcript. An empty
 * transcript shows `empty` instead. The commands that wait for approval on
 * a Mac leave the transcript and stay in view just above the composer, in a
 * region that scrolls when they need more room. Once answered, a command
 * shows at its place in the transcript.
 */
export function ChatPane(props: {
  items: readonly ChatItem[]
  composer: ComposerState
  problem?: SandboxProblem
  starting?: StartingLog
  empty?: ReactNode
  /** A message above the composer, such as a failed create. */
  notice?: ReactNode
  /** The person signed in. A stopped turn says "You" if they pressed Stop. */
  viewer: PersonKey
  viewport: Viewport
}) {
  const mac = useMacApp()
  const empty = props.items.length === 0 && !props.starting
  const pending = props.items.filter(isPendingCommand)
  const transcript = props.items.filter((item) => !isPendingCommand(item))
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
            {groupItems(transcript).map((entry) =>
              entry.kind === 'tools' ? (
                <ToolGroup calls={entry.calls} key={entry.id} />
              ) : (
                <ChatItemView
                  item={entry.item}
                  key={entry.item.id}
                  viewer={props.viewer}
                />
              ),
            )}
            {props.starting ? <StartingCard log={props.starting} /> : null}
          </div>
        </div>
      )}
      <div className={styles.footer}>
        {pending.length > 0 ? (
          <div
            aria-label="Commands that wait for an answer"
            className={styles.requests}
            role="group"
          >
            {pending.map((item, index) => (
              <PendingCommand
                key={item.id}
                open={mac?.choicesOpen === true && index === 0}
                request={item.request}
              />
            ))}
          </div>
        ) : null}
        {mac?.choicesOpen && pending.length > 0 ? <DrawnChoices /> : null}
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
