import type { GitHubSummary } from '../../../../src/shared/generated/GitHubSummary'
import {
  attentionRowLabel,
  belowName,
  queueStepLabel,
} from '../components/workspace/queueCopy'
import type {
  AttentionReason,
  QueueFacts,
  QueueStep,
} from '../components/workspace/queueModel'
import type {
  MergeQueueList,
  QueueEntry,
  QueueUnit,
} from '../components/workspaces/queue'
import type {
  OpenWorkspace,
  SidebarSection,
  WorkspaceRow,
} from '../components/workspaces/sections'
import { defined } from '../defined'
import { pullRequestOf, queuedWorkspace } from '../fixtures/mergeQueue'
import { repositories, type RepositoryKey } from '../fixtures/repositories'
import type { ActivityStatus } from '../fixtures/workspaces'

/** How a queued workspace looks in a state: its GitHub state and status. */
type RowSpec = {
  key: string
  github: GitHubSummary
  /** Without it, the status of its fixture. */
  status?: ActivityStatus
  /** The screen that opens it, when the mockups draw one. */
  to?: string
}

/** A layer of the stack in a state, with its step. */
export type LayerSpec = RowSpec & { step: QueueStep; unit?: QueueUnit }

/** An entry below the stack, with why it needs attention. */
type AttentionSpec = RowSpec & { reason: AttentionReason }

/** The queue of one repository in a state, place 1 first. */
type BlockSpec = {
  repository: RepositoryKey
  stack: readonly LayerSpec[]
  attention?: readonly AttentionSpec[]
}

/** The queues of Acme in a state, in the order of its repositories. */
export type QueueSpec = readonly BlockSpec[]

/**
 * The layers above the layer at `index` in its member stack: the next
 * layers of its unit, up to the last one. None for a layer alone.
 */
export function unitAbove(
  stack: readonly LayerSpec[],
  index: number,
): LayerSpec[] {
  const unit = stack[index]?.unit
  if (unit !== 'first' && unit !== 'middle') return []
  const end = stack.findIndex(
    (layer, place) => place > index && layer.unit === 'last',
  )
  return end < 0 ? [] : stack.slice(index + 1, end + 1)
}

/** The keys of the workspaces that the queues of a state hold. */
export function queuedKeys(spec: QueueSpec): ReadonlySet<string> {
  return new Set(
    spec.flatMap((block) => [
      ...block.stack.map((layer) => layer.key),
      ...(block.attention ?? []).map((entry) => entry.key),
    ]),
  )
}

/**
 * The row of a queued workspace. The open workspace shows its current
 * status and the GitHub state of its bar, and it is selected.
 */
function rowOf(spec: RowSpec, open?: OpenWorkspace): WorkspaceRow {
  if (open?.workspace.key === spec.key) {
    const { workspace, status } = open
    return { workspace, status, github: workspace.github, selected: true }
  }
  const record = queuedWorkspace(spec.key)
  return {
    workspace: { ...record, github: spec.github },
    status: spec.status ?? record.status,
    github: spec.github,
    selected: false,
    ...defined({ to: spec.to }),
  }
}

/**
 * The Merge queue group of a state: a block for each queue, with the step
 * of each layer in words, and why each entry below the stack needs
 * attention. `open` is the workspace that the main area shows.
 */
export function queueListOf(
  spec: QueueSpec,
  open?: OpenWorkspace,
): MergeQueueList {
  return {
    blocks: spec.map((block) => {
      const trunk = repositories[block.repository].defaultBranch
      const entries = block.stack.map((layer, index): QueueEntry => {
        const lower = block.stack[index - 1]
        const below = belowName(lower ? pullRequestOf(lower.key) : null, trunk)
        const row = rowOf(layer, open)
        return {
          row,
          pullRequest: pullRequestOf(layer.key),
          step: queueStepLabel(layer.step, below, row.github),
          ...defined({ unit: layer.unit }),
        }
      })
      const attention = (block.attention ?? []).map((entry): QueueEntry => ({
        row: rowOf(entry, open),
        pullRequest: pullRequestOf(entry.key),
        step: attentionRowLabel(entry.reason),
      }))
      const { name } = repositories[block.repository]
      return { repository: block.repository, name, entries, attention }
    }),
  }
}

/**
 * The queue facts of a workspace in a state: a layer of a stack, with its
 * place and the pull request below it, an entry that needs attention, or a
 * pull request that can join. A layer waits for the lowest layer below it
 * that is not ready, and the layers above it in its member stack leave
 * with it.
 */
export function queueFactsOf(spec: QueueSpec, key: string): QueueFacts {
  for (const block of spec) {
    const place = block.stack.findIndex((layer) => layer.key === key)
    const layer = block.stack[place]
    if (layer) {
      const lower = block.stack[place - 1]
      const waiting = block.stack
        .slice(0, place)
        .find((item) => item.step !== 'ready')
      return {
        kind: 'entry',
        place: place + 1,
        size: block.stack.length,
        below: lower ? pullRequestOf(lower.key) : null,
        step: layer.step,
        ...defined({
          waitsFor:
            layer.step === 'ready' && waiting
              ? pullRequestOf(waiting.key)
              : undefined,
          stackedAbove: unitAbove(block.stack, place).length || undefined,
        }),
      }
    }
    const entry = block.attention?.find((item) => item.key === key)
    if (entry) return { kind: 'attention', reason: entry.reason }
  }
  return { kind: 'open' }
}

/** The sections without the workspaces that the queues hold. */
export function sectionsWithout(
  sections: readonly SidebarSection[],
  queued: ReadonlySet<string>,
): SidebarSection[] {
  return sections.map((item) => ({
    ...item,
    rows: item.rows.filter((row) => !queued.has(row.workspace.key)),
  }))
}
