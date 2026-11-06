import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import { hash } from '../security/crypto'
import { requireOrgMember } from './access'
import { lifecycleProvider } from './lifecycle-provider'
import { readImageSettings, selectedRepositories } from './settings-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'

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

export async function prepareCreationRequest(
  runtime: WorkspaceRuntime,
  orgId: string,
  user: User,
  sender: User,
  input: CreateWorkspaceRequest,
  reservedId?: string,
): Promise<WorkspaceStartJob> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, orgId, user.id)
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
  const id = reservedId ?? dependencies.randomToken()
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
  return {
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
  }
}
