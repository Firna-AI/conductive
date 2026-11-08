import type { ReactNode } from 'react'
import type {
  PictureScale,
  ScreenCrop,
  ScreenSize,
} from '../../screens/marketingPictureList'
import { classes } from '../common/classes'
import { StillLinks } from '../common/ScreenLink'
import styles from './ScreenFrame.module.css'

/** A real screen of the app, and the part of it that a picture shows. */
export type ScreenPicture = {
  /** What the picture shows, for assistive technology. */
  label: string
  /** The size that the screen lays out at. */
  size: ScreenSize
  /** The part of the screen that the picture shows, in px of the screen. */
  crop: ScreenCrop
  scale: PictureScale
  screen: ReactNode
}

/**
 * How the picture is drawn: a large window, a quiet excerpt of a screen, or
 * a phone around a phone screen.
 */
export type FrameDevice = 'window' | 'excerpt' | 'phone'

/** The top band of the phone, over which its notch sits, in px. */
const phoneBand = 44

function length(px: number, scale: PictureScale): string {
  return scale === 'inherit'
    ? `calc(${px}px * var(--frame-scale))`
    : `${px * scale}px`
}

/**
 * The visible part of the screen, which clips the scaled screen. The screen
 * lays out at its own size, and a visitor cannot focus or press anything in
 * it.
 */
function PictureView(props: {
  picture: ScreenPicture
  className: string
  label?: string
}) {
  const { picture } = props
  const { crop } = picture
  const factor =
    picture.scale === 'inherit' ? 'var(--frame-scale)' : `${picture.scale}`
  return (
    <div
      aria-label={props.label}
      className={props.className}
      role={props.label ? 'img' : undefined}
      style={{
        width: length(crop.width, picture.scale),
        height: length(crop.height, picture.scale),
      }}
    >
      <div
        className={styles.screen}
        inert
        style={{
          width: picture.size.width,
          height: picture.size.height,
          transform: `scale(${factor}) translate(${-crop.x}px, ${-crop.y}px)`,
        }}
      >
        <StillLinks>{picture.screen}</StillLinks>
      </div>
    </div>
  )
}

/**
 * The part of the screen of a picture at its own size, without a frame. It
 * starts at the top left corner of the page, so that the capture command can
 * save it as the file of the picture.
 */
export function ScreenCapture(props: { picture: ScreenPicture }) {
  const { picture } = props
  return (
    <PictureView
      className={styles.view}
      label={picture.label}
      picture={{ ...picture, scale: 1 }}
    />
  )
}

/**
 * A real screen of the app as a picture: laid out at its own size, then
 * scaled and cropped. Its links are not links, and a visitor cannot focus or
 * press anything in it.
 */
export function ScreenFrame(props: {
  picture: ScreenPicture
  device: FrameDevice
}) {
  const { picture } = props
  if (props.device !== 'phone') {
    return (
      <PictureView
        className={classes(styles.view, styles[props.device])}
        label={picture.label}
        picture={picture}
      />
    )
  }
  const { scale } = picture
  return (
    <div
      aria-label={picture.label}
      className={styles.phone}
      role="img"
      style={{ padding: length(11, scale), borderRadius: length(54, scale) }}
    >
      <div
        className={styles.phoneScreen}
        style={{ borderRadius: length(43, scale) }}
      >
        <div
          className={styles.band}
          style={{ height: length(phoneBand, scale) }}
        >
          <span
            className={styles.notch}
            style={{ width: length(104, scale), height: length(30, scale) }}
          />
        </div>
        <PictureView className={styles.view} picture={picture} />
      </div>
    </div>
  )
}
