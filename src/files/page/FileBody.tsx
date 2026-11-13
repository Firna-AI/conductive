import { useEffect, useState } from 'react'
import { File, FileBox } from 'lucide-react'
import { ImageView } from '../../../docs/mockups/src/components/files/ImageView'
import type { LineRange } from '../../shared/line-target'
import { CodeView } from '../code/CodeView'
import type { MarkdownParser } from '../markdown/markdown-document'
import { MarkdownView } from '../markdown/MarkdownView'
import { splitPath, type FileMode } from '../navigation'
import { isMarkdown } from '../code/file-kind'
import { ActionButton } from '../ui/actions'
import { EmptyState } from '../ui/EmptyState'
import { LoadingFile } from '../ui/FileStates'
import { decodePicture, type DecodedPicture } from './decode-picture'
import type { FileView } from './file-view'
import styles from './FilePage.module.css'

/** A file that the page does not show, with its download. */
function DownloadToOpen(props: { onDownload?: () => void }) {
  return (
    <EmptyState
      action={
        props.onDownload ? (
          <ActionButton onPress={props.onDownload}>Download</ActionButton>
        ) : undefined
      }
      body="It is a binary file."
      icon={FileBox}
      title="Download this file to open it"
    />
  )
}

/** The last decode, with the address that it decoded. */
interface Outcome {
  address: string
  decoded: DecodedPicture
}

/**
 * The picture of an image file, with the layout of the mockups'
 * `ImageView`: in the middle of the page, at its own size or smaller, so
 * that it fits the page. The page shows the picture once the browser knows
 * its size, and a new address keeps the last picture on screen until then.
 * Bytes that the browser cannot draw show the download of the file.
 */
function Picture(props: {
  address: string
  name: string
  onDownload?: () => void
}) {
  const { address } = props
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  useEffect(
    () => decodePicture(address, (decoded) => setOutcome({ address, decoded })),
    [address],
  )
  if (outcome?.decoded.status === 'drawn') {
    return (
      <ImageView size={outcome.decoded.size}>
        <img
          alt={props.name}
          className={styles.picture}
          src={outcome.address}
        />
      </ImageView>
    )
  }
  if (outcome?.address !== address) return <LoadingFile />
  return <DownloadToOpen onDownload={props.onDownload} />
}

/**
 * The content of a file page: a picture, rendered Markdown, or text with
 * line numbers. The text views show the view text, without a leading byte
 * order mark. `name` is the file name of the label of the path, which
 * names the picture.
 */
export function FileContent(props: {
  path: string
  view: FileView
  name: string
  mode: FileMode
  /** The lines that the text view shows in view and marked. */
  lines?: LineRange | null
  onDownload?: () => void
  /**
   * Parses Markdown on the calling thread, for a static render. Without
   * it, a module worker parses the Markdown of the file.
   */
  markdownParser?: MarkdownParser
}) {
  const { view } = props
  if (view.kind === 'picture') {
    return (
      <Picture
        address={view.address}
        name={props.name}
        onDownload={props.onDownload}
      />
    )
  }
  if (view.kind === 'binary') {
    return <DownloadToOpen onDownload={props.onDownload} />
  }
  if (view.viewText === '')
    return <EmptyState icon={File} title="This file is empty" />
  if (isMarkdown(props.path) && props.mode === 'preview') {
    return <MarkdownView parser={props.markdownParser} text={view.viewText} />
  }
  return (
    <CodeView
      marked={props.lines}
      name={splitPath(props.path).name}
      text={view.viewText}
    />
  )
}
