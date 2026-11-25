import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { compareMergeBase } from '../github/compare-merge-base'
import { changePullRequestBase } from '../github/pull-client'
import { readQueuePull } from '../github/queue-pulls'
import type { GitHubStack } from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import type { QueueFixTurns } from './fix-turns'
import { ageQueueListFacts } from './list-facts-data'
import { queueLeaveFor, queueMergeAccess } from './merge-choice'
import type { QueuePullSnapshot } from './merge-read'
import { queueWorkspace } from './repository'
import { layerAncestry } from './restack-ancestry'
import {
  expectQueueBase,
  forgetExpectedQueueBase,
  saveQueuedGitHubRef,
} from './restack-data'
import type { QueueStackChanges } from './stack-changes'
import { openStackLayers } from './stack-read'
import { leaveQueue, type QueueRuntime } from './step'

type LayerStep =
  'ready' | 'changed' | 'fix' | { wait: MergeQueueWait; retry?: true }
export type LayerBase = {
  branch: string
  head: string
  pullNumber: number | null
}
const rebaseWait = { wait: 'rebase' } as const
const retryRebase = { wait: 'rebase', retry: true } as const

export class QueueLayerRestack {
  private readonly runtime: QueueRuntime
  private readonly fixes: QueueFixTurns
  private readonly stacks: QueueStackChanges

  constructor(
    runtime: QueueRuntime,
    fixes: QueueFixTurns,
    stacks: QueueStackChanges,
  ) {
    this.runtime = runtime
    this.fixes = fixes
    this.stacks = stacks
  }

  async move(
    queue: QueueRecord,
    entries: QueueEntry[],
    stack: GitHubStack | null,
    index: number,
    read: QueuePullSnapshot,
    base: LayerBase,
    token: string,
    needsDetach: boolean,
  ): Promise<LayerStep> {
    const { entry, pull } = read
    const { env, dependencies } = this.runtime
    const { headSha, baseBranch } = pull
    if (!isGitCommitOid(headSha)) return retryRebase
    const compare = (below: string | undefined) =>
      compareMergeBase(
        dependencies.fetch,
        token,
        queue.fullName,
        below,
        headSha,
      )
    const ancestry = await layerAncestry(
      dependencies.fetch,
      token,
      queue.fullName,
      entry,
      base.head,
      headSha,
    )
    if (ancestry === 'contained') return rebaseWait
    if (ancestry === 'unknown') return retryRebase
    const aligned = ancestry === 'aligned'
    const syncing = entry.syncFrom && entry.syncFrom !== headSha
    const active = await this.fixes.active()
    if (active?.entry.workspaceId === entry.workspaceId) {
      const stillNeeded =
        (!aligned || syncing) &&
        active.restack.base === base.branch &&
        active.restack.baseHead === base.head &&
        (!active.restack.sync || active.restack.sync.head === headSha)
      if (stillNeeded || !(await this.fixes.cancelUnsent(active))) {
        await this.fixes.advance(queue)
        return 'fix'
      }
    }

    if (aligned && syncing) {
      const writer = await this.writer(queue, entries, entry)
      if ('step' in writer) return writer.step
      const result = requireFeatureResult(
        await workspaceBinding(env)
          .getByName(entry.workspaceId)
          .syncMergeQueueHead(queueWorkspace(queue, entry), {
            oldHead: entry.syncFrom ?? '',
            newHead: headSha,
          }),
      )
      if (result === 'active-turn') return { wait: 'active-turn', retry: true }
      if (result === 'retry') return retryRebase
      if (result === 'restack' && entry.syncFrom)
        return this.fix(queue, entry, base, entry.syncFrom, {
          head: headSha,
        })
    }

    if (!aligned) {
      const old = entry.oldBase ?? undefined
      const oldBase =
        old && (entry.oldBaseHead === headSha || (await compare(old)) === old)
          ? old
          : old
            ? undefined
            : await compare(read.baseHead)
      await saveQueuedGitHubRef(env.DB, entry, {
        base: baseBranch,
        head: headSha,
        oldBase,
      })
      const writer = await this.writer(queue, entries, entry)
      if ('step' in writer) return writer.step
      return this.fix(queue, entry, base, oldBase)
    }

    await saveQueuedGitHubRef(env.DB, entry, {
      base: baseBranch,
      head: headSha,
      oldBase: base.head,
      clearSync: Boolean(syncing),
    })
    const onStack =
      stack && openStackLayers(stack)[index]?.number === entry.pullNumber
    if (onStack && baseBranch === base.branch) return 'ready'
    if (stack && stack.number !== queue.githubStackNumber)
      return { wait: 'rules', retry: true }
    const writer = await this.writer(queue, entries, entry)
    if ('step' in writer) return writer.step
    if (needsDetach || index > 0 || baseBranch !== base.branch) {
      const other = await this.stacks.detachOtherStack(
        queue,
        entries,
        entry,
        writer,
      )
      if (other === 'blocked') return { wait: 'rules', retry: true }
      if (other === 'changed') return 'changed'
    }
    // Read both refs again as the writer. The pinned comparison above only
    // applies while GitHub still has those two heads.
    const live = await readQueuePull(
      writer.fetch,
      writer.token,
      queueWorkspace(queue, entry),
      entry.branch,
      base.branch,
    )
    if (
      live.kind !== 'open' ||
      live.defaultBranch !== queue.trunk ||
      live.fullName !== queue.fullName ||
      live.pull.number !== entry.pullNumber ||
      live.pull.headSha !== headSha ||
      live.refHead !== base.head ||
      live.pull.base !== baseBranch ||
      live.pull.draft
    )
      return retryRebase
    if (baseBranch !== base.branch) {
      await expectQueueBase(env.DB, entry, base.branch)
      try {
        await changePullRequestBase(
          writer.fetch,
          writer.token,
          queue.fullName,
          entry.pullNumber,
          base.branch,
        )
      } catch (error) {
        if (
          error instanceof HttpError &&
          [
            'github_validation_failed',
            'github_access_required',
            'github_not_found',
            'github_conflict',
          ].includes(error.code)
        )
          await forgetExpectedQueueBase(env.DB, entry, base.branch)
        throw error
      }
      await ageQueueListFacts(env.DB, queue.id).run()
      return 'changed'
    }
    return (await this.stacks.attach(queue, stack, entries, index, writer))
      ? 'changed'
      : 'ready'
  }

