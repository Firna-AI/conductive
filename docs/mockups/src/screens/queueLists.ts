import type { GitHubSummary } from '../../../../src/shared/generated/GitHubSummary'
import {
  cannotMerge,
  type MergeProblem,
  type QueueFacts,
  type QueueStep,
} from '../../../../src/ui/components/workspace/queueModel'
import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'
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

/** How a queued workspace looks in a state: its GitHub state and status. */
type RowSpec = {
  key: string
  github: GitHubSummary
  /** Without it, the status of its fixture. */
  status?: ActivityStatus
  /** The screen that opens it, when the mockups draw one. */
  to?: string
}

/**
 * A layer of the stack in a state, with its step, and why the queue could
 * not merge it, if it tried.
 */
export type LayerSpec = RowSpec & {
  step: QueueStep
  unit?: QueueUnit
  problem?: MergeProblem
}

/** The queue of one repository in a state, place 1 first. */
type BlockSpec = {
  repository: RepositoryKey
  stack: readonly LayerSpec[]
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
  return new Set(spec.flatMap((block) => block.stack.map((layer) => layer.key)))
}

/**
 * The row of a queued workspace, as a section shows it. The open workspace
 * shows its current status and the GitHub state of its bar, and it is
 * selected. A workspace whose agent works in the state shows activity now.
 */
function rowOf(spec: RowSpec, open?: OpenWorkspace): WorkspaceRow {
  if (open?.workspace.key === spec.key) {
    const { workspace, status } = open
    return { workspace, status, github: workspace.github, selected: true }
  }
  const record = queuedWorkspace(spec.key)
  const status = spec.status ?? record.status
  return {
    workspace: {
      ...record,
      github: spec.github,
      ...(status === 'working' ? { updated: 'now' } : {}),
    },
    status,
    github: spec.github,
    selected: false,
    ...defined({ to: spec.to }),
  }
}

/**
 * The Merge queue group of a state: a block for each queue, with the rows
 * of its stack in their places, also the rows that cannot merge. `open` is
 * the workspace that the main area shows.
 */
export function queueListOf(
  spec: QueueSpec,
  open?: OpenWorkspace,
): MergeQueueList {
  return {
    blocks: spec.map((block) => {
      const entries = block.stack.map((layer): QueueEntry => ({
        row: rowOf(layer, open),
        ...defined({ unit: layer.unit }),
      }))
      const { name } = repositories[block.repository]
      return { repository: block.repository, name, entries }
    }),
  }
}

/**
 * The pull request of the lowest layer below the layer at `index` that
 * the queue waits for: one that cannot merge until a member acts, or,
 * while the layer is ready, one that is not ready yet. The layers above an
 * entry that cannot merge wait for it.
 */
function waitsForOf(
  stack: readonly LayerSpec[],
  index: number,
): number | undefined {
  const ready = stack[index]?.step === 'ready'
  const waited = stack
    .slice(0, index)
    .find(
      (item) => cannotMerge(item.github) || (ready && item.step !== 'ready'),
    )
  return waited ? pullRequestOf(waited.key) : undefined
}

/**
 * The queue facts of a workspace in a state: a layer of a stack, with its
 * place, the pull request below it, the layer that it waits for, and why
 * the queue could not merge it, or a pull request that can join. The
 * layers above it in its member stack leave with it.
 */
export function queueFactsOf(spec: QueueSpec, key: string): QueueFacts {
  for (const block of spec) {
    const place = block.stack.findIndex((layer) => layer.key === key)
    const layer = block.stack[place]
    if (layer) {
      const lower = block.stack[place - 1]
      return {
        kind: 'entry',
        place: place + 1,
        size: block.stack.length,
        below: lower ? pullRequestOf(lower.key) : null,
        step: layer.step,
        ...defined({
          waitsFor: waitsForOf(block.stack, place),
          problem: layer.problem,
          stackedAbove: unitAbove(block.stack, place).length || undefined,
        }),
      }
    }
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
