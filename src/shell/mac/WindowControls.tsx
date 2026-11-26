import { ArrowLeft, ArrowRight, PanelLeft } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/mac/WindowControls.module.css'
import { useStore } from '../../app/store'
import { usePanelLayout } from '../layout/panels'
import type { SidebarToggle } from '../layout/sidebar-toggle'
import { useShortcutOffer } from '../shortcuts/shortcut-context'
import { IconButton } from '../ui/actions'
import { useMacApp, type MacChrome } from './mac-app'
import mac from './mac.module.css'

/**
 * The window controls of the Mac app: the space of the native window
 * buttons, the sidebar toggle, and Back and Forward. In full screen macOS
 * hides the window buttons, so the page gets their space back. The frame
 * offers the toggle to the command palette, as in the browser. Back and
 * Forward offer their keys while the history of the window has a page to
 * go to.
 */
function Controls(props: { chrome: MacChrome; toggle?: SidebarToggle }) {
  const macWindow = props.chrome.window
  const state = useStore(macWindow.state)
  const toggle = props.toggle
  const panels = usePanelLayout()
  useShortcutOffer('back', state.canGoBack ? () => macWindow.back() : null)
  useShortcutOffer(
    'forward',
    state.canGoForward ? () => macWindow.forward() : null,
  )
  return (
    <nav
      aria-label="Window controls"
      className={classes(styles.controls, mac.drag)}
    >
      <span
        aria-hidden
        className={styles.reserved}
        data-desktop-window-space=""
        hidden={state.mode === 'full-screen'}
      />
      {toggle ? (
        <span className={mac.panelSlot} data-desktop-panel-slot="">
          <IconButton
            disabled={toggle === 'off'}
            icon={PanelLeft}
            label={toggle === 'show' ? 'Show the sidebar' : 'Hide the sidebar'}
            onPress={panels.toggleSidebar}
            shortcut="toggle-sidebar"
          />
        </span>
      ) : null}
      <span className={styles.spacer} />
      <IconButton
        disabled={!state.canGoBack}
        icon={ArrowLeft}
        label="Back"
        onPress={() => macWindow.back()}
        shortcut="back"
      />
      <IconButton
        disabled={!state.canGoForward}
        icon={ArrowRight}
        label="Forward"
        onPress={() => macWindow.forward()}
        shortcut="forward"
      />
    </nav>
  )
}

/**
 * The window controls of a frame with the org rail. With a sidebar that
 * shows, they top the left panel and take its width. Otherwise they keep
 * their own width in the top left corner of the window. They move the
 * window, and their buttons do not.
 */
export function WindowControls(props: {
  chrome: MacChrome
  placement: 'panel' | 'corner'
  toggle: SidebarToggle
}) {
  return (
    <div
      className={classes(
        mac.slot,
        mac.drag,
        props.placement === 'corner' && mac.corner,
      )}
      data-desktop-chrome-slot=""
    >
      <Controls chrome={props.chrome} toggle={props.toggle} />
    </div>
  )
}

/**
 * The top of a page without the org rail in the Mac app, such as the
 * sign-in: a strip that holds the window controls without the sidebar
 * toggle, and moves the window. A browser shows nothing here.
 */
export function WindowStrip() {
  const chrome = useMacApp()
  if (!chrome) return null
  return (
    <div className={classes(mac.strip, mac.drag)} data-desktop-chrome-slot="">
      <Controls chrome={chrome} />
    </div>
  )
}
