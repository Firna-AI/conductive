import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { refusedReport } from '../../test-support/recorded-repairs'
import { clientFor, emptyChanges } from '../files-test-kit'

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

it('reads each list cutoff and keeps the optional fields of both lists', async () => {
  const server = new FakeApiServer()
  const stateRead = {
    eventNumber: 18,
    repositoryId: 'repo-1',
    failure: {
      eventNumber: 16,
      occurredAt: FAKE_TIME,
      event: refusedReport('files.snapshot', true),
    },
  }
  // The saved tree of a failed read keeps the omitted count of its report.
  const tree = {
    ...toolFixtures().files,
    unavailable: true,
    omittedEntryCount: 18_412,
  }
  const changes = {
    ...emptyChanges,
    displayBaseBranch: 'masked',
    unpushedCommits: 0,
    uncommittedFileCount: 4,
    omitted: { files: 1_243, added: 31_004, removed: 9_877 },
  }
  const changesRead = { eventNumber: 23, repositoryId: null, failure: null }
  server.json('GET', filePaths.tree(org, id), { ...tree, stateRead })
  server.json('GET', filePaths.changes(org, id), {
    ...changes,
    stateRead: changesRead,
  })
  const client = clientFor(server.fetch)

  expect(await client.readTree()).toEqual({ ok: true, value: tree, stateRead })
  expect(await client.readChanges()).toEqual({
    ok: true,
    value: changes,
    stateRead: changesRead,
  })
})

it('keeps each list and its zero totals, and drops omitted totals that are not safe counts', async () => {
  const tree = { revision: 3, entries: [] }
  const readTree = (omittedEntryCount: unknown) =>
    clientFor(async () =>
      Response.json({ ...tree, omittedEntryCount }),
    ).readTree()
  const readChanges = (omitted: unknown) =>
    clientFor(async () =>
      Response.json({ ...emptyChanges, omitted }),
    ).readChanges()
  const zero = { files: 0, added: 0, removed: 0 }

  expect(await readTree(0)).toEqual({
    ok: true,
    value: { ...tree, omittedEntryCount: 0 },
  })
  expect(await readChanges(zero)).toEqual({
    ok: true,
    value: { ...emptyChanges, omitted: zero },
  })
  for (const count of [undefined, null, -1, 1.5, 2 ** 53, '12']) {
    expect(await readTree(count), String(count)).toEqual({
      ok: true,
      value: tree,
    })
  }
  for (const omitted of [
    undefined,
    'all',
    { files: 1, added: 2 },
    { files: 1, added: -2, removed: 0 },
    { files: 2 ** 53, added: 0, removed: 0 },
  ]) {
    const name = String(JSON.stringify(omitted))
    expect(await readChanges(omitted), name).toEqual({
      ok: true,
      value: emptyChanges,
    })
  }
})

it('takes a cutoff only from an authorized unavailable list with readable state', async () => {
  const stateRead = { eventNumber: 12, repositoryId: 'repo-1', failure: null }
  const read = (status: number, body: unknown, code = 'file_unavailable') =>
    clientFor(async () =>
      Response.json({ error: { code }, stateRead: body }, { status }),
    ).readChanges()
  const failed = (status: number, code = 'file_unavailable') => ({
    ok: false,
    error: { kind: 'failed', status, code },
  })

  expect(await read(503, stateRead)).toEqual({ ...failed(503), stateRead })
  expect(await read(502, stateRead)).toEqual(failed(502))
  expect(await read(403, stateRead, 'forbidden')).toEqual(
    failed(403, 'forbidden'),
  )
  expect(await read(503, stateRead, 'sandbox_unavailable')).toEqual(
    failed(503, 'sandbox_unavailable'),
  )
  expect(await read(503, undefined)).toEqual(failed(503))
  expect(await read(503, { ...stateRead, eventNumber: -1 })).toEqual(
    failed(503),
  )
})

it('keeps a valid list when its cutoff, repository, or repair is unreadable', async () => {
  const tree = { revision: 0, entries: [] }
  const stateRead = { eventNumber: 0, repositoryId: null, failure: null }
  const failure = {
    eventNumber: 1,
    occurredAt: FAKE_TIME,
    event: refusedReport('changes.updated', true),
  }
  const read = (state: unknown, revision: unknown = 0) =>
    clientFor(async () =>
      Response.json({ ...tree, revision, stateRead: state }),
    ).readTree()

  expect(await read(stateRead)).toEqual({ ok: true, value: tree, stateRead })
  for (const unreadable of [
    { ...stateRead, eventNumber: 2 ** 53 },
    { ...stateRead, repositoryId: 12 },
    { ...stateRead, failure: undefined },
    { ...stateRead, failure },
    { ...stateRead, eventNumber: 2, failure },
  ]) {
    expect(await read(unreadable)).toEqual({ ok: true, value: tree })
  }
  expect(await read(stateRead, 'invalid')).toEqual({
    ok: false,
    error: { kind: 'failed', status: 200, code: 'invalid_response' },
  })
})

it('takes no cutoff when a list fetch resolves after the request is aborted', async () => {
  const controller = new AbortController()
  const client = clientFor(async () =>
    Response.json({
      revision: 0,
      entries: [],
      stateRead: { eventNumber: 12, repositoryId: null, failure: null },
    }),
  )
  const reading = client.readTree(controller.signal)
  controller.abort()

  expect(await reading).toEqual({ ok: false, error: { kind: 'aborted' } })
})
