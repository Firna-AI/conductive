import type { CSSProperties, ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'
import inline from '../common/InlineText.module.css'
import type { PictureSize } from '../files/ImageView'
import styles from './AnswerPicture.module.css'

/**
 * What an answer shows for a Markdown image of a picture file: the box of
 * the label while the read of the file runs, the picture with its size in
 * CSS px, or the link of the file.
 */
export type PictureState =
  | { kind: 'loading' }
  | { kind: 'picture'; size: PictureSize; picture: ReactNode }
  | { kind: 'link' }

/** What the element that opens the file tab gets from the picture. */
export type PictureOpener = {
  className: string
  /** The path of the file. */
  title: string
  style?: CSSProperties
  children: ReactNode
}

/** The style that hands the size of the picture to its CSS. */
type PictureStyle = CSSProperties &
  Record<'--picture-width' | '--picture-ratio', string>

/** The parts of the element of each state. */
function targetOf(label: string, title: string, state: PictureState) {
  switch (state.kind) {
    case 'loading':
      return {
        className: styles.loading,
        title,
        children: (
          <>
            <ImageIcon aria-hidden className={styles.icon} size={16} />
            <span className={styles.label}>{label}</span>
          </>
        ),
      }
    case 'picture': {
      const { width, height } = state.size
      const style: PictureStyle = {
        '--picture-width': `${width}px`,
        '--picture-ratio': `${width} / ${height}`,
      }
      return {
        className: styles.picture,
        title,
        style,
        children: state.picture,
      }
    }
    case 'link':
      return { className: inline.link, title, children: label }
  }
}

/**
 * A Markdown image of an answer to a PNG, JPEG, GIF, or WebP file of the
 * workspace, such as `![Phone view](.context/shots/after.png)`, from
 * screenshot decision 2. It stands in the line of text at the place of the
 * image, as an image of a Markdown preview does.
 *
 * - The picture keeps its proportions. It is never larger than its own
 *   size, never wider than the answer, and never higher than 240 px. The
 *   caller gives the picture with the label as its alternative text: the
 *   app an `<img>` of the bytes of the file, and the mockups an SVG drawing
 *   of the same size, because Mokly takes no `data:` address.
 * - While the read of the file runs, the size is not known. So a box with
 *   the most room that a picture takes, the width of the answer and a
 *   height of 240 px, shows the label beside the icon of a picture.
 * - The link shows the label as the link of a Markdown link of an answer
 *   does: in a chat that reads no picture, and after a failed read.
 *
 * `opener` makes the element of each state the element that opens the file
 * tab, such as a link, so a press opens the file tab in each state. The
 * title of the element is the path. Without an opener, nothing opens. Each
 * state holds only inline content, such as spans and SVG, because it stands
 * in a paragraph, and a paragraph can hold no block, such as a `<div>`. It
 * takes no fixtures, so the app can draw it too.
 */
export function AnswerPicture(props: {
  label: string
  title: string
  state: PictureState
  opener?: (target: PictureOpener) => ReactNode
}) {
  const target: PictureOpener = targetOf(props.label, props.title, props.state)
  return props.opener ? props.opener(target) : <span {...target} />
}
