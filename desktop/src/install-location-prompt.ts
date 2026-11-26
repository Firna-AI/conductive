import { app, dialog } from 'electron'
import { productName } from '../../src/shared/brand.js'

import { offerApplicationsMove } from './install-location.js'

/**
 * Offer to move a copy that cannot update itself into Applications.
 * The alert has no parent window, as the update dialogs do.
 */
export async function offerApplicationsMoveAtLaunch(dependencies: {
  enabled: boolean
  warn(error: unknown): void
}): Promise<void> {
  await offerApplicationsMove({
    packaged: app.isPackaged,
    enabled: dependencies.enabled,
    platform: process.platform,
    version: app.getVersion(),
    executable: app.getPath('exe'),
    userData: app.getPath('userData'),
    inApplications: () => app.isInApplicationsFolder(),
    choose: async () => {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: productName,
        message: `Move ${productName} to Applications to get updates.`,
        buttons: ['Move to Applications', 'Not now'],
        cancelId: 1,
      })
      return response === 0 ? 'move' : 'not-now'
    },
    move: () => app.moveToApplicationsFolder(),
    warn: dependencies.warn,
  })
}
