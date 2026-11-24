import { useRef } from 'react'
import {
  askLabel,
  popoverChatLabel,
} from '../../ui/components/explain/explainCopy'
import { ChatPane } from '../components/ChatPane'
import type { FieldHandle } from '../components/chip-field/focus-plugins'
import { canSend, type UnsentAsk } from './ask-state'
import { AskField } from './AskField'
import { ExplainPopover } from './ExplainPopover'

/** The unsent popover sent no message, so its chat waits for none. */
const noneSent: readonly string[] = []

/**
 * The unsent popover of an Ask: the popover of an explanation, with the
 * quote and Close in its header and no Expand, because no tab exists before
 * Send. Its chat is empty, screen readers hear Ask as its name, and the
 * field of the question takes the focus as it opens. Send is off while the
 * field holds only white space, and busy while the start waits. On a
 * computer it keeps to the box over the kept quote, and on a phone it is
 * the sheet at half height. While the cloud computer does not run, the
 * field stays, because Send starts the cloud computer.
 */
export function AskPopover(props: {
  ask: UnsentAsk
  /** The box over the kept quote, if it shows. */
  anchor: HTMLElement | null
  mobile: boolean
  stopAt: HTMLElement | null
  onChangeText: (text: string) => void
  onSend: () => void
  onClose: () => void
}) {
  const field = useRef<FieldHandle>(null)
  const { ask } = props
  return (
    <ExplainPopover
      anchor={props.anchor}
      field={field}
      mobile={props.mobile}
      onClose={() => {
        props.onClose()
        props.stopAt?.focus({ preventScroll: true })
      }}
      onPressOutside={props.onClose}
      quote={ask.kept.quote}
      stopAt={props.stopAt}
      title={askLabel}
      waits={false}
    >
      <ChatPane
        compact
        footer={
          <AskField
            handle={field}
            onChangeText={props.onChangeText}
            onSend={props.onSend}
            ready={canSend(ask)}
            sending={ask.question !== null}
            text={ask.text}
          />
        }
        label={popoverChatLabel}
        mobile={props.mobile}
        sent={noneSent}
      />
    </ExplainPopover>
  )
}
