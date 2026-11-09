import { useRef } from 'react'
import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, Paperclip } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import {
  DraftFiles,
  OversizeNotice,
} from '../../chat/components/AttachmentChips'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import { IconButton } from '../ui/actions'
import { ModelPicker } from '../ui/ModelPicker'
import ui from '../ui/ui.module.css'

/**
 * The composer of a new workspace: attached files above the text, then the
 * attach button, the model and effort picker, and Send. The files upload
 * before the workspace exists, with the chips and the notice of the
 * workspace chat. Send is off until the message can go, as the screen
 * decides for Send and Try again. While the create runs, the text and the
 * attach button are off.
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
  const files = useRef<HTMLInputElement>(null)
  const sending = create.state === 'sending'
  return (
    <>
      <OversizeNotice
        onAttach={() => files.current?.click()}
        refused={draft.refused}
      />
      <div className={styles.wrap}>
        <div className={styles.composer}>
          {draft.files.length > 0 ? (
            <DraftFiles
              files={draft.files}
              onRemove={(id) => props.model.removeFile(id)}
              onRetry={(id) => void props.model.retryFile(id)}
            />
          ) : null}
          <InputFrame
            accessibilityLabel="Message"
            editable={!sending}
            focusIndicator="none"
            maxLines={8}
            multiline
            numberOfLines={2}
            onChangeText={(text) => props.model.setText(text)}
            placeholder="Describe the task"
            size={control.field}
            value={draft.text}
            variant="seamless"
          />
          <div className={styles.bar}>
            <IconButton
              disabled={sending}
              icon={Paperclip}
              label="Attach files"
              onPress={() => files.current?.click()}
            />
            <input
              className={ui.hidden}
              multiple
              onChange={(event) => {
                const chosen = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                if (chosen.length > 0) void props.model.attach(chosen)
              }}
              ref={files}
              tabIndex={-1}
              type="file"
            />
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
      </div>
    </>
  )
}
