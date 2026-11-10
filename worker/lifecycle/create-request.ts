import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { hash } from '../security/crypto'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { requireOrgMember } from './access'
import { readCreationImage } from './published-image-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'

export interface WorkspaceCreationInput extends CreateWorkspaceRequest {
  name?: string
}

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
  input: WorkspaceCreationInput,
  reservedId?: string,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<WorkspaceStartJob> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, orgId, user.id)
  const image = await readCreationImage(
    env.DB,
    orgId,
    input.repositoryId,
    providerAccount,
  )
  const { repository } = image
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
    providerAccount: image.providerAccount,
    imageName: image.imageName,
    startupScript: image.startupScript,
    environmentCiphertext: image.environmentCiphertext,
    defaultBranch: repository.defaultBranch,
    repositoryLocations: image.repositoryLocations,
    turnId,
    attempt: `workspace-${id}-${dependencies.randomToken()}`,
    phase: 'records',
    creation: {
      user,
      sender,
      repositoryId: repository.id,
      sectionId: input.sectionId,
      city,
      ...(input.name !== undefined && { name: input.name }),
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
