import type { WebSocket } from 'miniflare'

import { workspaceEventsPath } from '../../../src/shared/events'
import { deviceConnectionPath } from '../../../src/shared/device'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../security/desktop-contract'
import { closeSockets, SocketInbox } from '../adapter-sockets.test-support'
import { record } from '../inputs'
import { requestRunner, OuterFakeRunner } from './runner-socket.test-support'
import { createLifecycleChatFixture } from './workspace-lifecycle.test-support'
import type { Workspace } from './workspace-review-entry.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { advanceNextWorkspaceAlarm } from './workspace-start.test-support'

export async function reviewWorkspaceFixture(bundle: string) {
  const fixture = await createLifecycleChatFixture(bundle)
  const sockets: WebSocket[] = []
  const bindings = await fixture.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = () => bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  await fixture.initialize()
  await actor().beginLifecycleStart('create')
  await actor().lifecyclePrepared()
  const connected = await requestRunner(fixture)
  if (!connected.webSocket) throw new Error('The runner socket is missing.')
  sockets.push(connected.webSocket)
  const runner = new OuterFakeRunner(connected.webSocket)
  await runner.inbox.next()
  runner.emit({ type: 'runner.ready' })
  await runner.inbox.next()
  const turn = record(await runner.inbox.next())
  await actor().readLifecycle()
  const browser = async (after = 0) => {
    const response = await fixture.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE, after),
      { headers: { Upgrade: 'websocket' } },
    )
    const socket = response.webSocket
    if (!socket) throw new Error('The workspace socket is missing.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    socket.accept()
    return {
      socket,
      inbox,
      history: record(record(await inbox.next()).history),
    }
  }
  const connectMac = async () => {
    const token = fixture.cookies.ownerCookie.slice(
      fixture.cookies.ownerCookie.indexOf('=') + 1,
    )
    const response = await fixture.runtime.dispatchFetch(
      `${fixture.env.APP_ORIGIN}${deviceConnectionPath('projection-mac')}`,
      {
        headers: {
          Origin: DESKTOP_ORIGIN,
          Cookie: `${DESKTOP_SESSION_COOKIE}=${token}`,
          Authorization: `Bearer ${token}`,
          Upgrade: 'websocket',
        },
      },
    )
    const socket = response.webSocket
    if (!socket) throw new Error('The Mac socket is missing.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    socket.accept()
    const device = record(record(await inbox.next()).device)
    return { socket, inbox, device }
  }
  return {
    ...fixture,
    get runtime() {
      return fixture.runtime
    },
    actor,
    runner,
    turn,
    browser,
    connectMac,
    dispose: async () => {
      await closeSockets(...sockets)
      await fixture.dispose()
    },
  }
}

export async function driveToRunningStartup(actor: {
  readStartCheckpoint(): Promise<
    { phase: string; processId: number | null } | undefined
  >
  advanceStartAlarm(): Promise<void>
  readStartAlarm(): Promise<number | null>
}): Promise<void> {
  while (true) {
    const job = await actor.readStartCheckpoint()
    if (!job) throw new Error('The queued start is missing.')
    if (job.phase === 'startup' && job.processId !== null) return
    await advanceNextWorkspaceAlarm(actor)
  }
}

export type ReviewWorkspaceFixture = Awaited<
  ReturnType<typeof reviewWorkspaceFixture>
>
