import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { acmeRail } from '../components/layout/OrgRail'
import {
  joinRefusalText,
  type JoinRefusal,
} from '../../../../src/ui/components/workspace/queueCopy'
import { queueEntries, type QueueDrag } from '../components/workspaces/queue'
import {
  queueActionsOf,
  type ListQueue,
} from '../components/workspaces/queueList'
import {
  rowControls,
  type RowFocus,
} from '../components/workspaces/rowControls'
import {
  workspaceSections,
  type ListDrag,
  type SidebarSection,
} from '../components/workspaces/sections'
import { withTrees } from '../components/workspaces/trees'
import { workspaceMenuSheet } from '../entries/components/screens/listSheets.mockup'
import { viewerMembership } from '../fixtures/members'
import { queuedWorkspace, releaseBranch } from '../fixtures/mergeQueue'
import { repositories } from '../fixtures/repositories'
import { parentOf } from '../fixtures/subWorkspaces'
import { workspaceDrag } from '../fixtures/workspaces'
import {
  queueListOf,
  queuedKeys,
  sectionsWithout,
  type QueueSpec,
} from './queueLists'
import {
  dragQueue,
  mergedQueue,
  mergingQueue,
  oneQueue,
  stackQueue,
  treeLeftQueue,
  treeQueue,
  twoLayers,
  twoQueues,
} from './queueSpecs'
import { flatSections, type TreeListView } from './subWorkspaceStates'

/**
 * The states of the list of Acme with its merge queues, as values of the
 * `mergeQueue` prop of the list: no queue, one queue with a layer in each
 * step, a merge of two layers, the queue after that merge, the list after
 * the last merge with no group, two queues, the group collapsed, a member
 * stack and its drag, the drag of an entry, a row of a section over the
 * group, the drop zone during a drag between sections and with a row over
 * it, a row that cannot join over the group, for another branch and for a
 * member without write access, and over the zone, a queued parent and a
 * queued sub-workspace, the trees after that parent left the queue, and
 * the menus of a row of a section and of a queued row.
 */
export const mergeQueueStates = [
  'none',
  'one',
  'merging',
  'merged',
  'empty',
  'two',
  'collapsed',
  'stack',
  'stack-drag',
  'reorder',
  'add',
  'zone',
  'add-empty',
  'refused-branch',
  'refused-access',
  'refused-zone',
  'trees',
  'trees-left',
  'menu',
  'menu-queued',
] as const

export type MergeQueueState = (typeof mergeQueueStates)[number]

/** The list of a state: its queues and what the view draws over them. */
type Scenario = {
  spec: QueueSpec
  /** The sections show the sub-workspaces of Acme in their trees. */
  trees?: boolean
  /** The workspaces that merged and left the queue, back in their sections. */
  merged?: readonly string[]
  collapsed?: boolean
  queueDrag?: QueueDrag
  drag?: ListDrag
  focus?: RowFocus
  /** Priya, a member with read access to acme/storefront, looks at the list. */
  member?: boolean
  /** The rows whose menus offer Add to merge queue, when not `joinable`. */
  queueable?: readonly string[]
}

/** The drag of a row that cannot join, with the reason in its words. */
function refusedDrag(workspace: string, refusal: JoinRefusal): QueueDrag {
  return { kind: 'refused', workspace, reason: joinRefusalText(refusal) }
}

const storefront = repositories.storefront

/** The workspaces of the queue of acme/storefront in most states. */
const storefrontKeys = [
  'next-16',
  'apple-pay',
  'checkout-autocomplete',
  'fix-cart-flake',
]

