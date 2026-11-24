import type { Ref } from 'react'
import { filesWait } from '../../app/draft-files'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import type { FieldFiles } from '../components/chip-field/attached-files'
import { ChipTextField } from '../components/chip-field/ChipTextField'
import type { FieldHandle } from '../components/chip-field/focus-plugins'
import { SendButton, StopButton } from '../components/ComposerButtons'
import { useSendKey } from '../components/send-key'
import type { Draft } from '../state/chat-snapshot'
import {
  followUpLabel,
  followUpPlaceholder,
} from '../../ui/components/explain/explainCopy'
import styles from '../../ui/components/explain/FollowUpField.module.css'

/**
 * The follow-up field at the foot of the popover: a message box of one
 * line, which grows to four, then Stop while a turn of the session runs,
 * and Send. A follow-up is a message of the session, as in its tab, so
 * while a turn runs it steers that turn. The field keeps the draft of the
 * session, which its tab shows too. It has no model picker and no attach
 * button, because Expand gives the whole composer of the tab. Stop the
 * agent stops the turn of this session while the field shows it.
 */
export function FollowUpField(props: {
  draft: Draft
  files: FieldFiles
  running: boolean
  stopping: boolean
  /** A notice says why a message cannot go yet, so Send is off. */
  blocked: boolean
  /** The handle that moves the focus into the field. */
  handle?: Ref<FieldHandle>
  onChangeText: (text: string) => void
  onSend: () => void
  onStop: () => void
}) {
  const { draft } = props
  const empty = draft.text.trim() === '' && draft.files.length === 0
  const off = empty || props.blocked || draft.sending || filesWait(draft.files)
  const sendKey = useSendKey(!off, props.onSend)
  useShortcutOffer(
    'stop-agent',
    props.running && !props.stopping ? props.onStop : null,
  )
  return (
    <div className={styles.field}>
      <div className={styles.text}>
        <ChipTextField
          caretAtEnd
          files={props.files}
          handle={props.handle}
          label={followUpLabel}
          lines={1}
          maxLines={4}
          onChangeText={props.onChangeText}
          onEnter={sendKey}
          owner={draft.id}
          placeholder={followUpPlaceholder}
          value={draft.text}
        />
      </div>
      {props.running ? (
        <StopButton onStop={props.onStop} stopping={props.stopping} />
      ) : null}
      <SendButton off={off} onSend={props.onSend} sending={draft.sending} />
    </div>
  )
}
