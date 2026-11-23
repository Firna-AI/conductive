import {
  addPullRequestsToStack,
  createPullRequestStack,
  listPullRequestStacks,
  unstackPullRequests,
} from '../github/stack-client'
import type { GitHubStack } from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import { queueChanged } from './errors'
import { leaveOwner } from './leave-data'
import {
  isQueueStackPrefix,
  openStackLayers,
  readOtherStack,
  readQueueStack,
} from './stack-read'
import { reserveStackCreation, saveQueueStack } from './restack-data'
import { stackCleanupWriter, type StackWriter } from './stack-writer'
import type { QueueRuntime } from './step'

const CREATING = 'merge-queue:creating-stack'
type Creation = { numbers: number[]; writerId: string }

async function unstack(
  writer: StackWriter,
  queue: QueueRecord,
  number: number,
) {
  await writer.authorize()
  try {
    const stack = await unstackPullRequests(
      writer.fetch,
      writer.token,
      queue.fullName,
      number,
    )
    return !stack?.open
  } catch (error) {
    if (error instanceof HttpError && error.code === 'github_not_found')
      return true
    throw error
  }
}

export class QueueStackChanges {
  private readonly runtime: QueueRuntime
  private readonly storage: DurableObjectStorage

  constructor(runtime: QueueRuntime, storage: DurableObjectStorage) {
    this.runtime = runtime
    this.storage = storage
  }

  async current(queue: QueueRecord, token: string) {
    return readQueueStack(queue, this.runtime.dependencies.fetch, token)
  }

  async hasPendingCreation() {
    return (await this.storage.get(CREATING)) !== undefined
  }

  async recoverCreation(queue: QueueRecord, token: string) {
    const saved = await this.storage.get<Creation>(CREATING)
    if (!saved) return false
    if (queue.githubStackNumber !== null) {
      await this.storage.delete(CREATING)
      return false
    }
    const stacks = await listPullRequestStacks(
      this.runtime.dependencies.fetch,
      token,
      queue.fullName,
      saved.numbers[0],
    )
    const created = stacks.find(
      (stack) =>
        stack.layers.length === saved.numbers.length &&
        stack.layers.every(
          ({ number }, index) => number === saved.numbers[index],
        ),
    )
    const adopted = await saveQueueStack(
      this.runtime.env.DB,
      queue,
      created?.number ?? null,
      created && saved.writerId,
    )
    if (!adopted.meta.changes)
      await saveQueueStack(this.runtime.env.DB, queue, null)
    await this.storage.delete(CREATING)
    return created !== undefined && adopted.meta.changes === 1
  }

  async cleanup(
    queue: QueueRecord,
    entries: readonly QueueEntry[],
    stack: GitHubStack | null,
  ) {
    if (queue.githubStackNumber === null) return 'ready'
    if (
      stack?.open &&
      !queue.rebuildStack &&
      isQueueStackPrefix(stack, queue, entries)
    )
      return 'ready'
    if (stack?.open) {
      const workspaceId = queue.stackCleanupWorkspaceId
      const fallback =
        workspaceId === null
          ? entries.map((entry) => entry.queuerUserId)
          : [
              queue.stackCleanupActorUserId,
              (await leaveOwner(this.runtime.env.DB, queue, workspaceId))?.id,
            ]
      const writers = new Set([queue.stackWriterUserId, ...fallback])
      let removed = false
      for (const id of writers) {
        if (!id) continue
        try {
          const writer = await stackCleanupWriter(this.runtime, queue, id)
          if (!writer) continue
          removed = await unstack(writer, queue, stack.number)
          break
        } catch (error) {
          if (
            !(error instanceof HttpError) ||
            ![
              'github_access_required',
              'github_reconnect_required',
              'github_refresh_failed',
              'merge_queue_write_required',
              'user_suspended',
            ].includes(error.code)
          )
            throw error
        }
      }
      if (!removed) return 'blocked'
    }
    await saveQueueStack(this.runtime.env.DB, queue, null)
    return 'changed'
  }

  async detachOtherStack(
    queue: QueueRecord,
    entries: readonly QueueEntry[],
    entry: QueueEntry,
    writer: StackWriter,
  ) {
    const other = await readOtherStack(
      this.runtime.env.DB,
      queue,
      entries,
      entry,
      writer.fetch,
      writer.token,
    )
    if (other.kind === 'none') return 'ready'
    if (other.kind !== 'queueable') return 'blocked'
    const { stack } = other
    if (
      queue.githubStackNumber === null &&
      isQueueStackPrefix(stack, queue, entries)
    ) {
      const adopted = await saveQueueStack(
        this.runtime.env.DB,
        queue,
        stack.number,
        entry.queuerUserId,
      )
      return adopted.meta.changes === 1 ? 'changed' : 'blocked'
    }
    return (await unstack(writer, queue, stack.number)) ? 'changed' : 'blocked'
  }

  async attach(
    queue: QueueRecord,
    stack: GitHubStack | null,
    entries: readonly QueueEntry[],
    index: number,
    writer: StackWriter,
  ) {
    const entry = entries[index]
    if (stack && openStackLayers(stack)[index]?.number === entry.pullNumber)
      return false
    if (index === 0) return false
    await writer.authorize()
    if (stack) {
      await addPullRequestsToStack(
        writer.fetch,
        writer.token,
        queue.fullName,
        stack.number,
        [entry.pullNumber],
      )
      return true
    }
    const numbers = [entries[0].pullNumber, entry.pullNumber]
    await this.storage.put<Creation>(CREATING, {
      numbers,
      writerId: entry.queuerUserId,
    })
    await reserveStackCreation(this.runtime.env.DB, queue)
    const created = await createPullRequestStack(
      writer.fetch,
      writer.token,
      queue.fullName,
      numbers,
    )
    const saved = await saveQueueStack(
      this.runtime.env.DB,
      queue,
      created.number,
      entry.queuerUserId,
    )
    if (!saved.meta.changes) throw queueChanged()
    await this.storage.delete(CREATING)
    return true
  }
}
