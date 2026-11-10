import { spawn } from 'node:child_process'

import { expect, it, onTestFinished, vi } from 'vitest'

import { FakeChild } from '../test-support/child'
import { importRunnerFixture } from '../test-support/import'
import { importDigest } from './import-storage'
import {
  importLfsTransport,
  type ImportLfsTransport,
} from './import-lfs-transport'

vi.mock('node:child_process', async (original) => {
  const native = await original<typeof import('node:child_process')>()
  return { ...native, spawn: vi.fn(native.spawn) }
})

const payload = Buffer.from('exact repository payload\n')
const oid = importDigest(payload)
const pointer = `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${payload.length}\n`

async function lfsFixture(
  mode: 'valid' | 'corrupt' | 'cross-host credential' = 'valid',
  credential?: ImportLfsTransport['credential'],
) {
  const requests: { url: string; headers: Headers; body: unknown }[] = []
  const credentials: string[] = []
  const transport: ImportLfsTransport = {
    credential: async (id, signal) => {
      credentials.push(id)
      return credential ? credential(id, signal) : 'github-private-token'
    },
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      requests.push({
        url,
        headers: new Headers(init?.headers),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
      if (url.endsWith('/objects/batch'))
        return Response.json({
          objects: [
            {
              oid,
              size: payload.length,
              actions: {
                download: {
                  href: 'https://objects.example.test/exact-payload?signature=private',
                  header:
                    mode === 'cross-host credential'
                      ? { Authorization: 'Bearer github-private-token' }
                      : { 'X-LFS-Action': 'only-this-action' },
                },
              },
            },
          ],
        })
      return new Response(
        new Uint8Array(
          mode === 'corrupt' ? Buffer.alloc(payload.length, 1) : payload,
        ),
      )
    },
  }
  const h = await importRunnerFixture(
    { lfs: transport },
    { 'payload.bin': pointer, 'literal-pointer.bin': pointer },
  )
  h.addFileObject('literal-pointer', Buffer.from(pointer))
  h.entries.push({
    kind: 'file',
    path: 'literal-pointer.bin',
    mode: '100644',
    objectId: 'literal-pointer',
  })
  h.snapshot.recordCount = h.entries.length
  h.snapshot.gitDisk.lfs = {
    cacheObjectCount: 1,
    cacheBytes: payload.length,
    checkoutPathCount: 2,
    checkoutBytes: payload.length * 2,
  }
  await h.runner.start(false)
  await h.metadata()
  await h.deliver()
  return { ...h, requests, credentials }
}

it('verifies HEAD LFS facts and downloads only non-overridden payloads with scoped action headers', async () => {
  const native =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    )
  let helperOutput = '  github-private-token\r\n'
  vi.stubEnv('CONDUCTIVE_TURN_ID', 'ambient-turn')
  vi.stubEnv('CONDUCTIVE_ACTIVATION_ID', 'ambient-activation')
  vi.stubEnv('CONDUCTIVE_WORKSPACE_TOKEN', 'synthetic-workspace-token')
  vi.mocked(spawn).mockImplementation((executable, args, options) => {
    if (!Array.isArray(args) || args.length !== 1 || args[0] !== 'token')
      return native.spawn(executable, args, options)
    const child = new FakeChild()
    queueMicrotask(() => {
      child.stdout.write(helperOutput.slice(0, 10))
      child.stdout.end(helperOutput.slice(10))
      child.emit('close', 0, null)
    })
    return child
  })
  onTestFinished(() => {
    vi.mocked(spawn).mockImplementation(native.spawn)
    vi.unstubAllEnvs()
  })
  const h = await lfsFixture('valid', importLfsTransport.credential)
  expect((await h.command({ kind: 'restore' }))?.result).toEqual({ ok: true })
  expect(await h.read('payload.bin')).toEqual(payload)
  expect(await h.read('literal-pointer.bin')).toEqual(Buffer.from(pointer))
  expect(h.credentials).toEqual(['activation-test'])
  const helpers = vi
    .mocked(spawn)
    .mock.calls.filter(([, args]) => Array.isArray(args) && args[0] === 'token')
  expect(helpers).toHaveLength(1)
  expect(helpers[0][0]).toBe('/usr/local/bin/conductive-git-credential')
  expect(helpers[0][1]).toEqual(['token'])
  expect(helpers[0][2]?.env?.CONDUCTIVE_TURN_ID).toBe('')
  expect(helpers[0][2]?.env?.CONDUCTIVE_ACTIVATION_ID).toBe('activation-test')
  expect(helpers[0][2]?.env?.CONDUCTIVE_WORKSPACE_TOKEN).toBe(
    'synthetic-workspace-token',
  )
  expect(helpers[0][2]?.signal).toBeInstanceOf(AbortSignal)
  expect(helpers[0][2]?.stdio).toEqual(['ignore', 'pipe', 'ignore'])
  expect(h.requests.map((request) => request.url)).toEqual([
    'https://github.com/example/repository.git/info/lfs/objects/batch',
    'https://objects.example.test/exact-payload?signature=private',
  ])
  expect(h.requests[0].body).toEqual({
    operation: 'download',
    transfers: ['basic'],
    objects: [{ oid, size: payload.length }],
  })
  expect(h.requests[0].headers.get('Authorization')).toBe(
    `Basic ${Buffer.from('x-access-token:github-private-token').toString('base64')}`,
  )
  expect([...h.requests[1].headers]).toEqual([
    ['x-lfs-action', 'only-this-action'],
  ])
  for (const invalid of ['', 'first-token\nsecond-token\n']) {
    helperOutput = invalid
    await expect(
      importLfsTransport.credential(
        'activation-test',
        new AbortController().signal,
      ),
    ).rejects.toThrow(
      'The repository file could not be downloaded. Your stored work is kept. Try again.',
    )
  }
})

it.each(['corrupt', 'cross-host credential'] as const)(
  'keeps the checkout unchanged when the LFS action is %s',
  async (mode) => {
    const h = await lfsFixture(mode)
    expect((await h.command({ kind: 'restore' }))?.result).toMatchObject({
      ok: false,
    })
    expect(await h.git('branch', '--show-current')).toBe('main')
    expect(await h.read('payload.bin')).toEqual(Buffer.from(pointer))
    expect(
      h.requests.filter((request) => !request.url.endsWith('/objects/batch')),
    ).toHaveLength(mode === 'corrupt' ? 1 : 0)
  },
)
