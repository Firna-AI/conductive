import { useEffect, useRef, type RefObject, type SyntheticEvent } from 'react'
import { X } from 'lucide-react'
import type { ChipFile } from '../../../../docs/mockups/src/components/chat/attachedFileParts'
import { closePreviewLabel } from '../../../../docs/mockups/src/components/chat/attachmentCopy'
import {
  FilePeek,
  FilePreviewDialog,
  NoPreview,
  PeekPicture,
  PeekText,
  PreviewPicture,
  PreviewTooLarge,
} from '../../../../docs/mockups/src/components/chat/FilePreview'
import { CodeView } from '../../../files/code/CodeView'
import { LoadingFile } from '../../../files/ui/FileStates'
import { IconButton } from '../../../shell/ui/actions'
import {
  Overlay,
  useEscapeLayer,
  useLayerFocus,
} from '../../../shell/ui/Overlay'
import { PopoverSurface } from '../../../shell/ui/PopoverSurface'
import { trapTab } from '../../../shell/ui/Sheet'
import { useLocalPreview, type LocalPreview } from './local-preview'
import styles from './attached-file-preview.module.css'

/** The file of a chip, and the copy of it that the browser holds. */
export interface PreviewFile {
  chip: ChipFile
  file: Blob
}

/** The body of the dialog: the picture, the text, or a file without one. */
function DialogBody(props: { file: PreviewFile }) {
  const { chip, file } = props.file
  const preview = useLocalPreview(file, chip.kind === 'image', 'dialog')
  switch (preview.kind) {
    case 'loading':
      return <LoadingFile />
    case 'picture':
      return (
        <PreviewPicture size={preview.size}>
          <img
            alt={chip.name}
            className={styles.picture}
            src={preview.address}
          />
        </PreviewPicture>
      )
    case 'text':
      return <CodeView name={chip.name} text={preview.text} />
    case 'too-large':
      return <PreviewTooLarge />
    case 'none':
      return <NoPreview />
  }
}

/**
 * Keeps an event of the dialog from the parts of the page around the chip,
 * which React passes it to: the field, the drop of the message box, and
 * the dialog of New workspace, which closes on a press outside it.
 */
function stop(event: SyntheticEvent) {
  event.stopPropagation()
}

/**
 * A drag over the dialog attaches nothing, and the browser opens no
 * dropped file in its tab.
 */
function refuseDrop(event: SyntheticEvent) {
  event.stopPropagation()
  event.preventDefault()
}

/** Makes `element` inert until the result runs, which restores it. */
function holdInert(element: HTMLElement): () => void {
  const before = element.inert
  element.inert = true
  return () => {
    element.inert = before
  }
}

/**
 * The preview of a file of the draft, as a dialog over the dimmed app.
 * Escape, Close, and a press on the dimmed app close it. The focus moves to
 * Close as it opens, and back to the field as it closes. It is a layer of
 * its own also inside the dialog of New workspace: Escape and a press
 * close only the preview, and its keys and drops stay inside it.
 *
 * `field` is the message field of the chip. It is inert while the preview
 * shows, because the editor of the field takes the focus back at each
 * update of its selection. Inside the dialog of New workspace, no other
 * layer makes it inert. It is active again before the focus goes back.
 */
export function FilePreviewLayer(props: {
  file: PreviewFile
  field: HTMLElement | null
  close: () => void
}) {
  const dialog = useRef<HTMLElement>(null)
  const { field } = props
  // Declared before the focus of the layer, so its cleanup runs first.
  useEffect(() => (field ? holdInert(field) : undefined), [field])
  useEscapeLayer(true, props.close)
  useLayerFocus(dialog, { modal: true })
  return (
    <Overlay>
      <div
        className={styles.events}
        onClick={stop}
        onDragEnter={refuseDrop}
        onDragLeave={stop}
        onDragOver={refuseDrop}
        onDrop={refuseDrop}
        onKeyDown={stop}
        onMouseDown={stop}
        onPointerDown={stop}
      >
        <FilePreviewDialog
          close={
            <IconButton
              icon={X}
              label={closePreviewLabel}
              onPress={props.close}
              quiet
            />
          }
          file={props.file.chip}
          onKeyDownCapture={trapTab}
          onScrimPress={props.close}
          dialogRef={dialog}
        >
          <DialogBody file={props.file} />
        </FilePreviewDialog>
      </div>
    </Overlay>
  )
}

/** The picture or the first lines of the file in the card, when it has one. */
function PeekBody(props: { chip: ChipFile; preview: LocalPreview }) {
  const { chip, preview } = props
  if (preview.kind === 'picture') {
    return (
      <PeekPicture>
        <img alt={chip.name} src={preview.address} />
      </PeekPicture>
    )
  }
  if (preview.kind === 'text' && preview.text !== '') {
    return <PeekText text={preview.text} />
  }
  return null
}

/**
 * The card of a pointer that rests on the chip `anchor`: in the top layer,
 * above the chip, so no box of the field clips it. It shows once the read
 * of the file ends, so it takes its place with its full size. Mount it only
 * while it shows.
 */
export function FilePeekLayer(props: {
  file: PreviewFile
  anchor: RefObject<HTMLElement | null>
}) {
  const { chip, file } = props.file
  const preview = useLocalPreview(file, chip.kind === 'image', 'peek')
  if (preview.kind === 'loading') return null
  return (
    <PopoverSurface
      align="start"
      anchor={props.anchor}
      className={styles.peekLayer}
      side="above"
    >
      <FilePeek file={chip}>
        <PeekBody chip={chip} preview={preview} />
      </FilePeek>
    </PopoverSurface>
  )
}
