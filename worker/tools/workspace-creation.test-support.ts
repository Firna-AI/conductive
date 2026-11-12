import { expect } from 'vitest'

import type { Workspace } from '../features/entry.test-support'
import type { AgentWriteFixture } from '../features/agent-session-writes.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { readWorkspaceToken } from '../lifecycle/tokens'
import { record } from '../chat/inputs'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'

export async function admittedToolWorkspace(
  active: AgentWriteFixture,
): Promise<string> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const row = await active.env.DB.prepare(
      'SELECT id FROM workspaces WHERE id NOT IN (?, ?) ORDER BY created_at, id',
    )
      .bind(OUTER_WORKSPACE, OTHER_WORKSPACE)
      .first<{ id: string }>()
    if (row) return row.id
  }
  throw new Error('The workspace create did not reach admission.')
}

export async function creationActor(active: AgentWriteFixture, id: string) {
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  return bindings.WORKSPACES.getByName(id)
}

export async function completeToolCreation(
  active: AgentWriteFixture,
  id: string,
) {
  const actor = await creationActor(active, id)
  while (true) {
    const state = new Map(await actor.inspectFeatureState())
    const job = record(state.get('lifecycle:start-job'))
    if (job.phase === 'runner') break
    await actor.advanceStartAlarm()
  }
  const response = await requestRunner(
    active,
    await readWorkspaceToken(active.env, id),
  )
  expect(response.status).toBe(101)
  const socket = response.webSocket
  if (!socket) throw new Error('The created runner socket is missing.')
  const runner = new OuterFakeRunner(socket, id)
  try {
    expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 1,
    })
    await actor.advanceStartAlarm()
    const completion = actor.waitCreationLifecycle()
    try {
      const result = await completion
      try {
        expect(result).toEqual({ ok: true })
      } finally {
        disposeRpc(result)
      }
    } finally {
      disposeRpc(completion)
    }
  } finally {
    await closeSockets(socket)
  }
}

function disposeRpc(value: object): void {
  const dispose: unknown = Reflect.get(value, Symbol.dispose)
  if (typeof dispose === 'function') Reflect.apply(dispose, value, [])
}
