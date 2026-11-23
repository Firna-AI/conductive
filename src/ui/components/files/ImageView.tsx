import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import { classes } from '../common/classes'
import styles from './ImageView.module.css'

/** The size of a picture in CSS px, as its image file gives it. */
export type PictureSize = { readonly width: number; readonly height: number }

/**
 * A zoomed picture: `scale` times its own size, moved by `x` and `y` CSS px
 * from the middle of the stage.
 */
export type PictureZoomPlace = {
  readonly scale: number
  readonly x: number
  readonly y: number
}

/** The style that hands the size of the picture to its CSS. */
type PictureStyle = CSSProperties &
  Record<'--picture-width' | '--picture-ratio', string>

/** From this scale on, the pixels of the picture show sharp. */
const sharpScale = 2

function pictureStyle(
  size: PictureSize,
  zoom: PictureZoomPlace | undefined,
): PictureStyle {
  const { width, height } = size
  const style: PictureStyle = {
    '--picture-width': `${width}px`,
    '--picture-ratio': `${width} / ${height}`,
  }
  if (!zoom) return style
  return {
    ...style,
    width: `${width * zoom.scale}px`,
    height: `${height * zoom.scale}px`,
    transform: `translate(calc(-50% + ${zoom.x}px), calc(-50% + ${zoom.y}px))`,
  }
}

/**
 * The picture of an image file in its tab, in the middle of the stage over
 * the zoom bar. It keeps its proportions. It fits: it shows at its own
 * size, or smaller, so that it fits the width and the height of the stage.
 * With `zoom`, it shows at that scale and place, and the stage cuts it.
 * From two times its own size, its pixels show sharp, so the detail of a
 * screenshot stays clear. The app draws the bytes of the file from a
 * `data:` address. Mokly takes no `data:` address, so a view of the
 * mockups gives the picture as an SVG drawing of the same size.
 */
export function ImageView(props: {
  size: PictureSize
  zoom?: PictureZoomPlace
  /** The zoom bar under the stage. */
  bar?: ReactNode
  /** The stage, for the app to read the wheel, a pinch, and a drag. */
  stageRef?: Ref<HTMLDivElement>
  stageProps?: HTMLAttributes<HTMLDivElement>
  /** A drag can move the picture. */
  movable?: boolean
  dragging?: boolean
  children: ReactNode
}) {
  const { zoom, stageRef, stageProps, movable } = props
  return (
    <div className={styles.view}>
      <div
        {...stageProps}
        className={classes(
          styles.stage,
          movable && styles.movable,
          props.dragging && movable && styles.dragging,
        )}
        ref={stageRef}
      >
        <div
          className={classes(
            styles.picture,
            zoom && styles.placed,
            zoom && zoom.scale >= sharpScale && styles.sharp,
          )}
          style={pictureStyle(props.size, zoom)}
        >
          {props.children}
        </div>
      </div>
      {props.bar}
    </div>
  )
}
