import { expect, it } from 'vitest'
import {
  apiReply,
  commandReply,
  d1Reply,
  fakeContext,
} from './operations.test-support.ts'
import { sweepPreviews } from './sweep.ts'

it('sweeps closed or missing PRs from the resource union and removes open orphan registry keys', async () => {
  const { ctx, http, command } = fakeContext()
  const deleted: string[] = []
  const lookedUp: number[] = []
  let databases = [
    { name: 'conductive-pr-124', uuid: 'keep-db' },
    { name: 'conductive-pr-126', uuid: 'delete-db' },
    { name: 'live-database', uuid: 'live-db' },
  ]
  command.mockImplementation(async ({ args }) => {
    if (args[1] === 'list') return commandReply(databases)
    if (args[1] === 'execute') return d1Reply([])
    if (args[1] === 'delete') {
      deleted.push(`database:${args[2].slice('conductive-pr-'.length)}`)
      databases = databases.filter((row) => row.name !== args[2])
      return commandReply({})
    }
    throw new Error('Unexpected fake command.')
  })
  http.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/workers/scripts'))
      return apiReply([
        { id: 'conductive-pr-123' },
        { id: 'live-worker' },
        { id: 'conductive-pr-0' },
      ])
    if (path.endsWith('/storage/kv/namespaces'))
      return apiReply([
        { id: 'registry', title: 'conductive-preview-registry' },
      ])
    if (path.endsWith('/keys'))
      return apiReply([
        { name: 'pr-125' },
        { name: 'pr-126' },
        { name: 'unrelated' },
      ])
    if (path.includes('/pulls/')) {
      const number = Number(path.split('/').at(-1))
      lookedUp.push(number)
      return number === 126
        ? new Response(null, { status: 404 })
        : Response.json({ state: number === 123 ? 'closed' : 'open' })
    }
    if (path.includes('/values/')) {
      deleted.push(`registry:${path.split('/').at(-1)?.slice(3)}`)
      return new Response(null, { status: 404 })
    }
    if (path.includes('/workers/scripts/')) {
      deleted.push(
        `worker:${path.split('/').at(-1)?.slice('conductive-pr-'.length)}`,
      )
      return new Response(null, { status: 404 })
    }
    if (path.endsWith('/zones')) return apiReply([])
    throw new Error('Unexpected fake HTTP request.')
  })
  await expect(sweepPreviews(ctx)).resolves.toEqual({
    deleted: [123, 126],
    removedRegistry: [125, 126],
  })
  expect(lookedUp).toEqual([123, 124, 125, 126])
  expect(deleted).toEqual([
    'registry:123',
    'worker:123',
    'registry:125',
    'registry:126',
    'worker:126',
    'database:126',
  ])
  expect(databases.map((row) => row.name)).toEqual([
    'conductive-pr-124',
    'live-database',
  ])
})

it('does not treat an unavailable GitHub API as a missing pull request', async () => {
  const { ctx, http, command } = fakeContext()
  command.mockResolvedValueOnce(commandReply([]))
  http
    .mockResolvedValueOnce(apiReply([{ id: 'conductive-pr-123' }]))
    .mockResolvedValueOnce(apiReply([]))
    .mockResolvedValueOnce(new Response('fake-sensitive-body', { status: 503 }))
  await expect(sweepPreviews(ctx)).rejects.toThrowError(
    'GitHub request failed with HTTP 503.',
  )
  expect(http.mock.calls.map(([request]) => request.method)).toEqual([
    'GET',
    'GET',
    'GET',
  ])
})
