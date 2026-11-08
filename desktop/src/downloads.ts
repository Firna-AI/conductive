import type { Session, WebContents } from 'electron'

import {
  DESKTOP_ORIGIN,
  isDesktopAddress,
} from '../../worker/security/desktop-contract.js'

/** File actions fetch authorized bytes, then create a blob in the bundled page. */
export function installDownloads(
  session: Session,
  trustedContents: () => WebContents | undefined,
): void {
  session.on('will-download', (event, item, contents, frame) => {
    const trusted = trustedContents()
    if (
      trusted &&
      !trusted.isDestroyed() &&
      contents === trusted &&
      frame &&
      frame === trusted.mainFrame &&
      item.getInitiatorOrigin() === DESKTOP_ORIGIN &&
      item.getURL().startsWith(`blob:${DESKTOP_ORIGIN}/`)
    ) {
      try {
        if (isDesktopAddress(new URL(frame.url))) return
      } catch {
        // A missing or invalid frame keeps the default download refusal.
      }
    }
    event.preventDefault()
  })
}
