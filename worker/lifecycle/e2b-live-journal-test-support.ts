import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { onTestFinished } from 'vitest'

import { e2bConfiguration } from '../../image/e2b/live-input'
import {
  openLiveProvider,
  type LiveProvider,
} from '../../image/e2b/live-provider'
import { LiveResources } from '../../image/e2b/live-resources'
import type { HttpFetch } from '../env'
import { FakeE2b } from '../test-support/fake-e2b'

export async function liveJournalFixture() {
  const root = resolve(import.meta.dirname, '../..')
  const parent = join(root, '.context/e2b-live-journal-tests')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(join(parent, 'journal-'))
  const server = new FakeE2b()
  const requests: Request[] = []
  const behavior = {
    refuseCreate: false,
    hideInventory: false,
    inventoryNotFound: false,
  }
  const send: HttpFetch = async (request) => {
    requests.push(request.clone())
    const path = new URL(request.url).pathname
    if (
      behavior.refuseCreate &&
      request.method === 'POST' &&
      path === '/v2/sandboxes'
    )
      return Response.json(
        { code: 429, error_code: 'capacity', message: 'fake refusal' },
        {
          status: 429,
          headers: { 'Should-Retry': 'true', 'Retry-After': '1' },
        },
      )
    if (
      behavior.hideInventory &&
      request.method === 'GET' &&
      path === '/v2/sandboxes'
    )
      return Response.json([])
    if (
      behavior.inventoryNotFound &&
      request.method === 'GET' &&
      path === '/v2/sandboxes'
    )
      return Response.json(
        {
          code: 404,
          error_code: 'inventory_unavailable',
          message: 'fake inventory failure',
        },
        { status: 404 },
      )
    return server.fetch(request)
  }
  const config = e2bConfiguration(
    {
      LIVE_E2B_KEY: server.apiKey,
      LIVE_E2B_DOMAIN: server.domain,
      LIVE_E2B_TEMPLATE_ID: 'base-template',
      LIVE_E2B_STATE_KEY: btoa('e'.repeat(32)),
      LIVE_RUNNER_ARCHIVE_URL: 'https://software.example.test/runner.tar.gz',
      LIVE_RUNNER_ARCHIVE_SHA256: '0'.repeat(64),
      LIVE_E2B_STATE_DIR: join(directory, 'state'),
      LIVE_OUTPUT: join(directory, 'output'),
    },
    root,
  )
  await mkdir(config.output)
  const options = {
    accountId: config.accountId,
    apiKey: config.apiKey,
    domain: config.domain,
    templateId: config.templateId,
    encryptionKey: config.encryptionKey,
    fetch: send,
  }
  const sessions = new Set<LiveProvider>()
  onTestFinished(async () => {
    await Promise.all([...sessions].map((value) => value.close()))
    await rm(directory, { recursive: true, force: true })
  })
  let session = await openLiveProvider(root, config.stateDirectory, options)
  sessions.add(session)
  return {
    config,
    server,
    requests,
    behavior,
    journal: new LiveResources(config),
    get session() {
      return session
    },
    async reopen() {
      await session.close()
      sessions.delete(session)
      session = await openLiveProvider(root, config.stateDirectory, options)
      sessions.add(session)
    },
  }
}
