import { modelChoice } from '../app-api/models'
import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { workspaceBranch } from './workspace-branch'
import { readCreationImage } from './published-image-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'
import { creationBranches } from './create-branches'
import { readCreationCapabilities } from '../secrets/capabilities-input'
import { requireOrgSecrets } from '../secrets/capabilities-data'

export interface WorkspaceCreationBase {
  branch: string
  startSha?: string
}

export interface WorkspaceCreationInput extends CreateWorkspaceRequest {
  name?: string
  firstSessionTitle?: string
  parentId?: string
}

/**
 * The plan of a new create checks the selected secrets. Each caller has
 * already checked that the org is active and that the user and the sender
 * are members, in the same request.
 */
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
  const providerAccount = await readOrgProviderAccount(env.DB, orgId)
  const capabilities = readCreationCapabilities(input.capabilities)
  await requireOrgSecrets(env.DB, orgId, capabilities.preapprovedSecretIds)
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
  const id = reservedId ?? dependencies.randomToken()
  const sessionId = dependencies.randomToken()
  const turnId = dependencies.randomToken()
  const { city, branch } = await workspaceBranch(
    user.githubLogin,
    dependencies.randomToken,
    { name: input.name },
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
      parentId: input.parentId,
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
      capabilities,
    },
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
}
