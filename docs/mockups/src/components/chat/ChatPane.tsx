import type { ReactNode } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import type { StartingLog } from '../../fixtures/starting'
import { defined, plainData } from '../../defined'
import { classes } from '../../../../../src/ui/components/common/classes'
import { DrawnChoices } from '../mac/CommandActions'
import { useMacApp } from '../../../../../src/ui/components/mac/MacApp'
import { sandboxBar } from '../../entries/components/workspace/SandboxNotice.mockup'
import type { BarNotice } from '../workspace/SandboxNotice'
import { replacesComposer } from '../../../../../src/ui/components/workspace/sandboxNoticeState'
import { startingCard } from '../../entries/components/workspace/StartingCard.mockup'
import { chatItemView } from '../../entries/components/chat/ChatItemView.mockup'
import { ChatPictures, type PictureRead } from './chatPictures'
import { composer as composerPart } from '../../entries/components/chat/Composer.mockup'
import { composerData } from '../../entries/components/chat/capabilitiesSlot'
import type { ComposerState } from './Composer'
import { groupItems } from './groupItems'
import { isPendingCommand } from './PendingCommand'
import { pendingCommand } from '../../entries/components/chat/PendingCommand.mockup'
import { isPendingRequest } from './requests'
import { SecretRequest } from './SecretRequest'
import { secretRunWords } from '../../../../../src/ui/components/chat/secretRunCopy'
import { toolGroup } from '../../entries/components/chat/ToolGroup.mockup'
import type { FoldState } from './WorkFold'
import { workFold } from '../../entries/components/chat/WorkFold.mockup'
import { noop } from '../../../../../src/ui/noop'
import { instanceKey } from '../../instanceKey'
import { ToBottomButton } from '../../../../../src/ui/components/chat/ToBottomButton'
import styles from '../../../../../src/ui/components/chat/ChatPane.module.css'

/**
 * The chat transcript, with the composer or a sandbox bar under it. While
 * the sandbox starts, its steps show at the end of the transcript. An empty
 * transcript shows `empty` instead. When a turn ends, the work before each
 * of its answers folds into one line. The commands that wait for approval
 * on a Mac, and the requests for secrets while their tool calls wait, leave
 * the transcript and stay in view just above the composer, in a region
 * that scrolls when they need more room. Once answered, a command or a run
 * shows at its place in the transcript. A request that outlived its tool
 * call stays at its place, as a late request. A small chat, such as the
 * popover of an explanation, is `compact`, and its `field` takes the place
 * of the composer. While the reader reads higher up, a round button above
 * the right end of the footer shows the bottom of the chat.
 */
export function ChatPane(props: {
  items: readonly ChatItem[]
  composer?: ComposerState
  /**
   * The box under the chat in place of the composer, such as the follow-up
   * field of a popover. `null` shows no box, as a read-only popover does.
   */
  field?: ReactNode
  /** Less room around the transcript and the footer, with no column width. */
  compact?: boolean
  /**
   * The ID of a message that the chat leaves out, such as the written
   * prompt of an explanation in its popover. It still starts its turn, so
   * the work of that turn folds.
   */
  hide?: string
  /**
   * The sandbox is not running: the bar takes the place of the composer. A
   * failed first start keeps the composer under its bar, so members can
   * still queue messages. A failed start carries its saved message, and a
   * refused start its reason, and an archived workspace its days.
   */
  problem?: BarNotice
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
  /**
   * The chat starts at its top, as the popover of an explanation shows the
   * top of the answer of an ended turn. A view runs no script, so the line
   * of the fold over the answer shows too.
   */
  fromTop?: boolean
  /**
   * The reads of the pictures of the answers. The chat reads pictures only
   * while the cloud computer runs. Without reads, each shows as its link.
   */
  pictures?: PictureRead
  /** The reader reads higher up, so the button to the bottom shows. */
  scrolledUp?: boolean
}) {
  const mac = useMacApp()
  const empty = props.items.length === 0 && !props.starting
  const composer = !props.problem || !replacesComposer(props.problem)
  const pending = props.items.filter(isPendingRequest)
  const commands = pending.filter(isPendingCommand)
  const transcript = props.items.filter((item) => !isPendingRequest(item))
  const entries = groupItems(transcript).filter(
    (entry) => entry.kind !== 'item' || entry.item.id !== props.hide,
  )
  const fold = props.fold ?? 'closed'
  const box = props.composer ? composerData(props.composer) : null
  const field =
    props.field !== undefined ? (
      props.field
    ) : box ? (
      <composerPart.Component
        moklyInstance="composer"
        {...box.composer}
        {...defined({
          capabilitiesPanel: box.capabilitiesPanel,
          pickerPart: box.pickerPart,
        })}
      />
    ) : null
  return (
    <section
      aria-label="Chat"
      className={classes(
        styles.chat,
        props.viewport === 'mobile' && styles.mobile,
        props.compact && styles.compact,
      )}
    >
      {empty && props.empty ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div
          className={classes(
            styles.scroll,
            (fold !== 'closed' || props.fromTop) && styles.fromTop,
          )}
          data-mokly-scroll="chat-transcript"
        >
          <div className={styles.transcript}>
            <ChatPictures read={props.pictures}>
              {entries.map((entry) => {
                switch (entry.kind) {
                  case 'tools':
                    return (
                      <toolGroup.Component
                        calls={entry.calls}
                        key={entry.id}
                        moklyInstance={`tools-${instanceKey(entry.id)}`}
                        open={entry.open}
                      />
                    )
                  case 'work':
                    return (
                      <workFold.Component
                        key={entry.id}
                        moklyInstance={instanceKey(entry.id)}
                        state={fold}
                        steps={entry.steps}
                        viewer={props.viewer}
                      />
                    )
                  case 'item':
                    return (
                      <chatItemView.Component
                        item={entry.item}
                        key={entry.item.id}
                        moklyInstance={`item-${instanceKey(entry.item.id)}`}
                        viewer={props.viewer}
                      />
                    )
                }
              })}
            </ChatPictures>
            {props.starting ? (
              <startingCard.Component
                log={props.starting}
                moklyInstance="starting-card"
              />
            ) : null}
          </div>
        </div>
      )}
      <div className={styles.footer}>
        {props.scrolledUp && !(empty && props.empty) ? (
          <ToBottomButton onPress={noop} />
        ) : null}
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
                <pendingCommand.Component
                  id={item.id}
                  key={item.id}
                  moklyInstance={`pending-${instanceKey(item.id)}`}
                  open={mac?.choicesOpen === true && item === commands[0]}
                  request={item.request}
                />
              )
            })}
          </div>
        ) : null}
        {mac?.choicesOpen && commands.length > 0 ? <DrawnChoices /> : null}
        {props.notice}
        {props.problem ? (
          <sandboxBar.Component
            moklyInstance="sandbox-bar"
            state={plainData(props.problem)}
          />
        ) : null}
        {composer ? field : null}
      </div>
    </section>
  )
}
