import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { FileBox, FileWarning } from 'lucide-react'
import { EmptyState } from '../common/EmptyState'
import layer from '../common/ConfirmDialog.module.css'
import { ImageView, type PictureSize } from '../files/ImageView'
import { KindIcon, type ChipFile } from './attachedFileParts'
import {
  previewKindsTitle,
  previewLimitBody,
  sentWithMessageBody,
  smallerFilesTitle,
} from './attachmentCopy'
import { formatSize } from './sizes'
import styles from './FilePreview.module.css'

/** The kind icon, the name, and the size of a file, in one line. */
function FileLine(props: { file: ChipFile; size: number }) {
  const { file } = props
  return (
    <>
      <span className={styles.glyph}>
        <KindIcon kind={file.kind} size={props.size} />
      </span>
      <span className={styles.name}>{file.name}</span>
      <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
    </>
  )
}

/**
 * The preview of an attached file of the composer, as a dialog over the
 * dimmed app. Its header gives the kind, the name, and the size of the file,
 * and `close` at the end. Its body is the picture, the text, or the state of
 * a file without a preview. A press on the dimmed app runs `onScrimPress`.
 * The browser draws the preview from its own copy of the file, so it shows
 * also while the file uploads, and before the cloud computer has it. It
 * takes no fixtures, so the app can draw it.
 */
export function FilePreviewDialog(props: {
  file: ChipFile
  close: ReactNode
  children: ReactNode
  dialogRef?: Ref<HTMLElement>
  onScrimPress?: () => void
  onKeyDownCapture?: (event: KeyboardEvent<HTMLElement>) => void
}) {
  const { dialogRef, ...parts } = props
  return (
    <div className={layer.layer}>
      <div aria-hidden className={layer.scrim} onClick={parts.onScrimPress} />
      <section
        aria-label={parts.file.name}
        aria-modal
        className={styles.dialog}
        onKeyDownCapture={parts.onKeyDownCapture}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <FileLine file={parts.file} size={14} />
          <span className={styles.close}>{parts.close}</span>
        </header>
        <div className={styles.body}>{parts.children}</div>
      </section>
    </div>
  )
}

/** The picture of an image file in the preview, which fits the dialog. */
export function PreviewPicture(props: {
  size: PictureSize
  children: ReactNode
}) {
  return <ImageView size={props.size}>{props.children}</ImageView>
}

/** The body of a file that the preview does not show, such as a zip. */
export function NoPreview() {
  return (
    <EmptyState
      body={sentWithMessageBody}
      icon={FileBox}
      title={previewKindsTitle}
    />
  )
}

/** The body of a picture or a text file over the limit of the preview. */
export function PreviewTooLarge() {
  return (
    <EmptyState
      body={previewLimitBody}
      icon={FileWarning}
      title={smallerFilesTitle}
    />
  )
}

/**
 * The small card that shows above the chip of an attached file while the
 * pointer rests on it: the picture or the first lines of the file, when it
 * has a preview, then its kind, its name, and its size. It takes no
 * pointer, so the chip under it keeps the pointer.
 */
export function FilePeek(props: { file: ChipFile; children?: ReactNode }) {
  return (
    <div className={styles.peek}>
      {props.children}
      <div className={styles.peekFooter}>
        <FileLine file={props.file} size={12} />
      </div>
    </div>
  )
}

/** The picture of an image file in the card, in a box of fixed height. */
export function PeekPicture(props: { children: ReactNode }) {
  return <div className={styles.peekPicture}>{props.children}</div>
}

/** The first lines of a text file in the card. */
export function PeekText(props: { text: string }) {
  return <pre className={styles.peekText}>{props.text}</pre>
}

/**
 * A chip of a view with its card above it, at its start edge. A view runs
 * no script and has no pointer, so it draws the card in place. The app
 * shows the card in the top layer instead.
 */
export function PeekSpot(props: { chip: ReactNode; peek: ReactNode }) {
  return (
    <span className={styles.peekAnchor}>
      {props.chip}
      <span className={styles.peekSpot}>{props.peek}</span>
    </span>
  )
}
