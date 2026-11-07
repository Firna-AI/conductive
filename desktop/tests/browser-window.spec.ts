import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { build, preview } from 'vite'
import type { PreviewServer } from 'vite'

import {
  desktop,
  evidence,
  installWindowApi,
  workspacePath,
  workspaceTitle,
} from './window-shell.js'

test('the browser entry renders the workspace without desktop window controls', async () => {
  await mkdir(evidence, { recursive: true })
  const directory = await mkdtemp(resolve(evidence, 'browser-window-'))
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
    const origin = server.resolvedUrls?.local[0]
    if (!origin) throw new Error('The browser build has no preview address')
    // Electron supplies Chromium on each CI host. This host loads the web entry.
    const host = resolve(directory, 'browser.mjs')
    await writeFile(
      host,
      `import { app, BrowserWindow } from 'electron';
app.setPath('userData', ${JSON.stringify(resolve(directory, 'profile'))});
void app.whenReady().then(async () => {
const window = new BrowserWindow({width: 1296, height: 812, webPreferences: {
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
    await installWindowApi(page, new URL(origin).origin, false)
    await page.goto(new URL(workspacePath, origin).href)
    await expect(
      page.getByRole('heading', { name: workspaceTitle, exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: 'Workspaces', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Window controls' }),
    ).toHaveCount(0)
    // The native reserve is decorative and has no accessible name.
    await expect(page.locator('[data-desktop-window-space]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Hide the sidebar', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Back', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Forward', exact: true }),
    ).toHaveCount(0)
  } finally {
    await electron?.close()
    await server?.close()
    await rm(directory, { recursive: true, force: true })
  }
})
