import { stat } from 'node:fs/promises'
import type { OperationContext } from './operations.ts'
import { json, record } from './remote-values.ts'
import { PreviewStorage } from './storage.ts'

export interface RunnerArchive {
  url: string
  sha256: string
  path?: string
}

export async function publishRunner(
  ctx: OperationContext,
  archive: RunnerArchive,
): Promise<'uploaded' | 'reused'> {
  const url = new URL(archive.url)
  const key = decodeURIComponent(url.pathname.slice(1))
  if (!key || key.endsWith('/'))
    throw new Error('Runner archive URL must name an object.')
  const storage = new PreviewStorage(ctx)
  const head = await storage.run([
    's3api',
    'head-object',
    '--bucket',
    'conductive-preview-runner',
    '--key',
    key,
  ])
  let size: number
  let uploaded = false
  if (head.exitCode === 0) {
    const metadata = record(json(head.stdout, 'R2'), 'R2 object metadata')
    if (
      typeof metadata.ContentLength !== 'number' ||
      !Number.isSafeInteger(metadata.ContentLength) ||
      metadata.ContentLength < 0
    )
      throw new Error('R2 returned an invalid archive size.')
    size = metadata.ContentLength
    if (archive.path && (await stat(archive.path)).size !== size)
      throw new Error(
        'Local runner archive size does not match the stored archive.',
      )
  } else {
    if (!/\((?:404|NoSuchKey|NotFound)\)/.test(head.stderr))
      throw new Error('R2 object metadata request failed.')
    if (!archive.path)
      throw new Error('The missing runner archive needs a local file.')
    size = (await stat(archive.path)).size
    const result = await storage.run([
      's3',
      'cp',
      archive.path,
      `s3://conductive-preview-runner/${key}`,
      '--content-type',
      'application/gzip',
      '--only-show-errors',
    ])
    if (result.exitCode !== 0) throw new Error('Runner archive upload failed.')
    uploaded = true
  }
  url.searchParams.set('preview-size-check', String(ctx.io.now()))
  let response: Response
  try {
    response = await ctx.io.fetch(
      new Request(url, {
        method: 'HEAD',
        redirect: 'error',
        cache: 'no-store',
      }),
    )
  } catch {
    throw new Error('Could not read the public runner archive.')
  }
  if (!response.ok)
    throw new Error(`Public runner archive returned HTTP ${response.status}.`)
  const length = response.headers.get('Content-Length')
  if (length === null || !/^\d+$/.test(length) || Number(length) !== size)
    throw new Error(
      'Public runner archive size does not match the stored archive.',
    )
  return uploaded ? 'uploaded' : 'reused'
}