const scenarios: Readonly<Record<Exclude<MergeQueueState, 'none'>, Scenario>> =
  {
    one: { spec: oneQueue },
    merging: { spec: mergingQueue },
    merged: { spec: mergedQueue, merged: ['next-16', 'apple-pay'] },
    empty: { spec: [], merged: storefrontKeys },
    two: { spec: twoQueues },
    collapsed: { spec: twoQueues, collapsed: true },
    stack: { spec: stackQueue },
    'stack-drag': {
      spec: stackQueue,
      queueDrag: {
        kind: 'reorder',
        workspace: 'checkout-autocomplete',
        index: 0,
      },
    },
    reorder: {
      spec: dragQueue,
      queueDrag: {
        kind: 'reorder',
        workspace: 'checkout-autocomplete',
        index: 1,
      },
    },
    add: {
      spec: dragQueue,
      queueDrag: { kind: 'add', workspace: 'fix-cart-flake' },
    },
    zone: { spec: [], queueDrag: { kind: 'zone' }, drag: workspaceDrag },
    'add-empty': {
      spec: [],
      queueDrag: { kind: 'add', workspace: 'apple-pay' },
    },
    // The pull request of Fix flaky cart test targets the release branch.
    'refused-branch': {
      spec: dragQueue,
      queueDrag: refusedDrag('fix-cart-flake', {
        kind: 'other-branch',
        base: { text: releaseBranch },
        trunk: { text: storefront.defaultBranch },
      }),
      queueable: ['invoice-fonts'],
    },
    'refused-access': {
      spec: dragQueue,
      queueDrag: refusedDrag('fix-cart-flake', {
        kind: 'write-access',
        repository: storefront.name,
      }),
      member: true,
      queueable: [],
    },
    'refused-zone': {
      spec: [],
      queueDrag: refusedDrag('email-dark-mode', { kind: 'no-pull-request' }),
    },
    trees: { spec: treeQueue, trees: true },
    'trees-left': { spec: treeLeftQueue, trees: true },
    menu: {
      spec: twoLayers,
      focus: { workspace: 'checkout-autocomplete', drawing: { kind: 'menu' } },
    },
    'menu-queued': {
      spec: twoLayers,
      focus: { workspace: 'apple-pay', drawing: { kind: 'menu' } },
    },
  }

/**
 * The rows of the sections whose pull requests can join the queue of their
 * repository, for Cal, who has write access to each repository of Acme.
 */
const joinable = ['checkout-autocomplete', 'fix-cart-flake', 'invoice-fonts']

/** The sections of a state, without the workspaces that its queues hold. */
function sectionsOf(scenario: Scenario): SidebarSection[] {
  const queued = queuedKeys(scenario.spec)
  if (scenario.trees) return withTrees(flatSections(), parentOf, queued)
  // A merged workspace whose agent still worked shows ready after the merge.
  const merged = (scenario.merged ?? []).map((key) => {
    const workspace = queuedWorkspace(key)
    const status = workspace.status === 'working' ? 'ready' : workspace.status
    return { workspace: { ...workspace, github: 'merged' }, status } as const
  })
  return sectionsWithout(
    workspaceSections(undefined, undefined, merged),
    queued,
  )
}

/** The list of a state with its queues, and what lies over it. */
export type QueueListView = TreeListView & ListQueue

/**
 * The phone sheet of the menu that a right click opened on the drawn row,
 * in a section or in the Merge queue group.
 */
function sheetOf(view: Omit<QueueListView, 'over'>): ReactNode {
  const { focus } = view
  const rows = [
    ...view.sections.flatMap((item) => item.rows),
    ...(view.queue ? queueEntries(view.queue).map((entry) => entry.row) : []),
  ]
  const row = rows.find((item) => item.workspace.key === focus?.workspace)
  if (!row || focus?.drawing.kind !== 'menu') return null
  const open = rowControls(row, focus, {
    viewer: view.viewer,
    sections: view.sections.map((item) => item.section.key),
    readOnly: false,
    sheet: true,
    ...(queueActionsOf(view) ? { queue: queueActionsOf(view) } : {}),
  })?.open
  return open ? (
    <workspaceMenuSheet.Component
      menu={open}
      moklyInstance="workspace-menu-sheet"
    />
  ) : null
}

/**
 * The list that a state of the merge queue draws: its sections without the
 * queued workspaces, the Merge queue group, a drag, the row whose menu is
 * open, and on a phone the sheet of that menu. Nothing without a state.
 */
export function queueListView(
  state: MergeQueueState | undefined,
  viewport: Viewport,
): QueueListView | undefined {
  if (state === undefined || state === 'none') return undefined
  const scenario = scenarios[state]
  const queue = queueListOf(scenario.spec)
  const view = {
    sections: sectionsOf(scenario),
    queue: scenario.collapsed ? { ...queue, collapsed: true } : queue,
    queueable: scenario.queueable ?? joinable,
    viewer: viewerMembership(scenario.member ? 'member' : 'admin'),
    rail: acmeRail,
    ...(scenario.focus ? { focus: scenario.focus } : {}),
    ...(scenario.queueDrag ? { queueDrag: scenario.queueDrag } : {}),
    ...(scenario.drag ? { drag: scenario.drag } : {}),
  }
  return { ...view, over: viewport === 'mobile' ? sheetOf(view) : null }
}
