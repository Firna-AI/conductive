import { expect, it } from 'vitest'
import type { PortsUpdated } from '../../src/shared/ports'
import type { SkillsUpdated } from '../../src/shared/generated/SkillsUpdated'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import { nativeChatStore } from './native-store.test-support'
import { ChatStore, type ChatTransaction } from './store'
import {
  failure,
  noFailures,
  readState,
} from './workspace-read-state.test-support'

const initialPorts: PortsUpdated = { type: 'ports.updated', ports: [] }
const initialSkills: SkillsUpdated = {
  type: 'skills.updated',
  skills: { claude: [], codex: [] },
}
const changedPorts: PortsUpdated = {
  type: 'ports.updated',
  ports: [{ port: 4321, name: 'web', folder: null }],
}
const changedSkills: SkillsUpdated = { type: 'skills.updated', skills: null }
const failures = {
  'files.snapshot': failure('files.snapshot', 6, 32, 2),
  'changes.updated': failure('changes.updated', 8, 34, 4),
  'workspace.title': failure('workspace.title', 10, 36, 6),
  'start.updated': failure('start.updated', 12, 38, 8),
  'ports.updated': failure('ports.updated', 14, 40, 10),
}

async function updateState(view: ChatTransaction) {
  await view.emit(changedPorts, 30)
  await view.emit(changedSkills, 31)
  for (const { event, occurredAt } of Object.values(failures)) {
    const kind = event.runnerEventType
    const cause = {
      streamId: event.streamId,
      eventNumber: event.runnerEventNumber - 1,
      revision: null,
    }
    const { repairFailed, ...marker } = event
    await view.emit(
      { ...marker, runnerEventNumber: cause.eventNumber },
      occurredAt - 1,
    )
    await view.repairs.save({
      command: { type: 'report.refresh', kind, commandId: kind },
      cause,
      state: 'failed',
      sent: true,
      replacementRevision: null,
    })
    await view.emit({ ...marker, repairFailed }, occurredAt)
  }
}

it('keeps ports, skills, and all five failures at the committed cutoff across rollback and crash', async () => {
  await checkCommitBoundaries(async () => {
    const { actor, storage, failNextCommit, clearFaults } =
      await nativeChatStore()
    const store = new ChatStore(storage, () => 25)
    const change = (work: (view: ChatTransaction) => Promise<void>) =>
      store.run(() => store.change('workspace', work, () => undefined))
    const read = () =>
      store.run(() =>
        store.read('workspace', async (view) => ({
          eventNumber: view.eventNumber,
          state: await view.workspaceReadState(),
        })),
      )
    await readState(store)
    await change(async (view) => {
      await view.emit(initialPorts, 20)
      await view.emit(initialSkills, 21)
    })
    return {
      failNextCommit,
      clearFaults,
      action: async (error: string) => {
        await expect(change(updateState)).rejects.toThrow(error)
      },
      read,
      restart: () => actor.crash(),
      before: {
        eventNumber: 2,
        state: {
          ports: { eventNumber: 1, occurredAt: 20, event: initialPorts },
          skills: { eventNumber: 2, occurredAt: 21, event: initialSkills },
          repositoryId: null,
          failures: noFailures,
        },
      },
      after: {
        eventNumber: 14,
        state: {
          ports: { eventNumber: 3, occurredAt: 30, event: changedPorts },
          skills: { eventNumber: 4, occurredAt: 31, event: changedSkills },
          repositoryId: null,
          failures,
        },
      },
    }
  })
})
