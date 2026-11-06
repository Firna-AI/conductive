import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { clientFor } from '../files-test-kit'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace
const path = 'src/app/checkout/AddressForm.tsx'

it('reads the file routes of the workspace and keeps the entries that parse', async () => {
  const server = new FakeApiServer()
  server.json('GET', filePaths.tree(org, id), {
    revision: 4,
    entries: [
      { path: 'src', name: 'src', kind: 'directory', change: null },
      { path: 'src/a.ts', name: 'a.ts', kind: 'file', change: 'added' },
      { path: 'src/b.ts', name: 'b.ts', kind: 'socket', change: null },
      { path: 'src/c.ts', name: 'c.ts', kind: 'file', change: 'copied' },
    ],
  })
  const client = clientFor(server.fetch)
  const tree = await client.readTree()
  const file = await client.readFile(path)
  expect(tree).toEqual({
    ok: true,
    value: {
      revision: 4,
      entries: [
        { path: 'src', name: 'src', kind: 'directory', change: null },
        { path: 'src/a.ts', name: 'a.ts', kind: 'file', change: 'added' },
        { path: 'src/c.ts', name: 'c.ts', kind: 'file', change: null },
      ],
    },
  })
  expect(file.ok && file.value.path).toBe(path)
  expect(
    server.requests.map(
      (request) => new URL(request.url).pathname + new URL(request.url).search,
    ),
  ).toEqual([filePaths.tree(org, id), filePaths.content(org, id, path)])
})

it('maps each failed read to the error that the page shows', async () => {
  const server = new FakeApiServer()
  const content = (name: string) => filePaths.content(org, id, name)
  server.json(
    'GET',
    content('big.json'),
    {
      error: {
        code: 'file_too_large',
        message: 'Too large.',
        sizeBytes: 3_407_872,
        limitBytes: 1_048_576,
      },
    },
    413,
  )
  server.json(
    'GET',
    content('gone.ts'),
    { error: { code: 'file_not_found', message: 'Gone.' } },
    404,
  )
  server.json(
    'GET',
    content('busy.ts'),
    { error: { code: 'file_unavailable', message: 'Busy.' } },
    503,
  )
  server.json('GET', content('odd.ts'), { path: 'odd.ts', encoding: 'utf-16' })
  const client = clientFor(server.fetch)
  const cases = [
    [
      'big.json',
      { kind: 'too-large', sizeBytes: 3_407_872, limitBytes: 1_048_576 },
    ],
    ['gone.ts', { kind: 'not-found' }],
    ['busy.ts', { kind: 'failed', status: 503, code: 'file_unavailable' }],
    ['odd.ts', { kind: 'failed', status: 200, code: 'invalid_response' }],
  ] as const
  for (const [name, error] of cases) {
    expect(await client.readFile(name), name).toEqual({ ok: false, error })
  }
  const offline = clientFor(() =>
    Promise.reject(new TypeError('Failed to fetch')),
  )
  expect(await offline.readDiff(path)).toEqual({
    ok: false,
    error: { kind: 'failed', status: null, code: null },
  })
})

it('gives the download address of a path in the workspace, with the path encoded', () => {
  const name = 'docs/Notes #1 & more?.md'
  const href = clientFor(new FakeApiServer().fetch).downloadHref(name)
  expect(href).toBe(filePaths.download(org, id, name))
  expect(new URL(href, 'https://app.test').searchParams.get('path')).toBe(name)
})
