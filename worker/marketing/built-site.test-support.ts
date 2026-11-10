import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

import { SITE_FOLDER } from '../../src/shared/site-build'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { SiteBinding, type SiteAssetFile } from '../test-support/site-binding'
import { inlineStyles } from './html.test-support'

/** The content types of the files that the Astro build writes. */
const types: Readonly<Record<string, string>> = {
  html: 'text/html',
  json: 'application/json',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  png: 'image/png',
  woff2: 'font/woff2',
}

/**
 * Builds the Astro site once into a temporary folder, and serves its files
 * from memory through a fake static assets binding. The folder is removed
 * on every exit, also when the build or a file read fails.
 */
export async function buildSiteAssets(): Promise<SiteBinding> {
  const folder = await mkdtemp(join(tmpdir(), 'conductive-site-'))
  try {
    await promisify(execFile)(
      'node_modules/.bin/astro',
      ['build', '--force', '--outDir', folder],
      {
        env: isolatedProcessEnvironment({
          PATH: process.env.PATH,
          CI: 'true',
        }),
      },
    )
    const files = new Map<string, SiteAssetFile>()
    for (const entry of await readdir(folder, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile()) continue
      const path = join(entry.parentPath, entry.name)
      files.set(`/${SITE_FOLDER}/${relative(folder, path)}`, {
        body: new Uint8Array(await readFile(path)),
        contentType:
          types[entry.name.split('.').at(-1) ?? ''] ??
          'application/octet-stream',
      })
    }
    return new SiteBinding(files)
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

/** The content security policy that a built page with these styles needs. */
export function expectedPolicy(page: string) {
  const hashes = inlineStyles(page).map(
    (css) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  )
  return [
    "default-src 'none'",
    `style-src ${hashes.join(' ')}`,
    "img-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}
