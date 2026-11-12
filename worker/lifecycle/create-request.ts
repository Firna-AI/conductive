import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { workspaceBranch } from './workspace-branch'
import { requireOrgMember } from './access'
import { readCreationImage } from './published-image-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'

export interface WorkspaceCreationBase {
  branch: string
  startSha?: string
}

export interface WorkspaceCreationInput extends CreateWorkspaceRequest {
  name?: string
  firstSessionTitle?: string
}

export async function prepareCreationRequest(
  runtime: WorkspaceRuntime,
  orgId: string,
  user: User,
  sender: User,
  input: WorkspaceCreationInput,
  reservedId?: string,
  base?: WorkspaceCreationBase,
): Promise<WorkspaceStartJob> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, orgId, user.id)
  const providerAccount = await readOrgProviderAccount(env.DB, orgId)
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
  const { city, branch } = await workspaceBranch(
    user.githubLogin,
    dependencies.randomToken,
  )
  return {
    workspaceId: id,
    orgId,
    kind: 'create',
    providerAccount: image.providerAccount,
    imageName: image.imageName,
    startupScript: image.startupScript,
    environmentCiphertext: image.environmentCiphertext,
    defaultBranch: repository.defaultBranch,
    baseBranch: base?.branch,
    startSha: base?.startSha,
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
      firstSessionTitle: input.firstSessionTitle,
      request: input.firstMessage,
      createdAt: dependencies.now(),
    },
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
}
