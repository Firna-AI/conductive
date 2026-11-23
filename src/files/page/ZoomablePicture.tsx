import {
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from 'react'
import { Maximize2, Shrink, ZoomIn, ZoomOut } from 'lucide-react'
import {
  ImageView,
  type PictureSize,
} from '../../ui/components/files/ImageView'
import { pictureCopy, zoomPercent } from '../../ui/components/files/pictureCopy'
import bar from '../../ui/components/files/PictureZoomBar.module.css'
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
 * Keeps the focus in the zoom bar when the button that has it turns off,
 * such as Zoom in at the largest zoom, or Fit after its press: the first
 * button that is on takes it. A browser takes the focus from a disabled
 * button, and a lost focus in the expanded window goes to Close, where the
 * next Enter would close the window.
 */
function useBarFocus(bar: RefObject<HTMLDivElement | null>) {
  const held = useRef(false)
  useLayoutEffect(() => {
    const node = bar.current
    if (!node || !held.current) return
    const active = document.activeElement
    const lost =
      active === null ||
      active === document.body ||
      (active instanceof HTMLButtonElement &&
        active.disabled &&
        node.contains(active))
    if (!lost) return
    const next = [...node.querySelectorAll('button')].find(
      (button) => !button.disabled,
    )
    next?.focus()
  })
  return {
    onFocus: () => {
      held.current = true
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target
      const off = target instanceof HTMLButtonElement && target.disabled
      const to = event.relatedTarget
      const inside = to instanceof Node && event.currentTarget.contains(to)
      if (!off && !inside) held.current = false
    },
  }
}

/**
 * A picture over its zoom bar, as the shared `ImageView` and the mockups'
 * `PictureZoomBar` draw them. It fits its stage as it shows. The wheel and a
 * pinch zoom it about the pointer, a drag moves a zoomed picture, and a
 * double press zooms in, or fits a zoomed picture again. With `expand`,
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
  const barNode = useRef<HTMLDivElement>(null)
  const focus = useBarFocus(barNode)
  return (
    <ImageView
      bar={
        <div className={bar.bar} ref={barNode} {...focus}>
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
