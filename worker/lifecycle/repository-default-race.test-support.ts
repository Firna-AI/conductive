import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { activeWorkspace } from '../github/data'
import { handleRepositoryChange } from '../github/repository-change'
import type { ReceiverStorage } from '../members/receiver-storage'
import { heldOperation } from '../test-support/held-operation'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { BASE_CHANGE_JOB_KEY, type BaseChangeJob } from './base-change-job'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { saveRepositoryDefaultChange } from './repository-default-change'
import { WorkspaceBaseChanges } from './workspace-base'

export async function repositoryDefaultRaceFixture(harness: TestHarness) {
  const f = await createChatFixture(harness)
  const db = f.env.DB
  await db.batch([
    db.prepare(
      "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'example', 'Organization', 1)",
    ),
    db.prepare("UPDATE repositories SET installation_id = 1 WHERE id = 'repo'"),
    db
      .prepare(
        "UPDATE workspaces SET base_branch = NULL, state = 'ready', sandbox_id = 'bx_change' WHERE id = ?",
      )
      .bind(WORKSPACE_ID),
    db
      .prepare(
        `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
         VALUES (?, ?, ?, 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message')`,
      )
      .bind(WORKSPACE_ID, f.org.id, f.owner.id),
  ])
  const binding = await activeWorkspace(db, WORKSPACE_ID, f.org.id)
  if (!binding) throw new Error('Missing default-base workspace.')
  const storage: ReceiverStorage = f.storage
  const boat = new LifecycleBoat()
  boat.states.set('bx_change', 'ready')
  let now = TEST_TIME
  const changes = new WorkspaceBaseChanges(
    f.env,
    {
      fetch: boat.fetch,
      randomToken: () => 'unused-race-token',
      now: () => now,
    },
    storage,
  )
  const runDelivery = (
    id: string,
    read: () => Promise<string>,
    database = db,
    saved = storage,
  ) =>
    handleRepositoryChange(database, binding, id, () => now, {
      read: async () => ({
        fullName: binding.fullName,
        defaultBranch: await read(),
      }),
      prepareDefaultBranchChange: (
        workspace,
        target,
        installationId,
        deliveryId,
      ) =>
        saveRepositoryDefaultChange(
          db,
          saved,
          workspace,
          { ...target, installationId, deliveryId },
          now,
        ),
      changed: async () => {},
    })
  const older = () => {
    const gate = heldOperation()
    let held = false
    const saved = {
      ...storage,
      transaction: async <T>(
        work: (transaction: DurableObjectTransaction) => Promise<T>,
      ) => {
        if (!held) {
          held = true
          await gate.wait()
        }
        return storage.transaction(work)
      },
    }
    const writes: number[] = []
    const database = new Proxy(db, {
      get(target, key) {
        if (key === 'batch')
          return async <T>(statements: D1PreparedStatement[]) => {
            const result = await target.batch<T>(statements)
            writes.push(result[0].meta.changes)
            return result
          }
        const value: unknown = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    return { gate, saved, database, writes }
  }
  return {
    ...f,
    boat,
    binding,
    storage,
    older,
    runDelivery,
    lateSave: () => {
      let execute: (() => Promise<number>) | undefined
      const database = new Proxy(db, {
        get(target, key) {
          if (key === 'batch')
            return async <T>(
              statements: D1PreparedStatement[],
            ): Promise<D1Result<T>[]> => {
              execute = async () =>
                (await target.batch<T>(statements))[0].meta.changes
              throw new Error('The metadata write lost its reply.')
            }
          const value: unknown = Reflect.get(target, key)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return {
        database,
        execute: () => {
          if (!execute) throw new Error('No metadata write was captured.')
          return execute()
        },
      }
    },
    holdSave: () => {
      const gate = heldOperation()
      let held = false
      const database = new Proxy(db, {
        get(target, key) {
          if (key === 'batch')
            return async <T>(statements: D1PreparedStatement[]) => {
              if (!held) {
                held = true
                await gate.wait()
              }
              return target.batch<T>(statements)
            }
          const value: unknown = Reflect.get(target, key)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return { gate, database }
    },
    pending: () => storage.get<BaseChangeJob>(BASE_CHANGE_JOB_KEY),
    credentialSender: (id: string) => changes.credentialSender(id),
    advance: async () => {
      now += 60_000
      await changes.advance(true)
    },
    fetches: () =>
      boat.commandRequests.filter(({ command }) =>
        command.includes(
          'credential.helper=/usr/local/bin/conductive-git-credential',
        ),
      ),
    installs: () =>
      boat.commandRequests.filter(({ command }) =>
        command.includes('gh-merge-base'),
      ),
  }
}
