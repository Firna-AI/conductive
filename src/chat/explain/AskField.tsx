import { useState, type Ref } from 'react'
import { ChipTextField } from '../components/chip-field/ChipTextField'
import type { FieldHandle } from '../components/chip-field/focus-plugins'
import { SendButton } from '../components/ComposerButtons'
import { useSendKey } from '../components/send-key'
import { MentionsProvider } from '../mentions/MentionsContext'
import {
  askPlaceholder,
  questionLabel,
} from '../../ui/components/explain/explainCopy'
import styles from '../../ui/components/explain/FollowUpField.module.css'

/**
 * The field of the unsent popover, where the member writes the question: a
 * message box of one line, which grows to four, then Send. It looks as the
 * follow-up field looks. Its owner holds its text, because no session holds
 * a draft before Send, and it takes text only, with no attach button and no
 * model picker. It lies outside the files of the chat, so `@` opens no list
 * of files, and Enter, Tab, and Escape stay with the field. The field takes
 * text also while the start waits, and Send is busy then.
 */
export function AskField(props: {
  text: string
  /** Send is on, as `canSend` says. */
  ready: boolean
  /** The start of the question waits for its reply. */
  sending: boolean
  /** The handle that moves the focus into the field. */
  handle: Ref<FieldHandle>
  onChangeText: (text: string) => void
  onSend: () => void
}) {
  // One owner while the field shows, so a new text, such as the empty field
  // after Send, keeps the focus and starts a new history of undo.
  const [owner] = useState(() => ({}))
  const sendKey = useSendKey(props.ready, props.onSend)
  return (
    <div className={styles.field}>
      <div className={styles.text}>
        <MentionsProvider value={null}>
          <ChipTextField
            caretAtEnd
            handle={props.handle}
            label={questionLabel}
            lines={1}
            maxLines={4}
            onChangeText={props.onChangeText}
            onEnter={sendKey}
            owner={owner}
            placeholder={askPlaceholder}
            value={props.text}
          />
        </MentionsProvider>
      </div>
      <SendButton
        off={!props.ready}
        onSend={props.onSend}
        sending={props.sending}
      />
    </div>
  )
}
