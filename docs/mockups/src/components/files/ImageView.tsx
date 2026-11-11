import type { CSSProperties, ReactNode } from 'react'
import styles from './ImageView.module.css'

/** The size of a picture in CSS px, as its image file gives it. */
export type PictureSize = { readonly width: number; readonly height: number }

/** The style that hands the size of the picture to its CSS. */
type PictureStyle = CSSProperties &
  Record<'--picture-width' | '--picture-ratio', string>

/**
 * The picture of an image file in its tab, in the middle of the tab. It
 * keeps its proportions. It shows at its own size, or smaller, so that it
 * fits the width and the height of the tab. The app draws the bytes of the
 * file from a `data:` address. Mokly takes no `data:` address, so a view
 * of the mockups gives the picture as an SVG drawing of the same size.
 */
export function ImageView(props: { size: PictureSize; children: ReactNode }) {
  const { width, height } = props.size
  const style: PictureStyle = {
    '--picture-width': `${width}px`,
    '--picture-ratio': `${width} / ${height}`,
  }
  return (
    <div className={styles.view}>
      <div className={styles.picture} style={style}>
        {props.children}
      </div>
    </div>
  )
}
