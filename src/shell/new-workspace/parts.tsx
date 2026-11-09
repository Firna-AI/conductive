import { useRef } from 'react'
import {
  ChevronDown,
  FileText,
  FolderGit2,
  ImageIcon,
  Paperclip,
  X,
} from 'lucide-react'
import chips from '../../../docs/mockups/src/components/chat/AttachmentChips.module.css'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import type { ApiError } from '../../app/api/client'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import type { Attachment } from '../../shared/messages'
import type { Repository } from '../../shared/org-settings'
import { ActionButton, IconButton, type ActionTone } from '../ui/actions'
import { MenuButton } from '../ui/Menu'
import ui from '../ui/ui.module.css'

// The parts of a New workspace form that the page and the dialog share.

/** The repository of the new workspace, as a menu of the chosen ones. */
export function RepositoryMenu(props: {
  repositories: readonly Repository[]
  chosen: Repository
  choose: (id: string) => void
  /** The look of the button. The page uses the default, the dialog `plain`. */
  tone?: ActionTone
  /** The class of the chevron, from the CSS of the page or of the dialog. */
  chevron: string
}) {
  const { chosen } = props
  return (
    <MenuButton
      entries={props.repositories.map((item) => ({
        kind: 'item',
        label: item.fullName,
        checked: item.id === chosen.id,
        onSelect: () => props.choose(item.id),
      }))}
      label="Repository"
      placement="below-start"
      trigger={({ open, toggle }) => (
        <ActionButton
          accessibilityLabel={`Repository: ${chosen.fullName}`}
          expanded={open}
          icon={FolderGit2}
          menu
          onPress={toggle}
          tone={props.tone}
          trailing={
            <ChevronDown aria-hidden className={props.chevron} size={13} />
          }
        >
          {chosen.fullName}
        </ActionButton>
      )}
    />
  )
}

/** The files attached to the first message, each with a way to remove it. */
export function AttachmentList(props: {
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

/** The attach button with its file picker. It is off while the create runs. */
export function AttachButton(props: {
  model: NewWorkspaceModel
  disabled: boolean
}) {
  const files = useRef<HTMLInputElement>(null)
  return (
    <>
      <IconButton
        disabled={props.disabled}
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
    </>
  )
}

/** The error of the last file that did not upload. */
export function UploadError(props: { error: ApiError | null }) {
  if (!props.error) return null
  return (
    <p className={ui.error} role="alert">
      {`The file wasn't attached. ${props.error.message}`}
    </p>
  )
}
