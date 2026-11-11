import { readFileSync, writeFileSync } from 'node:fs'
import { readFile, realpath, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  app,
  autoUpdater,
  BrowserWindow,
  dialog,
  protocol,
  screen,
  session,
  shell,
} from 'electron'
import electronUpdater from 'electron-updater'
import { productName } from '../../docs/mockups/src/brand.js'

import {
  DESKTOP_ORIGIN,
  DESKTOP_SCHEME,
} from '../../worker/security/desktop-contract.js'
import { contentSecurityPolicy, readConfiguration } from './config.js'
import { startMacDevice } from './device/main.js'
import { workspaceDeviceAddress } from './device/notification.js'
import { installDownloads } from './downloads.js'
import { exportHandler, registerScheme } from './export-handler.js'
import { startDesktop } from './lifecycle.js'
import { installMenu } from './menu.js'
import { installNavigation } from './navigation.js'
import { installPermissions } from './permissions.js'
import { openPreviewInBrowser } from './preview.js'
import { createSignIn } from './sign-in.js'
import { startUpdates } from './updates.js'
import { createWindow } from './window.js'

// Never print an untrusted URL, callback token, cookie, or provider response.
const warn = () =>
  process.stderr.write(`${productName}: A desktop operation failed.\n`)
app.setName(productName)
registerScheme(protocol)
const profile = app.commandLine.getSwitchValue('user-data-dir')
if (profile) app.setPath('userData', resolve(profile))
let active: BrowserWindow | undefined
let signIn: ReturnType<typeof createSignIn>
let configuration: ReturnType<typeof readConfiguration>

const createAppWindow = () => {
  if (active && !active.isDestroyed()) return active
  const statePath = resolve(app.getPath('userData'), 'window.json')
  const window = createWindow({
    create: (options) => new BrowserWindow(options),
    readState: () => readFileSync(statePath, 'utf8'),
    saveState: (value) => writeFileSync(statePath, value, { mode: 0o600 }),
    visible: (bounds) =>
      screen
        .getAllDisplays()
        .some(
          ({ workArea }) =>
            bounds.x < workArea.x + workArea.width &&
            bounds.x + bounds.width > workArea.x &&
            bounds.y < workArea.y + workArea.height &&
            bounds.y + bounds.height > workArea.y,
        ),
    warn,
  })
  active = window
  installNavigation(window.webContents, configuration.appOrigin, {
    load: (url) => window.loadURL(url),
    external: (url) => shell.openExternal(url),
    signIn: (code) => signIn.start(code),
    preview: (url) =>
      openPreviewInBrowser(url, {
        appOrigin: configuration.appOrigin,
        frameSources: configuration.frameSources,
        fetch: (request) => window.webContents.session.fetch(request),
        external: (address) => shell.openExternal(address),
      }),
    warn,
  })
  return window
}

startDesktop({
  app,
  arguments: process.argv,
  warn,
  prepare: () => {
    const value: unknown = JSON.parse(
      readFileSync(
        resolve(app.getAppPath(), 'dist/bundle/build-config.json'),
        'utf8',
      ),
    )
    configuration = readConfiguration(value)
    if (process.platform === 'darwin')
      app.dock?.setIcon(
        resolve(app.getAppPath(), 'dist/bundle/conductive-icon-1024.png'),
      )
    const rendererSession = session.fromPartition('persist:conductive')
    installPermissions(rendererSession)
    installDownloads(rendererSession, () =>
      active && !active.isDestroyed() ? active.webContents : undefined,
    )
    rendererSession.protocol.handle(
      DESKTOP_SCHEME,
      exportHandler(
        { read: readFile, realpath, stat },
        resolve(app.getAppPath(), 'dist/bundle/web'),
        contentSecurityPolicy(configuration),
      ),
    )
    signIn = createSignIn({
      appOrigin: configuration.appOrigin,
      openExternal: (url) => shell.openExternal(url),
      exchange: (request) => fetch(request),
      saveCookie: (cookie) => rendererSession.cookies.set(cookie),
      flushCookies: () => rendererSession.cookies.flushStore(),
      signedIn: async (path) => {
        if (active && !active.isDestroyed()) {
          if (active.isMinimized()) active.restore()
          active.show()
          active.focus()
          await active.loadURL(`${DESKTOP_ORIGIN}${path}`)
        }
      },
    })
    startMacDevice({
      appOrigin: configuration.appOrigin,
      rendererSession,
      userData: app.getPath('userData'),
      requestImportConsent: async () => {
        const options = {
          type: 'question' as const,
          message: `Allow ${productName} to read your Conductor data?`,
          detail: `${productName} reads your local Conductor workspaces, with their chats and changed files, to list them. It sends the workspace list to ${productName} to show it in the app. It imports only the workspaces that you choose.`,
          buttons: ["Don't Allow", 'Allow'],
          defaultId: 1,
          cancelId: 0,
          noLink: true,
        }
        const result =
          active && !active.isDestroyed()
            ? await dialog.showMessageBox(active, options)
            : await dialog.showMessageBox(options)
        return result.response === 1
      },
      foreground: () =>
        Boolean(
          active &&
          !active.isDestroyed() &&
          active.isFocused() &&
          active.isVisible() &&
          !active.isMinimized(),
        ),
      openWorkspace: (request) => {
        if (!active || active.isDestroyed()) app.emit('activate')
        const window = active
        if (!window || window.isDestroyed()) return
        if (window.isMinimized()) window.restore()
        window.show()
        window.focus()
        void window.loadURL(workspaceDeviceAddress(request)).catch(warn)
      },
      warn,
    })
    if (app.isPackaged && process.platform === 'darwin')
      app.setAsDefaultProtocolClient('conductive')
    const updates = startUpdates({
      updater: electronUpdater.autoUpdater,
      nativeUpdater: autoUpdater,
      packaged: app.isPackaged,
      enabled: configuration.updates === 'enabled',
      choose: async (message, action) =>
        (
          await dialog.showMessageBox({
            type: 'info',
            title: productName,
            message,
            buttons: [action, 'Later'],
            cancelId: 1,
          })
        ).response === 0,
      inform: async (message) => {
        await dialog.showMessageBox({
          type: 'info',
          title: productName,
          message,
          buttons: ['OK'],
        })
      },
      every: (callback, milliseconds) => {
        const timer = setInterval(callback, milliseconds)
        return () => clearInterval(timer)
      },
      warn,
    })
    app.on('before-quit', updates.stop)
    installMenu(
      () => {
        void signIn.start().catch(warn)
      },
      updates.check,
      updates.available,
    )
  },
  createWindow: createAppWindow,
  receive: (address) => signIn.receive(address),
})
