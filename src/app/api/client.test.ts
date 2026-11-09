import { describe, expect, test } from 'vitest'
import { sectionPath } from '../../shared/sections'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { ApiError, createApiClient, type FileReply } from './client'
import { ignore, record, text } from './parse'

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

  test('a file goes through the file transport, and its answer and errors read as a write does', async () => {
    const replies: (FileReply | Error)[] = [
      { status: 201, body: { attachment: { id: 'upload-1' } } },
      {
        status: 413,
        body: {
          error: {
            code: 'attachment_too_large',
            message: 'Each file can be up to 25 MB.',
          },
        },
      },
      new Error('The upload failed.'),
    ]
    const paths: string[] = []
    const api = createApiClient(new FakeApiServer().fetch, async (request) => {
      paths.push(request.path)
      const reply = replies.shift() ?? new Error('No reply.')
      if (reply instanceof Error) throw reply
      return reply
    })
    const file = new File(['png'], 'overlap.png')
    const hooks = { progress: ignore, signal: new AbortController().signal }
    const id = (body: unknown) => text(record(record(body).attachment), 'id')
    const sent = await api.sendFile('/upload?name=a', file, id, hooks)
    const refused = await api
      .sendFile('/upload?name=b', file, id, hooks)
      .catch((error) => error)
    const offline = await api
      .sendFile('/upload?name=c', file, id, hooks)
      .catch((error) => error)
    expect({ sent, refused, offline, paths }).toMatchObject({
      sent: 'upload-1',
      refused: { status: 413, code: 'attachment_too_large' },
      offline: { status: 0, code: 'network' },
      paths: ['/upload?name=a', '/upload?name=b', '/upload?name=c'],
    })
  })
})
