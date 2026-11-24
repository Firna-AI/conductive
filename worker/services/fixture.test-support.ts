import type { WebSocket } from 'miniflare'
import { expect } from 'vitest'
import type { RunnerServiceMessage } from '../../src/shared/generated/RunnerServiceMessage'
import type { ServiceControlRequest } from '../../src/shared/generated/ServiceControlRequest'
import type { ServiceReport } from '../../src/shared/generated/ServiceReport'
import type { ServiceReportEntry } from '../../src/shared/generated/ServiceReportEntry'
import { servicePaths } from '../../src/shared/services'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { requestRunner } from '../chat/integration/runner-socket.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { featureFixture, featureState } from '../features/fixture.test-support'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'

export const observed = {
  bootId: 'boot-one',
  serviceId: 'service-web',
  generation: 'run-one',
}
export const service: ServiceReportEntry = {
  serviceId: observed.serviceId,
  generation: observed.generation,
  name: 'web',
  program: 'node dev',
  folder: 'code/project',
  status: {
    state: 'running',
    startedAt: DEVICE_TEST_NOW - 1000,
    endedAt: null,
    result: null,
  },
  ports: [3000, 5173],
}
export const snapshot: ServiceReport = {
  bootId: observed.bootId,
  revision: 1,
  services: [service],
}
export const restart: ServiceControlRequest = {
  requestId: 'restart-one',
  target: observed,
  action: 'restart',
}

export async function servicesFixture(bundle: string) {
  const fixture = await featureFixture(bundle)
  const sockets: WebSocket[] = []
  const sandboxId = 'bx_services'
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind(sandboxId, OUTER_WORKSPACE)
    .run()
  await fixture.control('seed', {
    values: {
      'lifecycle:state': {
        workspaceId: OUTER_WORKSPACE,
        orgId: OUTER_ORG,
        state: 'ready',
        start: null,
        pendingFirstMessage: null,
        lastActivityAt: DEVICE_TEST_NOW - 1000,
        runningSessions: [],
        runnerConnected: true,
        stoppedAt: null,
        nextDiskKeepaliveAt: null,
        error: null,
      },
    },
  })
  const paths = {
    catalogue: servicePaths.catalogue(OUTER_ORG, OUTER_WORKSPACE),
    control: servicePaths.control(OUTER_ORG, OUTER_WORKSPACE),
    logs: servicePaths.logs(OUTER_ORG, OUTER_WORKSPACE),
  }
  let connection = 0
  const connect = async (services = true, accepted = services) => {
    const response = await requestRunner(fixture)
    expect(response.status).toBe(101)
    const socket = response.webSocket
    if (!socket) throw new Error('Missing service runner socket.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    const closed = new Promise<void>((resolve) =>
      socket.addEventListener('close', () => resolve(), { once: true }),
    )
    const streamId = `services-stream-${++connection}`
    let eventNumber = 0
    socket.accept()
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 2,
        workspaceId: OUTER_WORKSPACE,
        streamId,
        ...(services ? { services: true } : {}),
      }),
    )
    const welcome = record(await inbox.next())
    expect(welcome.type).toBe('welcome')
    if (accepted)
      expect(record(await inbox.next()).type).toBe('services.report')
    const emit = async (event: unknown) => {
      socket.send(
        JSON.stringify({
          type: 'event',
          streamId,
          eventNumber: ++eventNumber,
          occurredAt: DEVICE_TEST_NOW,
          event,
        }),
      )
      expect(await inbox.next()).toEqual({
        type: 'confirm',
        streamId,
        throughEventNumber: eventNumber,
      })
    }
    return {
      socket,
      inbox,
      welcome,
      closed,
      emit,
      send: (value: unknown) => socket.send(JSON.stringify(value)),
      document: (
        type: RunnerServiceMessage['type'],
        id: string,
        value: unknown,
        cuts: number[] = [],
        source?: string,
      ) => {
        const text = source ?? JSON.stringify(value)
        const bounds = [0, ...cuts, text.length]
        for (let index = 1; index < bounds.length; index++)
          socket.send(
            JSON.stringify({
              type,
              ...(type === 'services.report.part'
                ? { transferId: id }
                : { requestId: id }),
              part: {
                partNumber: index,
                finalPart: index === bounds.length - 1,
                text: text.slice(bounds[index - 1], bounds[index]),
              },
            }),
          )
      },
      fence: (ports: unknown[] = []) => emit({ type: 'ports.updated', ports }),
    }
  }
  const post = (
    path: string,
    body: unknown,
    cookie = fixture.cookies.memberCookie,
  ) =>
    fixture.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Cookie: cookie },
    })
  return {
    ...fixture,
    paths,
    connect,
    connectHost: () => fixture.host.seed(OUTER_ORG, OUTER_WORKSPACE, sandboxId),
    post,
    catalogue: async (cookie = fixture.cookies.memberCookie) => {
      const response = await fixture.request(paths.catalogue, {
        headers: { Cookie: cookie },
      })
      expect(response.status).toBe(200)
      const value: unknown = await response.json()
      return value
    },
    state: async () => featureState(await fixture.control('state')),
    secret: async (secret: string) => {
      const ciphertext = await encrypt(
        JSON.stringify({ SERVICE_TOKEN: { value: secret, secret: true } }),
        orgEnvironmentContext(OUTER_ORG),
        fixture.env.BOAT_KEY_ENCRYPTION_KEY,
      )
      await fixture.env.DB.prepare(
        'UPDATE workspace_runtime SET environment_ciphertext = ? WHERE workspace_id = ?',
      )
        .bind(ciphertext, OUTER_WORKSPACE)
        .run()
    },
    dispose: async () => {
      await closeSockets(...sockets)
      await fixture.dispose()
    },
  }
}

export type ServicesFixture = Awaited<ReturnType<typeof servicesFixture>>
