import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { sectionPath } from '../../shared/sections'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { ApiError, createApiClient, type FileReply } from './client'
import { ignore, record, text } from './parse'
import { readAccount } from './read-core'

describe('createApiClient', () => {
  test('a write sends JSON, also an empty one, and an error keeps its code', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    await api.send('DELETE', sectionPath(FAKE_IDS.org, 'infra'), {}, ignore)
    const write = server.requests.at(-1)
    expect(write?.headers.get('Content-Type')).toBe('application/json')
    expect(await write?.text()).toBe('{}')
    const failure = await api
      .get('/api/unknown', ignore)
      .catch((error) => error)
    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 404, code: 'fake_route_missing' })
  })

  test('a part goes through the file transport, and its answer and errors read as a write does', async () => {
    const replies: (FileReply | Error)[] = [
      { status: 200, body: { partNumber: 1, etag: 'etag-1' } },
      {
        status: 413,
        body: {
          error: {
            code: 'attachment_too_large',
            message: 'Each file can be up to 1 GB.',
          },
        },
      },
      new Error('The upload failed.'),
    ]
    const sent: [string, string][] = []
    const api = createApiClient(new FakeApiServer().fetch, async (request) => {
      sent.push([request.path, await request.body.text()])
      const reply = replies.shift() ?? new Error('No reply.')
      if (reply instanceof Error) throw reply
      return reply
    })
    const part = new File(['png'], 'overlap.png').slice(0, 2)
    const hooks = { progress: ignore, signal: new AbortController().signal }
    const etag = (body: unknown) => text(record(body), 'etag')
    const confirmed = await api.sendPart('/parts/1', part, etag, hooks)
    const refused = await api
      .sendPart('/parts/2', part, etag, hooks)
      .catch((error: unknown) => error)
    const offline = await api
      .sendPart('/parts/3', part, etag, hooks)
      .catch((error: unknown) => error)
    expect({ confirmed, refused, offline, sent }).toMatchObject({
      confirmed: 'etag-1',
      refused: { status: 413, code: 'attachment_too_large' },
      offline: { status: 0, code: 'network' },
      sent: [
        ['/parts/1', 'pn'],
        ['/parts/2', 'pn'],
        ['/parts/3', 'pn'],
      ],
    })
  })

  test('the account reader keeps shortcut changes from the reply', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    const shortcuts = {
      mac: [{ command: 'command-palette', keys: ['Meta+P'] }],
      other: [],
    }
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      shortcuts,
    })
    expect(await api.get(ACCOUNT_PATHS.account, readAccount)).toMatchObject({
      shortcuts,
    })
  })

  test('an account with missing or invalid preferences is an ApiError', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    for (const fields of [
      { newWorkspaceView: undefined },
      { newWorkspaceView: 'drawer' },
      { shortcuts: undefined },
      { shortcuts: { mac: [], other: null } },
    ]) {
      server.json('GET', ACCOUNT_PATHS.account, {
        ...coreFixtures().account,
        ...fields,
      })
      const error = await api
        .get(ACCOUNT_PATHS.account, readAccount)
        .catch((error: unknown) => error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 200, code: 'invalid_response' })
    }
  })
})
