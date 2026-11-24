import type { WebSocket } from 'miniflare'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'

import { COMPUTER_PATH } from '../../src/shared/computer'
import type { ComputerResources } from '../../src/shared/generated/ComputerResources'
import type { ComputerToWorker } from '../../src/shared/generated/ComputerToWorker'
import { HOST_PATH } from '../../src/shared/host'
import {
  ownComputerBuildsPath,
  ownComputerCodePath,
  ownComputerPath,
  ownComputersPath,
  type AddOwnComputerResponse,
  type OwnComputerCodeResponse,
  type OwnComputerResponse,
} from '../../src/shared/own-computers'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { isRecord } from '../http'
import { seedMember } from '../test-support/d1-seeds'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { ownComputerClient } from './client'
import { FakeComputer } from './socket.test-support'

export const computerResources: ComputerResources = {
  cpus: 18,
  memoryBytes: 25_769_803_776,
  system: 'Ubuntu 24.04 · x86_64',
}

export function setupOwnComputers() {
  let harness: TestHarness
  let session: string
  let orgNumber = 0
  const sockets: WebSocket[] = []
  beforeAll(async () => {
    harness = await createHarness()
    session = await harness.login()
  })
  afterEach(async () => {
    await closeSockets(...sockets.splice(0))
    harness.setTime(TEST_TIME)
  })
  afterAll(async () => {
    await harness.dispose()
  })

  const createOrg = async (githubId: number) => {
    const db = harness.env.DB
    const id = `own-computer-org-${++orgNumber}`
    await db.batch([
      db
        .prepare(
          `INSERT INTO orgs (id, name, creator_user_id, created_at)
         SELECT ?, 'Own computers', id, ? FROM users WHERE github_id = ?`,
        )
        .bind(id, TEST_TIME, githubId),
      seedMember(db, {
        orgId: id,
        userId: { githubId },
        role: 'admin',
        joinedAt: TEST_TIME,
      }),
    ])
    return { id }
  }

  return async () => {
    const org = await createOrg(7)
    const db = harness.env.DB
    const root = ownComputersPath(org.id)

    const request = (
      path: string,
      method = 'GET',
      body: Record<string, unknown> = {},
    ) =>
      harness.request(path, session, {
        method,
        ...(method !== 'GET' && { body: JSON.stringify(body) }),
      })

    const dispatch = (
      method: 'GET' | 'POST',
      credential: string,
      headers: Record<string, string> = {},
      path: string = COMPUTER_PATH,
    ) =>
      harness.native.runtime.dispatchFetch(
        `${harness.env.MACHINE_ORIGIN}${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${credential}`,
            ...(method === 'GET' && { Upgrade: 'websocket' }),
            ...headers,
          },
        },
      )

    async function open(token: string) {
      const response = await dispatch('GET', token)
      expect(response.status).toBe(101)
      const socket = response.webSocket
      if (!socket) throw new Error('Expected a computer WebSocket.')
      sockets.push(socket)
      return new FakeComputer(socket)
    }
    async function add(name = 'build-01') {
      const response = await request(root, 'POST', { name })
      expect(response.status).toBe(201)
      const added: AddOwnComputerResponse = await response.json()
      const computerId = added.computer.id
      const owner = { orgId: org.id, computerId }
      const path = ownComputerPath(org.id, computerId)
      const codePath = ownComputerCodePath(org.id, computerId)
      const buildsPath = ownComputerBuildsPath(org.id, computerId)
      const client = ownComputerClient(harness.env, owner)
      return {
        ...added,
        owner,
        computerId,
        client,
        path,
        codePath,
        buildsPath,
        async read() {
          const response = await request(path)
          expect(response.status).toBe(200)
          const { computer: view }: OwnComputerResponse = await response.json()
          return view
        },
        async newCode() {
          const response = await request(codePath, 'POST')
          expect(response.status).toBe(200)
          const result: OwnComputerCodeResponse = await response.json()
          return result
        },
        async enroll() {
          return tokenFrom(await dispatch('POST', added.code))
        },
        async connect(resources = computerResources) {
          const token = await tokenFrom(await dispatch('POST', added.code))
          const host = await open(token)
          await hello(host, resources)
          return { host, token }
        },
      }
    }
    return {
      harness,
      org,
      createOrg,
      db,
      root,
      request,
      dispatch,
      open,
      add,
      hostPath: HOST_PATH,
    }
  }
}

export async function tokenFrom(response: {
  status: number
  json(): Promise<unknown>
}) {
  expect(response.status).toBe(200)
  const reply: unknown = await response.json()
  if (!isRecord(reply) || typeof reply.computerToken !== 'string')
    throw new Error('Expected an enrollment credential.')
  return reply.computerToken
}

export function helloMessage(
  resources = computerResources,
): Extract<ComputerToWorker, { type: 'hello' }> {
  return {
    type: 'hello',
    computerProtocolVersion: 1,
    programVersion: '0.0.42',
    resources,
  }
}

export async function hello(host: FakeComputer, resources = computerResources) {
  host.send(helloMessage(resources))
  expect(await host.next()).toEqual({
    type: 'welcome',
    computerProtocolVersion: 1,
  })
}
