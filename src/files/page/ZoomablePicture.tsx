import { useState } from 'react'
import { Maximize2, Shrink, ZoomIn, ZoomOut } from 'lucide-react'
import {
  ImageView,
  type PictureSize,
} from '../../../docs/mockups/src/components/files/ImageView'
import {
  pictureCopy,
  zoomPercent,
} from '../../../docs/mockups/src/components/files/pictureCopy'
import bar from '../../../docs/mockups/src/components/files/PictureZoomBar.module.css'
import { IconButton } from '../ui/actions'
import { useFilesLayout } from '../ui/layout'
import { ExpandedPicture } from './ExpandedPicture'
import { usePictureZoom } from './use-picture-zoom'
import styles from './FilePage.module.css'

/** A picture that the browser drew: its address, its name, and its size. */
export interface ShownPicture {
  address: string
  name: string
  size: PictureSize
}

/**
 * A picture over its zoom bar, as the mockups' `ImageView` and
 * `PictureZoomBar` draw them. It fits its stage as it shows. The wheel and a
 * pinch zoom it about the pointer, a drag moves a zoomed picture, and a
 * double press switches between the fit and the own size. With `expand`,
 * the bar has Expand.
 */
export function ZoomablePicture(props: {
  picture: ShownPicture
  expand?: () => void
}) {
  const { address, name, size } = props.picture
  const zoom = usePictureZoom(size)
  const scale = zoom.place?.scale ?? 1
  const percent = zoomPercent(scale)
  return (
    <ImageView
      bar={
        <div className={bar.bar}>
          <IconButton
            icon={ZoomOut}
            label={pictureCopy.zoomOut}
            onPress={zoom.fitted ? undefined : zoom.zoomOut}
          />
          <span
            aria-label={pictureCopy.zoomLabel(percent)}
            className={bar.zoom}
            role="img"
          >
            {zoom.place ? percent : ''}
          </span>
          <IconButton
            icon={ZoomIn}
            label={pictureCopy.zoomIn}
            onPress={zoom.canZoomIn ? zoom.zoomIn : undefined}
          />
          <IconButton
            icon={Shrink}
            label={pictureCopy.fit}
            onPress={zoom.fitted ? undefined : zoom.fit}
          />
          {props.expand ? (
            <IconButton
              icon={Maximize2}
              label={pictureCopy.expand}
              onPress={props.expand}
            />
          ) : null}
        </div>
      }
      dragging={zoom.dragging}
      movable={zoom.movable}
      size={size}
      stageProps={zoom.handlers}
      stageRef={zoom.stageRef}
      zoom={zoom.fitted || !zoom.place ? undefined : zoom.place}
    >
      <img
        alt={name}
        className={styles.picture}
        draggable={false}
        src={address}
      />
    </ImageView>
  )
}

/**
 * The picture of an image file in its tab, with Expand on desktop. Expand
 * shows the picture in its large window, which fits it again. The window
 * closes as the tab goes, because it lives in the tab.
 */
export function PictureInTab(props: { picture: ShownPicture }) {
  const desktop = useFilesLayout() !== 'phone'
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <ZoomablePicture
        expand={desktop ? () => setExpanded(true) : undefined}
        picture={props.picture}
      />
      {expanded && desktop ? (
        <ExpandedPicture
          close={() => setExpanded(false)}
          picture={props.picture}
        />
      ) : null}
    </>
  )
}
