import { useCallback, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import { pictureCopy } from '../../ui/components/files/pictureCopy'
import overlay from '../../ui/components/tools/ExpandedPreview.module.css'
import { Overlay, useModalLayer, type Focusable } from '../../shell/ui/Overlay'
import { trapTab } from '../../shell/ui/Sheet'
import { IconButton } from '../../shell/ui/actions'
import { ZoomablePicture, type ShownPicture } from './ZoomablePicture'

/**
 * The picture of an image file in a large window over the whole app, on
 * the dim layer of a dialog, as the mockups' `ExpandedPicture` draws it.
 * The header names the file and holds Close. The picture fits the window
 * as it opens, and it zooms and moves as in the tab. Close, Escape, and a
 * press on the dim layer close the window, and the focus goes back to
 * Expand. The window is a modal layer, so the keys of the app do nothing
 * while it shows, and Tab stays in the window.
 */
export function ExpandedPicture(props: {
  picture: ShownPicture
  close: () => void
}) {
  const dialog = useRef<HTMLElement>(null)
  const closeButton = useRef<Focusable | null>(null)
  const takeClose = useCallback((element: unknown) => {
    closeButton.current = element instanceof HTMLElement ? element : null
  }, [])
  useModalLayer(dialog, props.close, { initial: closeButton })
  return (
    <Overlay>
      <div className={classes(overlay.layer, overlay.inFrame)}>
        <section
          aria-label={props.picture.name}
          aria-modal
          className={overlay.window}
          onKeyDownCapture={(event: KeyboardEvent<HTMLElement>) =>
            trapTab(event)
          }
          ref={dialog}
          role="dialog"
          tabIndex={-1}
        >
          <div className={overlay.header}>
            <h2 className={overlay.title}>{props.picture.name}</h2>
            <IconButton
              buttonRef={takeClose}
              icon={X}
              label={pictureCopy.close}
              onPress={props.close}
            />
          </div>
          <ZoomablePicture picture={props.picture} />
        </section>
      </div>
    </Overlay>
  )
}
