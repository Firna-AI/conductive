import { CodeView } from '../components/files/CodeView'
import {
  FilePeek,
  FilePreviewDialog,
  NoPreview,
  PeekPicture,
  PeekText,
  PreviewPicture,
  PreviewTooLarge,
} from '../components/chat/FilePreview'
import { closePreviewLabel } from '../components/chat/attachmentCopy'
import { IconButton } from '../components/common/actions'
import {
  consoleLogText,
  previewFiles,
  type Attachment,
} from '../fixtures/attachments'
import { CheckoutPicture, screenshotSize } from '../fixtures/pictures'
import { X } from 'lucide-react'

/** The files of the draft whose preview a view opens. */
export type PreviewedFile =
  'screenshot' | 'console-log' | 'folder-zip' | 'large-log'

/** The lines of the console log that the card of the pointer shows. */
const peekLines = 6

/** The card of a pointer that rests on the chip of a file of the draft. */
export function attachmentPeek(file: Attachment) {
  if (file.kind === 'image') {
    return (
      <FilePeek file={file}>
        <PeekPicture>
          <CheckoutPicture label={file.name} overlap />
        </PeekPicture>
      </FilePeek>
    )
  }
  const lines = consoleLogText.split('\n').slice(0, peekLines).join('\n')
  return (
    <FilePeek file={file}>
      <PeekText text={lines} />
    </FilePeek>
  )
}

/** The body of the preview of each file. */
function bodyOf(file: PreviewedFile) {
  switch (file) {
    case 'screenshot':
      return (
        <PreviewPicture size={screenshotSize}>
          <CheckoutPicture label={previewFiles.screenshot.name} overlap />
        </PreviewPicture>
      )
    case 'console-log':
      return <CodeView code={consoleLogText.trimEnd()} />
    case 'folder-zip':
      return <NoPreview />
    case 'large-log':
      return <PreviewTooLarge />
  }
}

const fileOf: Record<PreviewedFile, Attachment> = {
  screenshot: previewFiles.screenshot,
  'console-log': previewFiles.consoleLog,
  'folder-zip': previewFiles.folderZip,
  'large-log': previewFiles.serverLog,
}

/** The dialog of the preview of a file of the draft, over the workspace. */
export function AttachmentPreview(props: { file: PreviewedFile }) {
  return (
    <FilePreviewDialog
      close={<IconButton icon={X} label={closePreviewLabel} quiet />}
      file={fileOf[props.file]}
    >
      {bodyOf(props.file)}
    </FilePreviewDialog>
  )
}
