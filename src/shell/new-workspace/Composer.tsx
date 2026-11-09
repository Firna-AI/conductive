import { Button } from '@firna/ui/button'
import { ArrowUp } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import { ChipTextField } from '../../chat/components/chip-field/ChipTextField'
import { useSendKey } from '../../chat/components/send-key'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import { ModelPicker } from '../ui/ModelPicker'
import { AttachButton, AttachmentList, UploadError } from './parts'

/**
 * The composer of a new workspace: attached files above the text, then the
 * attach button, the model and effort picker, and Send. Send is off until
 * the message can go, as the screen decides for Send and Try again. Enter
 * sends as in every composer: on a computer, Enter sends and Shift+Enter
 * adds a line. While the create runs, the text and the attach button are
 * off. A kept message shows with the cursor at its end. A pasted workspace
 * link shows as a chip, which `OrgLinks` finds.
 */
export function Composer(props: {
  model: NewWorkspaceModel
  choice: AgentChoice | undefined
  models: readonly AgentModel[]
  /** Whether the message can go now. */
  ready: boolean
  send: () => void
}) {
  const control = useControlSizes()
  const draft = useStore(props.model.draft)
  const create = useStore(props.model.create)
  const sending = create.state === 'sending'
  const sendKey = useSendKey(props.ready, props.send)
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        {draft.attachments.length > 0 ? (
          <AttachmentList
            attachments={draft.attachments}
            remove={(id) => props.model.detach(id)}
          />
        ) : null}
        <ChipTextField
          caretAtEnd
          editable={!sending}
          label="Message"
          lines={2}
          maxLines={8}
          onChangeText={(text) => props.model.setText(text)}
          onEnter={sendKey}
          placeholder="Describe the task"
          value={draft.text}
        />
        <div className={styles.bar}>
          <AttachButton disabled={sending} model={props.model} />
          {props.choice ? (
            <ModelPicker
              change={(choice) => props.model.setChoice(choice)}
              choice={props.choice}
              models={props.models}
            />
          ) : null}
          <span className={styles.spacer} />
          <Button
            accessibilityLabel="Send"
            boxSize={control.height}
            busy={sending}
            disabled={!props.ready}
            icon={ArrowUp}
            onPress={props.send}
            shape="square"
            size="sm"
            tone={props.ready ? 'primary' : 'secondary'}
          />
        </div>
      </div>
      <UploadError error={draft.upload.error} />
    </div>
  )
}
