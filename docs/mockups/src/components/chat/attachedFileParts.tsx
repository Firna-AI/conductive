import { FileText, ImageIcon } from 'lucide-react'
import a11y from '../common/a11y.module.css'
import { attachedFileWords } from './attachmentCopy'
import base from './InlineChip.module.css'

/**
 * What a chip shows of an attached file: its name, its kind, and its size.
 * It takes no fixtures, so the app can draw the chips too.
 */
export type ChipFile = {
  name: string
  /** An image, which also goes to the model as an image, or another file. */
  kind: 'image' | 'file'
  sizeBytes: number
}

/** The icon of the kind of an attached file: an image, or another file. */
export function KindIcon(props: {
  kind: ChipFile['kind']
  size: number
  className?: string
}) {
  const Icon = props.kind === 'image' ? ImageIcon : FileText
  return <Icon aria-hidden className={props.className} size={props.size} />
}

/**
 * The name of an attached file in its chip. The end of a long name gives
 * way first. Screen readers hear "Attached file" before it.
 */
export function AttachedName(props: { name: string }) {
  return (
    <span className={base.text}>
      <span className={a11y.hidden}>{attachedFileWords} </span>
      <span className={base.name}>{props.name}</span>
    </span>
  )
}
