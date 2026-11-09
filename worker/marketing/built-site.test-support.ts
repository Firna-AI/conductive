import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

import { SITE_FOLDER } from '../../src/shared/site-build'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { SiteBinding, type SiteAssetFile } from '../test-support/site-binding'

export async function buildSiteAssets(folder: string): Promise<SiteBinding> {
  await promisify(execFile)(
    'node_modules/.bin/astro',
    ['build', '--outDir', folder],
    {
      env: isolatedProcessEnvironment({ PATH: process.env.PATH, CI: 'true' }),
    },
  )
  const files = new Map<string, SiteAssetFile>()
  const types: Readonly<Record<string, string>> = {
    html: 'text/html',
    json: 'application/json',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    png: 'image/png',
    woff2: 'font/woff2',
  }
  for (const entry of await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue
    const path = join(entry.parentPath, entry.name)
    files.set(`/${SITE_FOLDER}/${relative(folder, path)}`, {
      body: new Uint8Array(await readFile(path)),
      contentType:
        types[entry.name.split('.').at(-1) ?? ''] ?? 'application/octet-stream',
    })
  }
  return new SiteBinding(files)
}
