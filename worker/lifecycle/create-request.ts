import { modelChoice } from '../app-api/models'
import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { workspaceBranch } from './workspace-branch'
import { requireOrgMember } from './access'
import { readCreationImage } from './published-image-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'
import { creationBranches } from './create-branches'

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
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
  base?: WorkspaceCreationBase,
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
  const branches = base
    ? { startBranch: base.branch, baseBranch: base.branch }
    : await creationBranches(
        env,
        dependencies,
        orgId,
        sender.id,
        input,
        repository.defaultBranch,
      )
  await requireOrgMember(env.DB, orgId, user.id)
  await requireOrgMember(env.DB, orgId, sender.id)
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
    ...branches,
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
      ...(!base && {
        branches: {
          startBranch: input.startBranch,
          baseBranch: input.baseBranch,
        },
      }),
      request: {
        ...input.firstMessage,
        choice: modelChoice(env, input.firstMessage.choice),
      },
      createdAt: dependencies.now(),
    },
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
}
