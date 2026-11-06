import type { Session } from 'electron'

import { isDesktopAddress } from '../../worker/security/desktop-contract.js'

export function permissionAllowed(
  permission: string,
  main: boolean,
  address: string,
): boolean {
  if (permission !== 'clipboard-sanitized-write' || !main) return false
  try {
    return isDesktopAddress(new URL(address))
  } catch {
    return false
  }
}

export function installPermissions(session: Session): void {
  session.setPermissionRequestHandler(
    (_contents, permission, answer, details) => {
      answer(
        permissionAllowed(
          permission,
          details.isMainFrame,
          details.requestingUrl,
        ),
      )
    },
  )
  session.setPermissionCheckHandler((_contents, permission, origin, details) =>
    permissionAllowed(permission, details.isMainFrame, origin),
  )
  session.setDevicePermissionHandler(() => false)
  session.setDisplayMediaRequestHandler((_request, answer) => answer({}))
}
