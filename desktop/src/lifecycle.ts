import type { BrowserWindow } from 'electron'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'

interface DesktopApp {
  requestSingleInstanceLock(): boolean
  quit(): void
  whenReady(): Promise<unknown>
  on(
    event: 'open-url',
    handler: (event: { preventDefault(): void }, address: string) => void,
  ): void
  on(
    event: 'second-instance',
    handler: (event: unknown, arguments_: string[]) => void,
  ): void
  on(event: 'activate' | 'window-all-closed', handler: () => void): void
}

export interface LifecycleDependencies {
  app: DesktopApp
  arguments: readonly string[]
  prepare(): void
  createWindow(): Pick<
    BrowserWindow,
    'isDestroyed' | 'loadURL' | 'isMinimized' | 'restore' | 'show' | 'focus'
  >
  receive(address: string): Promise<boolean>
  warn(error: unknown): void
}

/** Register OS delivery before readiness. A second app never creates a window. */
export function startDesktop(dependencies: LifecycleDependencies): void {
  const { app } = dependencies
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }
  let ready = false
  let active: ReturnType<LifecycleDependencies['createWindow']> | undefined
  const queued: string[] = []
  const receive = (address: string) => {
    if (!ready) queued.push(address)
    else void dependencies.receive(address).catch(dependencies.warn)
  }
  const open = () => {
    if (!ready) return
    if (!active || active.isDestroyed()) {
      active = dependencies.createWindow()
      void active.loadURL(`${DESKTOP_ORIGIN}/`).catch(dependencies.warn)
    }
    if (active.isMinimized()) active.restore()
    active.show()
    active.focus()
  }
  app.on('open-url', (event, address) => {
    event.preventDefault()
    receive(address)
    open()
  })
  app.on('second-instance', (_event, arguments_) => {
    arguments_.forEach(receive)
    open()
  })
  app.on('activate', open)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  void app
    .whenReady()
    .then(() => {
      dependencies.prepare()
      ready = true
      open()
      ;[...queued.splice(0), ...dependencies.arguments].forEach(receive)
    })
    .catch((error) => {
      dependencies.warn(error)
      app.quit()
    })
}
