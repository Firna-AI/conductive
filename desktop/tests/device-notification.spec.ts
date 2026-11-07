import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { hostname } from 'node:os'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import type { Notification as NativeNotification } from 'electron'

import { readConfiguration } from '../src/config.js'
import { workspaceDeviceAddress } from '../src/device/notification.js'
import {
  deviceSessionEndpoint,
  installDeviceNetwork,
} from './device-network.js'
import { deviceRelay } from './device-relay.js'
import { command } from './device-support.js'
import { signInThroughMain } from './sign-in-journey.js'

test('a notification reopens one Mac window and keeps the request after Dock activation', async () => {
  test.skip(
    process.platform !== 'darwin',
    'Only macOS keeps the app alive after its last window closes.',
  )
  const desktop = resolve(import.meta.dirname, '..')
  const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'notification-profile-'))
  const relay = await deviceRelay()
  const packaged = process.env.CONDUCTIVE_PACKAGED_APP
  let electron: ElectronApplication | undefined
  try {
    electron = await _electron.launch({
      ...(packaged ? { executablePath: packaged } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      cwd: desktop,
    })
    const firstPage = await electron.firstWindow()
    const configuration: unknown = JSON.parse(
      await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
    )
    const { appOrigin } = readConfiguration(configuration)
    const shellSession = await deviceSessionEndpoint(firstPage, appOrigin)
    await shellSession(false)
    await installDeviceNetwork(electron, appOrigin, relay.port)
    await signInThroughMain(electron, appOrigin)
    await expect(
      firstPage.getByRole('link', { name: 'Account', exact: true }),
    ).toBeVisible()
    await shellSession(true)
    const connection = await relay.connection(0)
    // Capture the native delivery boundary. The real notification click handler stays installed.
    await electron.evaluate(({ Notification, BrowserWindow }) => {
      Notification.prototype.show = function (this: NativeNotification) {
        Reflect.set(globalThis, 'conductivePendingNotice', this)
      }
      BrowserWindow.getAllWindows()[0].close()
    })
    await expect
      .poll(() =>
        electron!.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
      )
      .toBe(0)
    const request = command({
      device: connection.device,
      deviceName: hostname(),
      folder: profile,
    })
    connection.send({ type: 'command.request', request })
    await expect
      .poll(() =>
        electron!.evaluate(() =>
          Reflect.has(globalThis, 'conductivePendingNotice'),
        ),
      )
      .toBe(true)
    const opened = electron.waitForEvent('window')
    await electron.evaluate(() => {
      const notice: unknown = Reflect.get(globalThis, 'conductivePendingNotice')
      if (typeof notice !== 'object' || notice === null)
        throw new Error('The native notice is missing')
      Reflect.apply(Reflect.get(notice, 'emit'), notice, ['click'])
    })
    const page = await opened
    const address = workspaceDeviceAddress(request)
    await expect(page).toHaveURL(address)
    // Wait for any real navigation started by activation before reading its final URL.
    const activated = await electron.evaluate(
      async ({ app, BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0]
        const load = window.loadURL.bind(window)
        const pending: Promise<void>[] = []
        window.loadURL = (url, options) => {
          const result = load(url, options)
          pending.push(result)
          return result
        }
        try {
          app.emit('activate')
          await Promise.all(pending)
        } finally {
          window.loadURL = load
        }
        return {
          windows: BrowserWindow.getAllWindows().length,
          url: window.webContents.getURL(),
        }
      },
    )
    expect(activated).toEqual({ windows: 1, url: address })
    await expect(page).toHaveURL(address)
  } finally {
    await electron?.close()
    await relay.close()
    await rm(profile, { recursive: true, force: true })
  }
})