  private async writer(
    queue: QueueRecord,
    entries: QueueEntry[],
    entry: QueueEntry,
  ) {
    const access = await queueMergeAccess(
      this.runtime,
      queue,
      entry,
      entry.queuerUserId,
    )
    if (access.kind === 'write') return access.member
    if (access.kind === 'token')
      return { step: { wait: 'token', retry: true } as const }
    await leaveQueue(this.runtime, queue, entries, {
      ...queueLeaveFor(entry),
      cause: 'write-access-lost',
    })
    return { step: 'changed' as const }
  }

  private async fix(
    queue: QueueRecord,
    entry: QueueEntry,
    base: LayerBase,
    oldBase: string | undefined,
    sync?: { head: string },
  ): Promise<LayerStep> {
    if (!isGitCommitOid(oldBase)) return rebaseWait
    const id = JSON.stringify([
      entry.workspaceId,
      entry.queuedAt,
      entry.unitId,
      entry.pullNumber,
      base.branch,
      base.head,
      sync?.head ?? null,
      sync ? oldBase : null,
    ])
    const previous = await this.fixes.read(id)
    if (previous?.state === 'ended') return rebaseWait
    const active = await this.fixes.active()
    if (active && !(await this.fixes.cancelUnsent(active))) {
      await this.fixes.advance(queue)
      return retryRebase
    }
    await this.fixes.request(queue, entry.workspaceId, {
      id,
      base: base.branch,
      baseHead: base.head,
      basePullNumber: base.pullNumber,
      oldBase,
      ...(sync && { sync }),
    })
    await this.fixes.advance(queue)
    return 'fix'
  }
}
