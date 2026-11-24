import { useRef } from 'react'
import { markMenuTitle } from '../../ui/components/explain/explainCopy'
import { MarkGlyph } from '../../ui/components/explain/MarkGlyph'
import type { FieldHandle } from '../components/chip-field/focus-plugins'
import type { MenuEntry } from '../ui/Menu'
import { PointMenu } from '../ui/PointMenu'
import { AskPopover } from './AskPopover'
import type { ExplainState, OpenPopover } from './explain-state'
import { waitsForMember, type Explanation } from './explanations'
import { ExplainPopover } from './ExplainPopover'
import styles from './explain.module.css'
import { PopoverChat, type PopoverChatProps } from './PopoverChat'
import { keepPopover } from './press-outside'

/**
 * The rows of the menu of overlapping marks: the state and the title of
 * each explanation, in the order that they started. A row opens the
 * popover of its explanation.
 */
function menuEntries(
  explanations: readonly Explanation[],
  ids: readonly string[],
  open: (id: string) => void,
): MenuEntry[] {
  return explanations
    .filter((explanation) => ids.includes(explanation.id))
    .map((explanation) => ({
      kind: 'item',
      key: explanation.id,
      label: explanation.title,
      mark: <MarkGlyph state={explanation.state} />,
      onSelect: () => open(explanation.id),
    }))
}

/** What the chat of the popover takes from the chat of the shown session. */
export type LayerChat = Omit<
  PopoverChatProps,
  'sessionId' | 'explanation' | 'onOpenSession' | 'onSend' | 'onRetry' | 'field'
>

/**
 * The popover of an explanation, with its actions. Expand shows the tab of
 * the session that the popover shows, and reopens it first when it is
 * closed. A follow-up sends the draft of that session, and Try again sends
 * the message of its failed turn again. When the Worker puts the message in
 * a linked session, the popover shows that session with the draft, while
 * it still shows the session of the request. The first line of that
 * session links back. A press on that link shows the explanation again.
 * When it takes the place of an unsent popover whose field had the focus,
 * its follow-up field takes the focus, so the member types on.
 */
function Popover(props: {
  popover: OpenPopover
  explanation: Explanation
  state: ExplainState
  chat: LayerChat
  stopAt: HTMLElement | null
}) {
  const { popover, state, chat } = props
  const { snapshot, controller } = chat
  const field = useRef<FieldHandle>(null)
  const shown = popover.sessionId
  const view = state.popoverView(popover.explanationId)
  const show = (sessionId: string) => {
    const open = snapshot.sessions.some((item) => item.id === sessionId)
    void (open ? controller.select(sessionId) : controller.reopen(sessionId))
  }
  return (
    <ExplainPopover
      anchor={state.anchor}
      field={popover.focusField ? field : undefined}
      mobile={chat.mobile}
      onClose={() => state.closePopover(true)}
      onPressOutside={() => state.closePopover(false)}
      onExpand={() => {
        state.closePopover(false)
        show(shown)
      }}
      quote={props.explanation.anchor.quote}
      stopAt={props.stopAt}
      title={props.explanation.title}
      waits={waitsForMember(snapshot, shown)}
    >
      <PopoverChat
        {...chat}
        explanation={shown === popover.explanationId}
        field={field}
        onOpenSession={(sessionId) =>
          sessionId === popover.explanationId
            ? view.show(sessionId)
            : show(sessionId)
        }
        onRetry={(messageId) => void controller.retry(shown, messageId, view)}
        onSend={() => void controller.followUp(shown, view)}
        sessionId={shown}
      />
    </ExplainPopover>
  )
}

/**
 * What Explain lays over the chat of the shown session tab: the popover of
 * the open explanation or the unsent popover of an Ask, and the menu of
 * overlapping marks, at the press on a computer and in a sheet on a phone.
 * A press anywhere in this layer keeps the popover, also in the menu, which
 * lies in a portal of its own, because React gives the press to the root of
 * the layer first.
 */
export function ExplainLayer(props: {
  state: ExplainState
  chat: LayerChat
  stopAt: HTMLElement | null
}) {
  const { state } = props
  const { popover, menu } = state
  const explanation =
    popover &&
    state.explanations.find((item) => item.id === popover.explanationId)
  return (
    <div
      className={styles.layer}
      onPointerDown={(event) => keepPopover(event.nativeEvent)}
    >
      {popover && explanation ? (
        <Popover
          chat={props.chat}
          explanation={explanation}
          key={popover.explanationId}
          popover={popover}
          state={state}
          stopAt={props.stopAt}
        />
      ) : null}
      {state.unsent ? (
        <AskPopover
          anchor={state.anchor}
          ask={state.unsent}
          mobile={props.chat.mobile}
          onChangeText={state.changeQuestion}
          onClose={state.closeAsk}
          onSend={state.sendQuestion}
          stopAt={props.stopAt}
        />
      ) : null}
      {menu ? (
        <PointMenu
          menu={{
            title: markMenuTitle,
            at: menu.at,
            entries: menuEntries(
              state.explanations,
              menu.ids,
              state.openPopover,
            ),
          }}
          mobile={props.chat.mobile}
          onClose={state.closeMenu}
        />
      ) : null}
    </div>
  )
}
