import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { build } from 'vite'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { filePaths } from '../../src/shared/files.js'

export const downloadBytes = [0, 128, 255, 10, 239, 187, 191]
export const downloadName = 'authorized.bin'

/** Load the real browser download module into the bundled renderer. */
export async function installDownloadFlow(page: Page, appOrigin: string) {
  const result = await build({
    configFile: false,
    root: resolve(import.meta.dirname, '../..'),
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: 'src/files/page/fetched-download.ts',
        formats: ['iife'],
        name: 'ConductiveDownloadTest',
      },
    },
  })
  const outputs = Array.isArray(result)
    ? result
    : 'output' in result
      ? [result]
      : []
  const chunk = outputs
    .flatMap((output) => output.output)
    .find((output) => output.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk')
    throw new Error('The download fixture has no script.')
  await page.evaluate(
    `${chunk.code}\nglobalThis.ConductiveDownloadTest = ConductiveDownloadTest`,
  )
  const address = new URL(
    filePaths.download(
      'download-org',
      'download-workspace',
      `folder/${downloadName}`,
    ),
    appOrigin,
  ).href
  let permitted = true
  const requests: { cookie: string | undefined; origin: string | undefined }[] =
    []
  await page.route(address, async (route) => {
    const headers = await route.request().allHeaders()
    requests.push({ cookie: headers.cookie, origin: headers.origin })
    await route.fulfill({
      status: permitted ? 200 : 403,
      headers: {
        'Access-Control-Allow-Origin': DESKTOP_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
      body: Buffer.from(downloadBytes),
    })
  })
  await page.evaluate(
    async (input) => {
      const module: typeof import('../../src/files/page/fetched-download') =
        Reflect.get(globalThis, 'ConductiveDownloadTest')
      const unavailable = async () => {
        throw new Error('Unexpected file API call')
      }
      const client = {
        downloadHref: () => input.address,
        readTree: unavailable,
        readChanges: unavailable,
        readFile: unavailable,
        readDiff: unavailable,
      }
      const download = module.fetchedDownload(
        (resource) => fetch(resource, { credentials: 'include' }),
        module.saveFromMemory,
      )
      const button = document.createElement('button')
      button.textContent = 'Download authorized file'
      button.addEventListener('click', async () => {
        button.dataset.result = String(await download(client, input.name))
      })
      document.body.append(button)
    },
    {
      address,
      name: downloadName,
    },
  )
  return {
    requests,
    refuse: () => {
      permitted = false
    },
  }
}

export async function addBlobLink(page: Page, name: string): Promise<void> {
  await page.evaluate((filename) => {
    const link = document.createElement('a')
    link.textContent = filename
    link.download = filename
    link.href = URL.createObjectURL(new Blob(['Untrusted bytes']))
    document.body.append(link)
  }, name)
}
