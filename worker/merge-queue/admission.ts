import type { AppDependencies, AppEnv } from '../env'
import { compareMergeBase } from '../github/compare-merge-base'
import type { GitHubWorkspace } from '../github/contracts'
import { readMergeWorkspace } from '../github/merge-access'
import type { repositoryMemberGitHub } from '../github/member-github'
import {
  readQueuePull,
  trunkRequiresMergeQueue,
  type QueuePull,
} from '../github/queue-pulls'
import { markPullRequestReady } from '../github/ready'
import { listPullRequestStacks } from '../github/stack-client'
import type { QueueCandidate, QueueEntry, QueueScope } from './contracts'
import { otherOrgQueuesRepository, workspaceForQueueBranch } from './data'
import {
  queueChanged,
  queueFork,
  queueMerging,
  queuePullMissing,
  queueRepositoryBusy,
  queueRequiresGitHub,
  queueStackWorkspaceMissing,
  queueUnitConflict,
  queueWrongBase,
} from './errors'
import { addQueueEntries } from './writes'

type Member = Awaited<ReturnType<typeof repositoryMemberGitHub>>
type Layer = QueueCandidate & { pull: QueuePull }
interface AddContext {
  env: AppEnv
  dependencies: AppDependencies
  scope: QueueScope
  workspace: GitHubWorkspace
  memberId: string
  member: Member
  entries: QueueEntry[]
  githubStackNumber: number | null
  storedTrunk: string | null
}

async function readUnit(context: AddContext) {
  const { env, scope, workspace, member } = context
  const read = (head: string) =>
    member.checked(() =>
      readQueuePull(member.fetch, member.token, workspace, head),
    )
  const top = await read(workspace.branch)
  if (top.kind === 'fork') throw queueFork()
  if (top.kind !== 'open') throw queuePullMissing()
  const trunk = top.defaultBranch
  const layers: Layer[] = [
    {
      workspaceId: workspace.id,
      branch: workspace.branch,
      pullNumber: top.pull.number,
      pull: top.pull,
    },
  ]
  if (
    context.entries.some(
      (entry) =>
        entry.workspaceId === workspace.id &&
        entry.branch === workspace.branch &&
        entry.pullNumber === top.pull.number,
    )
  )
    return { layers, trunk, fullName: top.fullName }
  const heads = new Set([workspace.branch])
  let base = top.pull.base
  while (base !== trunk) {
    if (heads.has(base)) throw queueWrongBase()
    heads.add(base)
    const lower = await read(base)
    if (lower.defaultBranch !== trunk) throw queueChanged()
    if (lower.kind === 'fork') throw queueFork()
    if (lower.kind !== 'open') throw queueWrongBase()
    const row = await workspaceForQueueBranch(
      env.DB,
      scope,
      base,
      lower.pull.number,
    )
    if (!row) throw queueStackWorkspaceMissing()
    layers.push({
      workspaceId: row.id,
      branch: base,
      pullNumber: lower.pull.number,
      pull: lower.pull,
    })
    if (
      context.entries.some(
        (entry) =>
          entry.workspaceId === row.id &&
          entry.pullNumber === lower.pull.number &&
          entry.branch === base,
      )
    )
      break
    base = lower.pull.base
  }
  layers.reverse()
  if (layers.length > 1) {
    const stacks = await member.checked(() =>
      listPullRequestStacks(
        member.fetch,
        member.token,
        top.fullName,
        top.pull.number,
      ),
    )
    for (const stack of stacks) {
      if (stack.number === context.githubStackNumber) continue
      const end = stack.layers.findIndex(
        (layer) => layer.number === top.pull.number,
      )
      const prefix = stack.layers
        .slice(0, end + 1)
        .filter((layer) => layer.state === 'open')
      if (
        end === -1 ||
        prefix.length !== layers.length ||
        prefix.some((layer, index) => layer.number !== layers[index].pullNumber)
      )
        throw queueChanged()
    }
  }
  return { layers, trunk, fullName: top.fullName }
}

function locateUnit(entries: QueueEntry[], layers: Layer[]) {
  let prefix = 0
  let lower: QueueEntry | undefined
  for (const layer of layers) {
    const indexed = entries.find(
      (entry) =>
        entry.workspaceId === layer.workspaceId ||
        entry.pullNumber === layer.pullNumber,
    )
    if (!indexed) break
    if (
      indexed.workspaceId !== layer.workspaceId ||
      indexed.pullNumber !== layer.pullNumber ||
      indexed.branch !== layer.branch ||
      (lower &&
        (indexed.unitId !== lower.unitId || indexed.place !== lower.place + 1))
    )
      throw queueUnitConflict()
    lower = indexed
    prefix += 1
  }
  const appended = layers.slice(prefix)
  if (
    appended.some((layer) =>
      entries.some(
        (entry) =>
          entry.workspaceId === layer.workspaceId ||
          entry.pullNumber === layer.pullNumber,
      ),
    )
  )
    throw queueUnitConflict()
  if (lower && appended.length) {
    const boundary = lower
    if (
      entries.some(
        (entry) =>
          entry.unitId === boundary.unitId && entry.place > boundary.place,
      )
    )
      throw queueUnitConflict()
    if (
      entries.some(
        (entry) =>
          entry.unitId === boundary.unitId && entry.state === 'merging',
      )
    )
      throw queueMerging()
  }
  return { appended, lower }
}

export async function addUnit(context: AddContext): Promise<void> {
  const { env, dependencies, scope, workspace, memberId, member, entries } =
    context
  if (await otherOrgQueuesRepository(env.DB, scope)) throw queueRepositoryBusy()
  const { layers, trunk, fullName } = await readUnit(context)
  if (entries.length && context.storedTrunk !== trunk) throw queueChanged()
  const { appended, lower } = locateUnit(entries, layers)
  if (!appended.length) return
  if (
    await member.checked(() =>
      trunkRequiresMergeQueue(member.fetch, member.token, fullName, trunk),
    )
  )
    throw queueRequiresGitHub()
  for (const layer of appended) {
    const target = await readMergeWorkspace(
      env.DB,
      scope.orgId,
      layer.workspaceId,
      memberId,
    )
    if (
      target.branch !== layer.branch ||
      target.repositoryId !== scope.githubRepositoryId ||
      target.installationId !== workspace.installationId
    )
      throw queueChanged()
  }
  for (const layer of appended)
    if (layer.pull.draft)
      await member.checked(() =>
        markPullRequestReady(member.fetch, member.token, layer.pull.nodeId),
      )
  await member.authorize()
  const candidates = await Promise.all(
    appended.map(async ({ workspaceId, branch, pullNumber, pull }) => ({
      workspaceId,
      branch,
      pullNumber,
      memberBase: pull.base === trunk ? null : pull.base,
      githubBase: pull.base,
      oldBase: await compareMergeBase(
        member.fetch,
        member.token,
        fullName,
        pull.baseSha,
        pull.headSha,
      ).catch(() => undefined),
      oldBaseHead: pull.headSha,
    })),
  )
  await member.authorize()
  const added = await addQueueEntries(env.DB, {
    scope,
    workspace,
    memberId,
    trunk,
    unitId: lower?.unitId ?? dependencies.randomToken(),
    place: (lower?.place ?? entries.at(-1)?.place ?? 0) + 1,
    candidates,
    now: dependencies.now(),
    writeId: dependencies.randomToken(),
  })
  if (added) return
  await member.authorize()
  if (await otherOrgQueuesRepository(env.DB, scope)) throw queueRepositoryBusy()
  throw queueChanged()
}
