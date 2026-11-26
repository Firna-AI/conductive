import { iconButton } from '../../entries/components/common/actions.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  pictureCopy,
  zoomPercent,
} from '../../../../../src/ui/components/files/pictureCopy'
import styles from '../../../../../src/ui/components/files/PictureZoomBar.module.css'

/**
 * The zoom bar under the picture of an image file: Zoom out, the zoom as a
 * percentage of the own size of the picture, Zoom in, Fit, and Expand.
 * Zoom out and Fit are off while the picture fits, and Zoom in is off at
 * the largest zoom. Expand shows only in the tab on desktop, with
 * `expand`. It leads to `expandTo`, the screen of the picture in its large
 * window, when the catalogue has one. The window has the bar without
 * Expand.
 */
export function PictureZoomBar(props: {
  scale: number
  fitted: boolean
  /** The picture shows at the largest zoom, eight times its own size. */
  largest?: boolean
  expand?: boolean
  expandTo?: string
}) {
  const percent = zoomPercent(props.scale)
  return (
    <div className={styles.bar}>
      <iconButton.Component
        disabled={props.fitted}
        icon="zoom-out"
        label={pictureCopy.zoomOut}
        moklyInstance="zoom-out"
      />
      <span
        aria-label={pictureCopy.zoomLabel(percent)}
        className={styles.zoom}
        role="img"
      >
        {percent}
      </span>
      <iconButton.Component
        disabled={props.largest === true}
        icon="zoom-in"
        label={pictureCopy.zoomIn}
        moklyInstance="zoom-in"
      />
      <iconButton.Component
        disabled={props.fitted}
        icon="shrink"
        label={pictureCopy.fit}
        moklyInstance="fit-picture"
      />
      {props.expand === true && props.expandTo ? (
        <ScreenLink asChild to={props.expandTo}>
          <iconButton.Component
            icon="maximize-2"
            label={pictureCopy.expand}
            moklyInstance="expand-picture"
          />
        </ScreenLink>
      ) : null}
      {props.expand === true && !props.expandTo ? (
        <iconButton.Component
          icon="maximize-2"
          label={pictureCopy.expand}
          moklyInstance="expand-picture"
        />
      ) : null}
    </div>
  )
}
