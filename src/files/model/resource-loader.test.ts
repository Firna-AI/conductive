import { expect, it } from 'vitest'
import type { FilesResult } from '../api/files-errors'
import { deferred } from '../files-test-kit'
import { ResourceLoader } from './resource-loader'

function controlledLoader() {
  const replies = new Map<
    string,
    ReturnType<typeof deferred<FilesResult<string>>>
  >()
  const loader = new ResourceLoader<string>((key) => {
    const reply = deferred<FilesResult<string>>()
    replies.set(key, reply)
    return reply.promise
  })
  const answer = async (key: string, result: FilesResult<string>) => {
    const reply = replies.get(key)
    reply?.resolve(result)
    await reply?.promise
  }
  return { loader, answer }
}

it('shows the newest path when the reply for an older path comes last', async () => {
  const { loader, answer } = controlledLoader()
  loader.request('a.ts', '0.0')
  loader.request('b.ts', '0.0')
  await answer('b.ts', { ok: true, value: 'text of b' })
  await answer('a.ts', { ok: true, value: 'text of a' })
  expect(loader.getSnapshot()).toEqual({
    status: 'ready',
    key: 'b.ts',
    value: 'text of b',
    refreshing: false,
  })
})

it('keeps the shown text while a new version reads, then shows the new text', async () => {
  const { loader, answer } = controlledLoader()
  loader.request('a.ts', '0.0')
  await answer('a.ts', { ok: true, value: 'first' })
  loader.request('a.ts', '0.1')
  expect(loader.getSnapshot()).toEqual({
    status: 'ready',
    key: 'a.ts',
    value: 'first',
    refreshing: true,
  })
  await answer('a.ts', { ok: true, value: 'second' })
  expect(loader.getSnapshot()).toEqual({
    status: 'ready',
    key: 'a.ts',
    value: 'second',
    refreshing: false,
  })
})

it('reads the same path again on Try again after a failure', async () => {
  const { loader, answer } = controlledLoader()
  loader.request('a.ts', '0.0')
  await answer('a.ts', {
    ok: false,
    error: { kind: 'failed', status: 503, code: 'file_unavailable' },
  })
  expect(loader.getSnapshot()?.status).toBe('failed')
  loader.retry()
  expect(loader.getSnapshot()).toEqual({ status: 'loading', key: 'a.ts' })
  await answer('a.ts', { ok: true, value: 'text' })
  expect(loader.getSnapshot()).toMatchObject({ status: 'ready', value: 'text' })
})
