import type { ReactNode } from 'react'
import { classes } from '../common/classes'
import { StillLinks } from '../common/ScreenLink'
import styles from './ScreenFrame.module.css'

/** The size that a screen lays out at, in px. */
export type ScreenSize = { width: number; height: number }

/** The part of a screen that a picture shows, in px of the screen. */
export type ScreenCrop = { x: number; y: number; width: number; height: number }

/**
 * How large a picture shows its screen: a fixed factor, or `inherit`, which
 * reads the factor from the `--frame-scale` property of an ancestor, so that
 * the picture can follow the width of the page.
 */
export type FrameScale = number | 'inherit'

/** A real screen of the app, and the part of it that a picture shows. */
export type ScreenPicture = {
  /** What the picture shows, for assistive technology. */
  label: string
  size: ScreenSize
  /** The whole screen when omitted. */
  crop?: ScreenCrop
  scale: FrameScale
  screen: ReactNode
}

/**
 * How the picture is drawn: a large window, a quiet excerpt of a screen, or
 * a phone around a phone screen.
 */
export type FrameDevice = 'window' | 'excerpt' | 'phone'

/** The top band of the phone, over which its notch sits, in px. */
const phoneBand = 44

function length(px: number, scale: FrameScale): string {
  return scale === 'inherit'
    ? `calc(${px}px * var(--frame-scale))`
    : `${px * scale}px`
}

/** The visible part of the screen, which clips the scaled screen. */
function PictureView(props: {
  picture: ScreenPicture
  className: string
  label?: string
}) {
  const { picture } = props
  const crop = picture.crop ?? { x: 0, y: 0, ...picture.size }
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
