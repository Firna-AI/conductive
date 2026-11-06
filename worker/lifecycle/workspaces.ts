import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import { lifecycleProvider } from './lifecycle-provider'
import { hash } from '../security/crypto'
import { requireOrgMember } from './access'
import { readImageSettings, selectedRepositories } from './settings-data'
import { registerCreationAttempt } from './creation-attempt-data'
import {
  deleteProvisionalWorkspace,
  findCreatedWorkspace,
} from './workspace-data'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceRuntime } from './workspace-runtime'
import {
  provisionedResponse,
  type ProvisionedWorkspace,
} from './workspace-response'

const CITIES = [
  'lisbon',
  'oslo',
  'kyoto',
  'perth',
  'lima',
  'riga',
  'bern',
  'seoul',
  'milan',
  'porto',
  'quito',
  'delft',
] as const

export async function createWorkspace(
  runtime: WorkspaceRuntime,
  orgId: string,
  user: User,
  input: CreateWorkspaceRequest,
  sender: User = user,
): Promise<ProvisionedWorkspace> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, orgId, user.id)
  await requireOrgMember(env.DB, orgId, sender.id)
  const prior = await findCreatedWorkspace(
    env.DB,
    orgId,
    sender.id,
    input.firstMessage.id,
  )
  if (prior) return provisionedResponse(runtime, orgId, prior.id, sender, input)
  const repository = (await selectedRepositories(env.DB, orgId)).find(
    (entry) => entry.id === input.repositoryId,
  )
  if (!repository)
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  const settings = await readImageSettings(env.DB, orgId)
  if (!settings.imageName)
    throw new HttpError(
      409,
      'image_required',
      'Ask an org admin to build the cloud computer image first.',
    )
  await lifecycleProvider(env, user.id, orgId, dependencies.fetch)
  const id = dependencies.randomToken()
  const endpoint = runtime.workspace(id)
  const sessionId = dependencies.randomToken()
  const turnId = dependencies.randomToken()
  const random = await hash(dependencies.randomToken())
  const city = CITIES[random.charCodeAt(0) % CITIES.length]
  const suffix = [...random.slice(1, 5)]
    .map(
      (character) =>
        'abcdefghijklmnopqrstuvwxyz0123456789'[character.charCodeAt(0) % 36],
    )
    .join('')
  const branch = `${user.githubLogin}/${city}-${suffix}`
  let accepted = false
  try {
    await registerCreationAttempt(env.DB, {
      id,
      orgId,
      senderUserId: sender.id,
      messageId: input.firstMessage.id,
      now: dependencies.now(),
    })
    accepted = true
    await endpoint.queueLifecycleStart({
      workspaceId: id,
      orgId,
      kind: 'create',
      imageName: settings.imageName,
      startupScript: settings.startupScript,
      environmentCiphertext: settings.envVarsCiphertext,
      defaultBranch: repository.defaultBranch,
      turnId,
      attempt: `workspace-${id}-${dependencies.randomToken()}`,
      phase: 'records',
      creation: {
        user,
        sender,
        repositoryId: repository.id,
        sectionId: input.sectionId,
        city,
        branch,
        sessionId,
        request: input.firstMessage,
        createdAt: dependencies.now(),
      },
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    })
    const result = await endpoint.waitLifecycleStart()
    if (!result.ok)
      throw Object.assign(
        new WorkspaceStartError(result.error.log),
        result.error,
      )
    return provisionedResponse(runtime, orgId, id, sender, input)
  } catch (error) {
    if (accepted) throw error
    await endpoint.clearLifecycle()
    await deleteProvisionalWorkspace(env.DB, orgId, id)
    throw error
  }
}
