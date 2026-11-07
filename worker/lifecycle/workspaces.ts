import type { User } from '../../src/shared/api'
import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { requireOrgMember } from './access'
import {
  existingCreation,
  claimCreation,
  recordedCreationJob,
  repairCreationPlan,
  type CreationKey,
  type CreationClaim,
} from './creation-claims'
import { markCreationFailed } from './creation-attempt-data'
import { prepareCreationRequest } from './create-request'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceRuntime } from './workspace-runtime'
import {
  provisionedResponse,
  type ProvisionedWorkspace,
} from './workspace-response'

export async function createWorkspace(
  runtime: WorkspaceRuntime,
  orgId: string,
  user: User,
  input: CreateWorkspaceRequest,
  sender: User = user,
): Promise<ProvisionedWorkspace> {
  await requireOrgMember(runtime.env.DB, orgId, user.id)
  await requireOrgMember(runtime.env.DB, orgId, sender.id)
  const key: CreationKey = {
    orgId,
    senderUserId: sender.id,
    messageId: input.firstMessage.id,
  }
  const existing = await existingCreation(runtime.env.DB, key)
  if (existing?.state === 'succeeded')
    return provisionedResponse(runtime, orgId, existing.id)
  if (existing) {
    const result = await runtime
      .workspace(existing.id)
      .readCreationLifecycleResult()
    if (result?.ok) return provisionedResponse(runtime, orgId, existing.id)
    if (result) await markCreationFailed(runtime.env.DB, existing.id)
    else return joinCreation(runtime, key, existing, user, sender, input)
  }
  const candidate = await prepareCreationRequest(
    runtime,
    orgId,
    user,
    sender,
    input,
  )
  const claim = await claimCreation(runtime.env.DB, key, candidate)
  if (claim.state === 'succeeded')
    return provisionedResponse(runtime, orgId, claim.id)
  return joinCreation(runtime, key, claim, user, sender, input)
}

async function joinCreation(
  runtime: WorkspaceRuntime,
  key: CreationKey,
  claim: CreationClaim,
  user: User,
  sender: User,
  input: CreateWorkspaceRequest,
): Promise<ProvisionedWorkspace> {
  let job = await recordedCreationJob(
    runtime.env.DB,
    key,
    claim.id,
    input.firstMessage.text,
  )
  if (!job) {
    await repairCreationPlan(
      runtime.env.DB,
      await prepareCreationRequest(
        runtime,
        key.orgId,
        user,
        sender,
        input,
        claim.id,
      ),
    )
    job = await recordedCreationJob(
      runtime.env.DB,
      key,
      claim.id,
      input.firstMessage.text,
    )
  }
  if (!job) throw new Error('Missing recorded creation plan')
  const endpoint = runtime.workspace(claim.id)
  await endpoint.queueLifecycleStart(job)
  const result = await endpoint.waitCreationAdmission()
  if (!result.ok)
    throw Object.assign(new WorkspaceStartError(result.error.log), result.error)
  return result.created
}
