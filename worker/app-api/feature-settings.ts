import type { UpdateOrgSettingsRequest } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { isRecord, requiredString } from '../http'
import {
  orgEnvironmentContext,
  workspaceEnvironment,
} from '../lifecycle/settings-data'
import {
  assertCanChangeSharedSettings,
  requireOrgMember,
} from '../members/permissions'
import { encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import { invalidShellInput, optionalShellString } from './feature-shell-access'
import {
  readShellSettings,
  shellSettingsView,
  updateShellSettings,
} from './feature-settings-data'

type EnvChange = NonNullable<UpdateOrgSettingsRequest['envVars']>[number]

function environmentChanges(value: unknown): EnvChange[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw invalidShellInput()
  return value.map((entry: unknown) => {
    if (!isRecord(entry)) throw invalidShellInput()
    const name = requiredString(entry.name)
    if (entry.operation === 'remove') return { operation: 'remove', name }
    if (entry.operation !== 'set' || typeof entry.value !== 'string')
      throw invalidShellInput()
    return { operation: 'set', name, value: entry.value }
  })
}

export async function featureSettings(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  write: boolean,
): Promise<Response> {
  if (!context.org) throw invalidShellInput()
  const orgId = context.org.id
  const userId = context.user.id
  await requireOrgMember(env.DB, orgId, userId)
  if (write) {
    const installScript = optionalShellString(context.body?.installScript)
    const startupScript = optionalShellString(context.body?.startupScript)
    const changes = environmentChanges(context.body?.envVars)
    for (;;) {
      await assertCanChangeSharedSettings(env.DB, orgId, userId)
      const before = await readShellSettings(env.DB, orgId)
      let environment = await workspaceEnvironment(
        env,
        orgId,
        before.envVarsCiphertext,
      )
      for (const change of changes ?? []) {
        if (change.operation === 'remove') delete environment[change.name]
        else environment = { ...environment, [change.name]: change.value }
      }
      const envVarsCiphertext =
        changes === undefined
          ? undefined
          : await encrypt(
              JSON.stringify(environment),
              orgEnvironmentContext(orgId),
              env.BOAT_KEY_ENCRYPTION_KEY,
            )
      const saved = await updateShellSettings(env.DB, {
        orgId,
        userId,
        before,
        installScript,
        startupScript,
        envVarsCiphertext,
        now: dependencies.now(),
      })
      if (saved) break
    }
  }
  const row = await readShellSettings(env.DB, orgId)
  return Response.json({
    settings: shellSettingsView(
      row,
      await workspaceEnvironment(env, orgId, row.envVarsCiphertext),
    ),
  })
}
