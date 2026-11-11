import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { _electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { build, preview } from 'vite'
import type { PreviewServer } from 'vite'

import { desktop, evidence } from './window-shell.js'

/** The size of the plain window, in the options of `BrowserWindow`. */
export interface EntryWindow {
  width: number
  height: number
  /** The size is that of the page, without the frame of the window. */
  useContentSize?: boolean
  /** A phone fixture has no native window frame around its content. */
  frame?: boolean
}

/**
 * Builds the web entry of the app afresh, serves it at a local address,
 * and opens a plain Electron window with no preload, as a browser tab.
 * Electron supplies Chromium on each CI host. `run` gets the page and the
 * origin of the build. The window, the server, and the files go after it,
 * also when it fails.
 */
export async function withBrowserEntry(
  name: string,
  window: EntryWindow,
  run: (entry: { page: Page; origin: string }) => Promise<void>,
): Promise<void> {
  await mkdir(evidence, { recursive: true })
  const directory = await mkdtemp(resolve(evidence, `${name}-`))
  const site = resolve(directory, 'site')
  const repository = resolve(desktop, '..')
  let server: PreviewServer | undefined
  let electron: ElectronApplication | undefined
  try {
    await build({
      configFile: false,
      root: repository,
      plugins: [react()],
      logLevel: 'error',
      build: { outDir: site, emptyOutDir: true },
    })
    server = await preview({
      configFile: false,
      root: repository,
      logLevel: 'warn',
      build: { outDir: site },
      preview: { host: '127.0.0.1', port: 0 },
    })
    const address = server.resolvedUrls?.local[0]
    if (!address) throw new Error('The browser build has no preview address')
    const host = resolve(directory, 'browser.mjs')
    await writeFile(
      host,
      `import { app, BrowserWindow } from 'electron';
app.setPath('userData', ${JSON.stringify(resolve(directory, 'profile'))});
void app.whenReady().then(async () => {
const window = new BrowserWindow({...${JSON.stringify(window)}, webPreferences: {
  contextIsolation: true, sandbox: true, nodeIntegration: false
}});
await window.loadURL('about:blank');
});
app.on('window-all-closed', () => app.quit());
`,
    )
    electron = await _electron.launch({
      args: [host, '--lang=en-GB'],
      cwd: desktop,
      env: { ...process.env, TZ: 'UTC' },
    })
    const page = await electron.firstWindow()
    await run({ page, origin: new URL(address).origin })
  } finally {
    await electron?.close()
    await server?.close()
    await rm(directory, { recursive: true, force: true })
  }
}
