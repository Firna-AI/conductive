import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { RotateCw, X } from 'lucide-react'
import { classes } from '../../../ui/components/common/classes'
import overlay from '../../../ui/components/tools/ExpandedPreview.module.css'
import page from '../../../ui/components/tools/PreviewPage.module.css'
import { expandedPreviewCopy } from '../../../ui/components/tools/previewCopy'
import { IconButton } from '../../ui/actions'
import { useModalLayer } from '../../ui/layers'
import { trapTab } from '../../ui/Sheet'
import { useEscapeLayer } from '../../ui/escape-layer'
import {
  focusableSelector,
  useLayerFocus,
  type Focusable,
} from '../../ui/Overlay'
import ui from '../../ui/ui.module.css'
import styles from './ExpandableFrames.module.css'

/** The page of the shown tab while it shows in its large window. */
export interface ExpandedFrame {
  /** The name of the page: the label of its Preview tab, or its file name. */
  title: string
  /** Open, the link to the page in a new browser tab, or null. */
  open: ReactNode | null
  reload: () => void
  close: () => void
}

/** Marks the element after the frame that sends the focus back to the header. */
const focusReturn = 'data-focus-return'

/**
 * The elements that Tab moves between in the window: its controls, and the
 * frame of the shown page. The other frames are hidden, and the mark after
 * the frame only sends the focus that leaves the page back to the header.
 */
function windowTabbable(window: HTMLElement): HTMLElement[] {
  return Array.from(
    window.querySelectorAll<HTMLElement>(`${focusableSelector}, iframe`),
  ).filter(
    (each) =>
      each.tabIndex >= 0 &&
      each.closest('[hidden]') === null &&
      !each.hasAttribute(focusReturn),
  )
}

/** Keeps Tab in the window, and never moves it to the app under it. */
function trapWindowTab(event: KeyboardEvent<HTMLElement>): void {
  trapTab(event, windowTabbable)
}

/**
 * The kept frames of the Preview tabs or of the tabs of HTML files, under
 * the tab that shows. With `expanded`, the frame of the shown page shows in
 * a large window over the whole app, on the dim layer of a dialog, with
 * its name, Reload, Open, and Close. The frames stay in their place in the
 * page, and only their styles change, because a frame that moves loads its
 * page again. So the page keeps its state, its address, and its sign-in.
 *
 * Close, Escape, and a press on the dim layer close the window, and the
 * focus goes back to Expand. The window counts as a dialog, so the keys of
 * the app do nothing while it shows. It makes nothing inert, because the
 * frame lives in the content of the app. So Tab stays in the window: a
 * mark after the frame sends the focus that leaves the page back to the
 * header. A key in the page goes to the page, so Escape there does nothing.
 */
export function ExpandableFrames(props: {
  /** Whether the page of the shown tab is one of the frames. */
  visible: boolean
  expanded: ExpandedFrame | null
  children: ReactNode
}) {
  const { expanded } = props
  const open = expanded !== null
  const box = useRef<HTMLDivElement>(null)
  const closeButton = useRef<Focusable | null>(null)
  const takeClose = useCallback((element: unknown) => {
    closeButton.current = element instanceof HTMLElement ? element : null
  }, [])
  const close = () => expanded?.close()
  useModalLayer(open)
  useEscapeLayer(open, close)
  useLayerFocus(box, { modal: false, enabled: open, initial: closeButton })
  return (
    <div
      className={classes(
        page.page,
        open && overlay.layer,
        open && styles.fixed,
      )}
      hidden={!props.visible}
      onClick={(event) => {
        if (open && event.target === event.currentTarget) close()
      }}
    >
      <div
        aria-label={expanded?.title}
        aria-modal={open || undefined}
        className={open ? overlay.window : ui.contents}
        onKeyDownCapture={open ? trapWindowTab : undefined}
        ref={box}
        role={open ? 'dialog' : undefined}
        tabIndex={open ? -1 : undefined}
      >
        {expanded ? (
          <div className={overlay.header}>
            <h2 className={overlay.title}>{expanded.title}</h2>
            <IconButton
              icon={RotateCw}
              label="Reload"
              onPress={expanded.reload}
            />
            {expanded.open}
            <IconButton
              buttonRef={takeClose}
              icon={X}
              label={expandedPreviewCopy.close}
              onPress={close}
            />
          </div>
        ) : null}
        {props.children}
        {open ? (
          <span
            {...{ [focusReturn]: true }}
            onFocus={() =>
              box.current
                ?.querySelector<HTMLElement>(focusableSelector)
                ?.focus()
            }
            tabIndex={0}
          />
        ) : null}
      </div>
    </div>
  )
}
