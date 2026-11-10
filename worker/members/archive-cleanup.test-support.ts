import { deleteOrgPath } from '../../src/shared/orgs'
import { computerRecords } from '../lifecycle/computer-ledger.test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { productionMembersHooks } from './composition'
import { cleanupResources } from './deletion-data'
import { DAY_MS, stopWorkspace } from './maintenance-test-support'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
  write,
} from './members-test-support'

export async function archiveCleanupFixture(harness: TestHarness) {
  const members = await memberFixture(harness)
  const { org, admin, member } = members
  const client = membersClient(harness)
  const production = productionMembersHooks(harness.env, client.dependencies)
  client.hooks.maintainDeletedOrg = production.maintainDeletedOrg
  await seedWorkspace(harness, org, member.user)
  await stopWorkspace(harness, 'workspace-one', 12)
  await harness.env.DB.prepare(
    'UPDATE workspaces SET next_disk_keepalive_at = ? WHERE id = ?',
  )
    .bind(TEST_TIME + DAY_MS, 'workspace-one')
    .run()
  return {
    ...members,
    client,
    production,
    async seedArchive(
      workspaceId: string,
      expiresAt: number,
      providerAccount = 'boat',
    ) {
      const sandboxId = `sandbox-${workspaceId}`
      const archivedAt = expiresAt - 1_209_600_000
      await seedWorkspace(
        harness,
        org,
        member.user,
        workspaceId,
        undefined,
        null,
      )
      await harness.env.DB.prepare(
        `UPDATE workspaces SET sandbox_id = ?, provider_account = ?, state = 'archived',
         archived_at = ?, stopped_at = ?, next_disk_keepalive_at = ? WHERE id = ?`,
      )
        .bind(
          sandboxId,
          providerAccount,
          archivedAt,
          TEST_TIME,
          Math.min(TEST_TIME + 1_123_200_000, expiresAt),
          workspaceId,
        )
        .run()
      return { workspaceId, sandboxId, archivedAt, providerAccount }
    },
    deleteOrg: () =>
      client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      ),
    cleanup: () =>
      cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
    async setTime(at: number) {
      client.setTime(at)
      await harness.native.setTime(at)
    },
    async archiveRecord(workspaceId: string) {
      const computer = (await computerRecords(harness.env.DB)).find(
        (row) => row.purposeId === workspaceId,
      )
      const resource = (await cleanupResources(harness.env.DB, org.id)).find(
        (row) =>
          row.kind === 'sandbox' &&
          row.id === computer?.sandboxId &&
          row.providerAccount === computer.providerAccount,
      )
      const disk = await harness.env.DB.prepare(
        'SELECT sandbox_id AS sandboxId FROM workspaces WHERE id = ?',
      )
        .bind(workspaceId)
        .first<{ sandboxId: string | null }>()
      return { computer, resource, disk }
    },
  }
}
