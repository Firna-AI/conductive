import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import { productName } from '../../docs/mockups/src/brand.js'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'
import { readConfiguration } from '../src/config.js'
import {
  addBlobLink,
  downloadBytes,
  downloadName,
  installDownloadFlow,
} from './download-flow.js'
import { desktop, launchWindow } from './window-shell.js'

const evidence = resolve(desktop, '../.context/milestone-15i/desktop-download')

test('saves authorized main-frame file bytes and refuses other download sources', async () => {
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'profile-'))
  const downloads = resolve(profile, 'downloads')
  await mkdir(downloads)
  let electron: ElectronApplication | undefined
  try {
    electron = await launchWindow(profile)
    const app = electron
    const page = await app.firstWindow()
    await expect(page).toHaveTitle(productName)
    const configuration: unknown = JSON.parse(
      await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
    )
    const { appOrigin } = readConfiguration(configuration)
    await app.evaluate(
      async ({ BrowserWindow }, input) => {
        const trusted = BrowserWindow.getAllWindows()[0].webContents
        const records: {
          name: string
          blocked: boolean
          origin: string
          mainFrame: boolean
          mainWindow: boolean
          state: string
        }[] = []
        const publish = () => {
          process.env.CONDUCTIVE_TEST_DOWNLOADS = JSON.stringify(records)
        }
        trusted.session.on('will-download', (event, item, contents, frame) => {
          const record = {
            name: item.getFilename(),
            blocked: event.defaultPrevented,
            origin: item.getInitiatorOrigin(),
            mainFrame: frame === contents.mainFrame,
            mainWindow: contents === trusted,
            state: event.defaultPrevented ? 'blocked' : 'pending',
          }
          records.push(record)
          if (!event.defaultPrevented) {
            item.setSavePath(input.downloads + '/' + record.name)
            item.once('done', (_event, state) => {
              record.state = state
              publish()
            })
          }
          publish()
        })
        const original = globalThis.fetch
        globalThis.fetch = async (resource, options) => {
          const request =
            resource instanceof Request
              ? resource
              : new Request(resource, options)
          return request.url.startsWith(input.appOrigin + '/api/')
            ? new Response(null, { status: 401 })
            : original(resource, options)
        }
        await trusted.session.cookies.set({
          url: input.appOrigin,
          name: input.cookie,
          value: 'download-test-session',
          secure: true,
          httpOnly: true,
          sameSite: 'no_restriction',
        })
      },
      { downloads, appOrigin, cookie: DESKTOP_SESSION_COOKIE },
    )
    const flow = await installDownloadFlow(page, appOrigin)
    const records = (): Promise<unknown> =>
      app.evaluate(() =>
        JSON.parse(process.env.CONDUCTIVE_TEST_DOWNLOADS ?? '[]'),
      )
    const accepted = {
      name: downloadName,
      blocked: false,
      origin: DESKTOP_ORIGIN,
      mainFrame: true,
      mainWindow: true,
      state: 'completed',
    }
    await page.getByRole('button', { name: 'Download authorized file' }).click()
    await expect.poll(records).toEqual([accepted])
    expect([...(await readFile(resolve(downloads, downloadName)))]).toEqual(
      downloadBytes,
    )
    expect(flow.requests).toEqual([
      {
        cookie: `${DESKTOP_SESSION_COOKIE}=download-test-session`,
        origin: DESKTOP_ORIGIN,
      },
    ])
    flow.refuse()
    await page.getByRole('button', { name: 'Download authorized file' }).click()
    await expect(
      page.getByRole('button', { name: 'Download authorized file' }),
    ).toHaveAttribute('data-result', 'false')
    expect(await records()).toEqual([accepted])

    await page.evaluate(() => {
      const frame = document.createElement('iframe')
      frame.title = 'Untrusted download frame'
      frame.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-downloads')
      frame.srcdoc = '<a download="child.bin">Download child file</a>'
      document.body.append(frame)
    })
    const child = page.getByTitle('Untrusted download frame').contentFrame()
    await child.locator('a').evaluate((link: HTMLAnchorElement) => {
      link.href = URL.createObjectURL(new Blob(['Child bytes']))
    })
    await child.getByRole('link', { name: 'Download child file' }).click()
    const childResult = {
      name: 'child.bin',
      blocked: true,
      origin: DESKTOP_ORIGIN,
      mainFrame: false,
      mainWindow: true,
      state: 'blocked',
    }
    await expect.poll(records).toEqual([accepted, childResult])

    const previewAddress = appOrigin + '/download-preview'
    await page.route(previewAddress, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<a download="preview.bin">Download preview file</a>',
      }),
    )
    await page.evaluate((address) => {
      const frame = document.createElement('iframe')
      frame.title = 'Remote download preview'
      frame.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-downloads')
      frame.src = address
      document.body.append(frame)
    }, previewAddress)
    const preview = page.getByTitle('Remote download preview').contentFrame()
    await preview.locator('a').evaluate((link: HTMLAnchorElement) => {
      link.href = URL.createObjectURL(new Blob(['Preview bytes']))
    })
    await preview.getByRole('link', { name: 'Download preview file' }).click()
    const previewResult = {
      name: 'preview.bin',
      blocked: true,
      origin: appOrigin,
      mainFrame: false,
      mainWindow: true,
      state: 'blocked',
    }
    await expect.poll(records).toEqual([accepted, childResult, previewResult])

    const opened = app.waitForEvent('window')
    await app.evaluate(async ({ BrowserWindow }, origin) => {
      const other = new BrowserWindow({
        webPreferences: {
          partition: 'persist:conductive',
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
        },
      })
      await other.loadURL(origin + '/')
    }, DESKTOP_ORIGIN)
    const other = await opened
    await addBlobLink(other, 'other-window.bin')
    await other.getByRole('link', { name: 'other-window.bin' }).click()
    const windowResult = {
      name: 'other-window.bin',
      blocked: true,
      origin: DESKTOP_ORIGIN,
      mainFrame: true,
      mainWindow: false,
      state: 'blocked',
    }
    await expect
      .poll(records)
      .toEqual([accepted, childResult, previewResult, windowResult])
    await page.evaluate(() => {
      const link = document.createElement('a')
      link.download = 'data.bin'
      link.href =
        'data:application/octet-stream;base64,VGhpcyBpcyBub3QgYSBmaWxlIHJlc3BvbnNl'
      link.textContent = 'Download data address'
      document.body.append(link)
    })
    await page.getByRole('link', { name: 'Download data address' }).click()
    const dataResult = {
      name: 'data.bin',
      blocked: true,
      origin: DESKTOP_ORIGIN,
      mainFrame: true,
      mainWindow: true,
      state: 'blocked',
    }
    await expect
      .poll(records)
      .toEqual([accepted, childResult, previewResult, windowResult, dataResult])
    expect(await readdir(downloads)).toEqual([downloadName])
    await writeFile(
      resolve(evidence, 'sources.json'),
      JSON.stringify(await records(), null, 2) + '\n',
    )
  } finally {
    await electron?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
