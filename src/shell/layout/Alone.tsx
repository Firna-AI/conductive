import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { WindowStrip } from '../mac/WindowControls'
import { PaletteLayer } from '../palette/PaletteLayer'
import { OverlayHost } from '../ui/Overlay'
import { useViewport } from '../ui/viewport'
import ui from '../ui/ui.module.css'
import { PhoneFrame } from './frames'
import layout from './layout.module.css'

/**
 * A page alone in the window: a phone frame, or a desktop page without the
 * rail. In the Mac app a strip with the window controls tops it, unless
 * the page draws its own top bar, as the waitlist does.
 */
export function Alone(props: { children: ReactNode; ownBar?: boolean }) {
  if (useViewport() === 'phone')
    return <PhoneFrame>{props.children}</PhoneFrame>
  return (
    <div className={layout.standalone}>
      <OverlayHost>
        {props.ownBar ? null : <WindowStrip />}
        {props.children}
        <PaletteLayer />
      </OverlayHost>
    </div>
  )
}

/** The wait of the first load, as the app shows it. */
export function Loading() {
  const theme = useSharedUiTheme()
  return (
    <Alone>
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading"
          color={theme.colors.muted}
          size={16}
        />
      </div>
    </Alone>
  )
}
