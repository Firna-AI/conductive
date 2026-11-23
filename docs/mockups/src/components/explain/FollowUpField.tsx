import { SendButton, StopButton } from '../chat/ComposerButtons'
import { MessageField } from '../chat/MessageField'
import { Linked } from '../common/ScreenLink'
import { followUpPlaceholder } from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/FollowUpField.module.css'

/**
 * The follow-up field at the foot of the popover: a message box of one
 * line, which grows to four, then Stop while a turn of the explanation
 * runs, and Send. A follow-up is a message of the session, as in its tab,
 * so while a turn runs it steers that turn. The explanation keeps its
 * model, so the field has no model picker. Expand gives the whole composer
 * of the tab, with files and Capabilities.
 */
export function FollowUpField(props: {
  running: boolean
  draft?: string
  /** The screen that Send shows, when the mockups draw it. */
  sendTo?: string
}) {
  const draft = props.draft ?? ''
  return (
    <div className={styles.field}>
      <div className={styles.text}>
        <MessageField
          lines={1}
          maxLines={4}
          placeholder={followUpPlaceholder}
          text={draft}
        />
      </div>
      {props.running ? <StopButton /> : null}
      <Linked to={props.sendTo}>
        <SendButton draft={draft} />
      </Linked>
    </div>
  )
}
