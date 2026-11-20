import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { record } from '../chat/inputs'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import type { backendFixture } from './backend-test-support'
import { readWorkspaceToken } from './tokens'

export async function runningProviderStopFixture(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  const saved = await seededCompletedWorkspace(fixture)
  const peers = saved.actor.native.api.peers
  const token = await readWorkspaceToken(fixture.runtime.env, saved.id)
  await peers.connectRunner('runner', {
    url: `${fixture.runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
    headers: { Authorization: `Bearer ${token}` },
  })
  await peers.receiveRunner('runner', {
    type: 'hello',
    workspaceId: saved.id,
    protocolVersion: 2,
    streamId: '12345678-1234-4234-8234-123456789abc',
    processStartId: 'abcdef01-2345-4678-89ab-cdef01234567',
  })
  await peers.receiveRunner('runner', {
    type: 'event',
    streamId: '12345678-1234-4234-8234-123456789abc',
    eventNumber: 1,
    occurredAt: fixture.runtime.dependencies.now(),
    event: { type: 'runner.ready' },
  })
  const sent = await peers.take('runner')
  if (!sent.messages.some((message) => record(message).type === 'turn'))
    throw new Error('The fixture did not dispatch its first turn.')
  return saved
}
