import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import type { StartingLog } from '../../fixtures/starting'
import { classes } from '../common/classes'
import { DrawnChoices } from '../mac/CommandActions'
import { useMacApp } from '../mac/MacApp'
import { SandboxBar } from '../workspace/SandboxNotice'
import {
  replacesComposer,
  type SandboxNoticeState,
} from '../workspace/sandboxNoticeState'
import { StartingCard } from '../workspace/StartingCard'
import { ChatItemView } from './ChatItemView'
import { Composer, type ComposerState } from './Composer'
import { groupItems } from './groupItems'
import { isPendingCommand, PendingCommand } from './PendingCommand'
import { isPendingRequest } from './requests'
import { SecretRequest } from './SecretRequest'
import { secretRunWords } from './secretRunCopy'
import { ToolGroup } from './ToolGroup'
import { WorkFold, type FoldState } from './WorkFold'
import styles from './ChatPane.module.css'

/**
 * The chat transcript, with the composer or a sandbox bar under it. While
 * the sandbox starts, its steps show at the end of the transcript. An empty
 * transcript shows `empty` instead. When a turn ends, the work before each
 * of its answers folds into one line. The commands that wait for approval
 * on a Mac, and the requests for secrets while their tool calls wait, leave
 * the transcript and stay in view just above the composer, in a region
 * that scrolls when they need more room. Once answered, a command or a run
 * shows at its place in the transcript. A request that outlived its tool
 * call stays at its place, as a late request.
 */
export function ChatPane(props: {
  items: readonly ChatItem[]
  composer: ComposerState
  /**
   * The sandbox is not running: the bar takes the place of the composer. A
   * failed first start keeps the composer under its bar, so members can
   * still queue messages. A failed start carries its saved message, and a
   * refused start its reason.
   */
  problem?: SandboxNoticeState
  starting?: StartingLog
  empty?: ReactNode
  /** A message above the composer, such as a failed create. */
  notice?: ReactNode
  /** The person signed in. A stopped turn says "You" if they pressed Stop. */
  viewer: PersonKey
  viewport: Viewport
  /**
   * How the folds of the ended turns show. They start closed. A chat with
   * open folds starts at its top.
   */
  fold?: FoldState
}) {
  const mac = useMacApp()
  const empty = props.items.length === 0 && !props.starting
  const composer = !props.problem || !replacesComposer(props.problem)
  const pending = props.items.filter(isPendingRequest)
  const commands = pending.filter(isPendingCommand)
  const transcript = props.items.filter((item) => !isPendingRequest(item))
  const fold = props.fold ?? 'closed'
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
        <div
          className={classes(
            styles.scroll,
            fold !== 'closed' && styles.fromTop,
          )}
          data-mokly-scroll="chat-transcript"
        >
          <div className={styles.transcript}>
            {groupItems(transcript).map((entry) => {
              switch (entry.kind) {
                case 'tools':
                  return (
                    <ToolGroup
                      calls={entry.calls}
                      open={entry.open}
                      key={entry.id}
                    />
                  )
                case 'work':
                  return (
                    <WorkFold
                      key={entry.id}
                      state={fold}
                      steps={entry.steps}
                      viewer={props.viewer}
                    />
                  )
                case 'item':
                  return (
                    <ChatItemView
                      item={entry.item}
                      key={entry.item.id}
                      viewer={props.viewer}
                    />
                  )
              }
            })}
            {props.starting ? <StartingCard log={props.starting} /> : null}
          </div>
        </div>
      )}
      <div className={styles.footer}>
        {pending.length > 0 ? (
          <div
            aria-label={secretRunWords.region}
            className={styles.requests}
            role="group"
          >
            {pending.map((item) => {
              if (item.kind === 'secret-run') {
                return (
                  <SecretRequest
                    item={item}
                    key={item.id}
                    viewer={props.viewer}
                  />
                )
              }
              if (!isPendingCommand(item)) return null
              return (
                <PendingCommand
                  key={item.id}
                  open={mac?.choicesOpen === true && item === commands[0]}
                  request={item.request}
                />
              )
            })}
          </div>
        ) : null}
        {mac?.choicesOpen && commands.length > 0 ? <DrawnChoices /> : null}
        {props.notice}
        {props.problem ? <SandboxBar {...props.problem} /> : null}
        {composer ? <Composer {...props.composer} /> : null}
      </div>
    </section>
  )
}
