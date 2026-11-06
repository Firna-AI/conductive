import { hostname } from 'node:os'
import { resolve } from 'node:path'
import { app, Notification, powerMonitor } from 'electron'
import type { Cookie, Session } from 'electron'

import type { DeviceCommandRecord } from '../../../src/shared/device.ts'
import { DESKTOP_SESSION_COOKIE } from '../../../worker/security/desktop-contract.js'
import { deviceClock } from './clock.js'
import { createDeviceConnection } from './connection.js'
import { desktopCredential, deviceAccount } from './credentials.js'
import { privateDeviceFiles, stableDeviceId } from './files.js'
import { notifyCommand } from './notification.js'
import { createPermissionStore } from './permissions.js'
import { localCommandLauncher } from './process.js'
import { runCommand } from './runner.js'
import { createDeviceSession } from './session.js'
import { connectDevice } from './transport.js'

interface MainDeviceDependencies {
  appOrigin: string
  userData: string
  rendererSession: Session
  foreground(): boolean
  openWorkspace(request: DeviceCommandRecord): void
  warn(): void
}

/** All OS access stays in main. Approval and settings use the Worker relay. */
export function startMacDevice(dependencies: MainDeviceDependencies): void {
  try {
    const { appOrigin, rendererSession, warn } = dependencies
    const files = privateDeviceFiles(resolve(dependencies.userData, 'device'))
    const deviceId = stableDeviceId(files)
    const launch = localCommandLauncher()
    const connection = createDeviceConnection({
      deviceId,
      clock: deviceClock,
      readCredential: async () =>
        desktopCredential(
          await rendererSession.cookies.get({
            url: appOrigin,
            name: DESKTOP_SESSION_COOKIE,
          }),
          appOrigin,
          deviceClock.now(),
        ),
      authenticate: (credential, signal) =>
        deviceAccount(appOrigin, credential, signal),
      connect: (credential, events) =>
        connectDevice({
          appOrigin,
          deviceId,
          deviceName: hostname(),
          credential,
          events,
        }),
      session: (userId, pairing, send, invalid) =>
        createDeviceSession({
          userId,
          pairing,
          send,
          invalid,
          warn,
          permissions: createPermissionStore({
            userId,
            files,
            deviceName: hostname(),
            clock: deviceClock,
            warn,
          }),
          run: (request) => runCommand(request, { clock: deviceClock, launch }),
          notify: (request) =>
            notifyCommand(request, {
              foreground: dependencies.foreground,
              create: (options) =>
                Notification.isSupported()
                  ? new Notification(options)
                  : undefined,
              open: dependencies.openWorkspace,
              warn,
            }),
        }),
      warn,
    })
    const changed = (_event: unknown, cookie: Cookie) => {
      if (
        cookie.name === DESKTOP_SESSION_COOKIE &&
        cookie.domain === new URL(appOrigin).hostname
      )
        void connection.cookieChanged()
    }
    const wake = () => {
      void connection.wake()
    }
    rendererSession.cookies.on('changed', changed)
    powerMonitor.on('suspend', connection.sleep)
    powerMonitor.on('resume', wake)
    app.once('before-quit', () => {
      rendererSession.cookies.removeListener('changed', changed)
      powerMonitor.removeListener('suspend', connection.sleep)
      powerMonitor.removeListener('resume', wake)
      connection.stop()
    })
    void connection.start()
  } catch {
    dependencies.warn()
  }
}
