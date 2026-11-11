import { expect, test } from 'vitest'
import {
  conductorOldDocumentPath,
  conductorOldDocumentsPath,
} from '../shared/conductor-import'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { fakeOldDocuments } from '../test-support/fixtures/old-documents'
import { createApiClient } from './api/client'
import { ConductorDocuments } from './conductor-documents'

const orgId = FAKE_IDS.org
const workspaceId = FAKE_IDS.workspace
const listPath = conductorOldDocumentsPath(orgId, workspaceId)

test('the list reads each page through its cursor, then shows every document in order', async () => {
  const server = new FakeApiServer()
  const [first, second, third] = fakeOldDocuments
  server.json('GET', listPath, { documents: [first], nextCursor: 1 })
  server.json('GET', `${listPath}?cursor=1`, {
    documents: [second, third],
    nextCursor: null,
  })
  const documents = new ConductorDocuments(
    createApiClient(server.fetch),
    orgId,
    workspaceId,
  )
  await documents.reload()
  expect(documents.list.get()).toEqual({
    state: 'ready',
    value: [first, second, third],
  })
  expect(
    server.requests.map((request) => {
      const url = new URL(request.url)
      return `${request.method} ${url.pathname}${url.search}`
    }),
  ).toEqual([`GET ${listPath}`, `GET ${listPath}?cursor=1`])
})

test('a document reads as the UTF-8 Markdown of its route, and a refusal keeps its code', async () => {
  const server = new FakeApiServer()
  const markdown = '# Apply coupons before tax\n\nThe total is right — 10 %.\n'
  server.response(
    'GET',
    conductorOldDocumentPath(orgId, workspaceId, 'before-tax'),
    new Response(new TextEncoder().encode(markdown), {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    }),
  )
  server.json(
    'GET',
    conductorOldDocumentPath(orgId, workspaceId, 'gone'),
    {
      error: {
        code: 'document_not_found',
        message: 'The old document is not available.',
      },
    },
    404,
  )
  const documents = new ConductorDocuments(
    createApiClient(server.fetch),
    orgId,
    workspaceId,
  )
  expect(await documents.read('before-tax')).toBe(markdown)
  await expect(documents.read('gone')).rejects.toMatchObject({
    status: 404,
    code: 'document_not_found',
  })
})
