import { useRef } from 'react'
import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import chips from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { Attachment } from '../../shared/messages'
import { IconButton } from '../ui/actions'
import { ModelPicker } from '../ui/ModelPicker'
import ui from '../ui/ui.module.css'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The files attached to the first message, each with a way to remove it. */
function AttachmentList(props: {
  attachments: readonly Attachment[]
  remove: (id: string) => void
}) {
  return (
    <ul aria-label="Attached files" className={chips.chips}>
      {props.attachments.map((file) => {
        const Icon = file.kind === 'image' ? ImageIcon : FileText
        return (
          <li className={chips.chip} key={file.id}>
            <Icon aria-hidden className={chips.icon} size={13} />
            <span className={chips.name}>{file.name}</span>
            <span className={chips.size}>{formatSize(file.sizeBytes)}</span>
            <IconButton
              icon={X}
              label={`Remove ${file.name}`}
              onPress={() => props.remove(file.id)}
              quiet
            />
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The composer of a new workspace: attached files above the text, then the
 * attach button, the model and effort picker, and Send. Send is off while
 * the text is empty, while a notice blocks the message, and while it sends.
 */
export function Composer(props: {
  model: NewWorkspaceModel
  choice: AgentChoice | undefined
  models: readonly AgentModel[]
  blocked: boolean
  send: () => void
}) {
  const control = useControlSizes()
  const draft = useStore(props.model.draft)
  const upload = useStore(props.model.upload)
  const create = useStore(props.model.create)
  const files = useRef<HTMLInputElement>(null)
  const sending = create.state === 'sending'
  const off =
    draft.text.trim() === '' ||
    props.blocked ||
    upload.pending > 0 ||
    !props.choice
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        {draft.attachments.length > 0 ? (
          <AttachmentList
            attachments={draft.attachments}
            remove={(id) => props.model.detach(id)}
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
            disabled={off}
            icon={ArrowUp}
            onPress={props.send}
            shape="square"
            size="sm"
            tone={off ? 'secondary' : 'primary'}
          />
        </div>
      </div>
      {upload.error ? (
        <p className={ui.error} role="alert">
          {`The file wasn't attached. ${upload.error.message}`}
        </p>
      ) : null}
    </div>
  )
}
