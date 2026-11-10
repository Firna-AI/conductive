import { expect, it } from 'vitest'
import { createApiClient } from '../../app/api/client'
import { requestLines } from '../../app/test-kit'
import { sessionTranscriptPath } from '../../shared/sessions'
import { FakeApiServer } from '../../test-support/fake-api'
import { createChatApi } from './client'
import { UnreadableResponse } from './json'

it('requests the selected transcript through its shared route and reads the required Markdown string', async () => {
  const target = { orgId: 'org', workspaceId: 'workspace' }
  const path = sessionTranscriptPath(
    target.orgId,
    target.workspaceId,
    'session/one',
    'full',
  )
  const server = new FakeApiServer()
  server.json('GET', path, { markdown: '# Complete transcript\n' })
  const api = createChatApi(createApiClient(server.fetch), target)
  expect(await api.transcript('session/one', 'full')).toEqual({
    markdown: '# Complete transcript\n',
  })
  expect(requestLines(server)).toEqual([`GET ${path}`])
  server.json('GET', path, { markdown: 7 })
  await expect(api.transcript('session/one', 'full')).rejects.toBeInstanceOf(
    UnreadableResponse,
  )
})
