import type { ReactNode } from 'react'
import { AttachedName, KindIcon, type ChipFile } from './attachedFileParts'
import base from './InlineChip.module.css'
import { formatSize } from './sizes'
import type { ChipOpener } from './WorkspaceChip'
import styles from './AttachedFileChip.module.css'

/**
 * An attached file in the text of a sent message, at the place of its
 * mention: the icon of its kind, its name, and its size in a muted colour.
 * It has the size of a file chip, and its title is the name.
 *
 * `opener` makes the chip the element that opens the file tab of the copy
 * of the file in the cloud computer, such as a link, as a press on a file
 * chip opens its file. Without it, the chip opens nothing, as while its
 * message waits for the cloud computer. `mention` marks the chip with its
 * text, so a copy of the message can give it. It takes no fixtures, so the
 * app can draw it too.
 */
export function SentFileChip(props: {
  file: ChipFile
  mention?: string
  opener?: (chip: ChipOpener) => ReactNode
}) {
  const { file } = props
  const chip: ChipOpener = {
    className: base.chip,
    'data-mention': props.mention,
    title: file.name,
    children: (
      <>
        <span className={styles.glyph}>
          <KindIcon kind={file.kind} size={12} />
        </span>
        <AttachedName name={file.name} />
        <span className={styles.label}>{formatSize(file.sizeBytes)}</span>
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
