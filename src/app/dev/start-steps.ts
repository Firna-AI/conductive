import type { Repository } from '../../shared/org-settings'
import type {
  StartStep,
  WorkspaceResponse,
  WorkspaceStart,
} from '../../shared/workspaces'
import { changeWorkspace, requireWorkspace, type DevBackend } from './backend'
import { earlySessionOf } from '../../test-support/fake-import-routes'
import { RouteError } from './router'
import type { OrgState } from './state'

/** The time from the start of one step to the start of the next one. */
const STEP_MS = 1_200

/** A start step before it runs: its ID and its product text. */
interface PlannedStep {
  id: string
  label: string
}

/** A resume brings the files back as the user left them. */
const resumePlan: readonly PlannedStep[] = [
  { id: 'restore', label: 'Resuming with your files as you left them' },
]

/** The steps of the activation of a workspace from Conductor. */
const activationPlan: readonly PlannedStep[] = [
  { id: 'image', label: 'Starting from the newest image' },
  { id: 'import-software', label: 'Preparing the cloud computer' },
  { id: 'import-launch', label: 'Preparing the cloud computer' },
  { id: 'import-preflight', label: 'Checking space for your work' },
  { id: 'import-restore', label: 'Restoring your work' },
  { id: 'startup', label: 'Applying your startup script' },
  { id: 'runner', label: 'Starting the agent' },
]

/**
 * A new workspace starts from the org image, fetches, and makes its branch.
 * With `existing`, it fetches that branch and checks it out with tracking
 * instead, as the mockups draw it.
 */
export function createPlan(
  orgName: string,
  repository: Repository,
  branch: string,
  existing = false,
): PlannedStep[] {
  const image = {
    id: 'image',
    label: `Starting from the cloud computer of ${orgName}`,
  }
  if (existing) {
    return [
      image,
      { id: 'fetch', label: `Fetching ${branch} of ${repository.fullName}` },
      { id: 'branch', label: `Checking out ${branch} with tracking` },
    ]
  }
  return [
    image,
    {
      id: 'fetch',
      label: `Fetching ${repository.defaultBranch} of ${repository.fullName}`,
    },
    { id: 'branch', label: `Creating branch ${branch}` },
  ]
}

function running(step: PlannedStep, at: number): StartStep {
  return { ...step, state: 'running', startedAt: at, completedAt: null }
}

/** Stops the steps of a start that runs, as Archive does. */
export function cancelStart(org: OrgState, workspaceId: string): void {
  org.running.get(workspaceId)?.()
  org.running.delete(workspaceId)
}

function later(org: OrgState, workspaceId: string, run: () => void): void {
  const timer = setTimeout(() => {
    org.running.delete(workspaceId)
    run()
  }, STEP_MS)
  org.running.set(workspaceId, () => clearTimeout(timer))
}

/**
 * The last step is done, so the workspace is ready. A workspace from
 * Conductor records its successful activation.
 */
function finish(backend: DevBackend, org: OrgState, workspaceId: string): void {
  const current = org.workspaces.find((item) => item.id === workspaceId)
  if (!current) return
  org.starts.set(workspaceId, { start: null, error: null })
  const origin = current.conductorImport
  changeWorkspace(backend, org, {
    ...current,
    state: 'ready',
    updatedAt: backend.now(),
    ...(origin
      ? {
          conductorImport: {
            ...origin,
            activatedAt: origin.activatedAt ?? backend.now(),
          },
        }
      : {}),
  })
}

/**
 * Runs the steps of a start. The first step runs at once, and the answer
 * holds it. About every 1.2 s a step completes and the next one starts,
 * and a `start.updated` event tells the open tabs. After the last step,
 * a `workspace.updated` event says that the workspace is ready.
 */
export function runStart(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  kind: WorkspaceStart['kind'],
  plan: readonly PlannedStep[],
): WorkspaceStart {
  cancelStart(org, workspaceId)
  const startedAt = backend.now()
  let start: WorkspaceStart = {
    kind,
    startedAt,
    steps: [running(plan[0], startedAt)],
  }
  org.starts.set(workspaceId, { start, error: null })
  const complete = (index: number) => {
    const at = backend.now()
    const steps = start.steps.map((step, position): StartStep =>
      position === index
        ? { ...step, state: 'completed', completedAt: at }
        : step,
    )
    const last = index === plan.length - 1
    start = {
      ...start,
      steps: last ? steps : [...steps, running(plan[index + 1], at)],
    }
    org.starts.set(workspaceId, { start, error: null })
    backend.emit(workspaceId, { type: 'start.updated', start })
    if (last) finish(backend, org, workspaceId)
    else later(org, workspaceId, () => complete(index + 1))
  }
  later(org, workspaceId, () => complete(0))
  return start
}

/** The error of a first start that failed, as the Worker saves it. */
const startFailure = {
  code: 'workspace_start_failed',
  message: 'The cloud computer could not start. Try again.',
  log: null,
}

/**
 * The first start of a new workspace fails at its first step, as a cloud
 * computer that did not start: the workspace shows the error state with
 * the saved error, and Try again starts it again.
 */
export function failFirstStart(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  plan: readonly PlannedStep[],
): Pick<WorkspaceResponse, 'start' | 'error'> {
  cancelStart(org, workspaceId)
  const at = backend.now()
  const failed: StartStep = {
    ...plan[0],
    state: 'failed',
    startedAt: at,
    completedAt: at,
  }
  const record = {
    start: { kind: 'create', startedAt: at, steps: [failed] },
    error: startFailure,
  } satisfies Pick<WorkspaceResponse, 'start' | 'error'>
  org.starts.set(workspaceId, record)
  const current = requireWorkspace(org, workspaceId)
  changeWorkspace(backend, org, { ...current, state: 'error', updatedAt: at })
  return record
}

/**
 * Resume of a stopped workspace, and Try again after a start that failed.
 * A recorded start, which has no steps that run, starts again too.
 */
export function resumeWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): void {
  const current = requireWorkspace(org, workspaceId)
  const stuck = current.state === 'starting' && !org.running.has(workspaceId)
  if (current.state !== 'stopped' && current.state !== 'error' && !stuck) {
    return
  }
  runStart(backend, org, workspaceId, 'resume', resumePlan)
  // The time of a change keeps the last one as its minimum, as the Worker
  // does, so a Resume orders after the Restore of the same tick.
  changeWorkspace(backend, org, {
    ...current,
    state: 'starting',
    updatedAt: Math.max(backend.now(), current.updatedAt),
  })
}

/**
 * Activate of a workspace from Conductor before a successful activation:
 * its first start, with the steps of an activation. A repeat while it runs
 * joins it. It refuses a workspace that came from no import, or one that
 * an activation already brought in, as the Worker does.
 */
export function activateWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): string {
  const current = requireWorkspace(org, workspaceId)
  if (current.conductorImport?.activatedAt !== null) {
    throw new RouteError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  if (current.state === 'starting' && org.running.has(workspaceId)) {
    return earlySessionOf(current, backend.state.account.user, 0).id
  }
  runStart(backend, org, workspaceId, 'create', activationPlan)
  changeWorkspace(backend, org, {
    ...current,
    state: 'starting',
    updatedAt: Math.max(backend.now(), current.updatedAt),
  })
  // The early session of the person who activates, as the Worker stores it.
  const session = earlySessionOf(
    current,
    backend.state.account.user,
    backend.now(),
  )
  backend.emit(workspaceId, { type: 'session.updated', session })
  return session.id
}

/** The `stop` preview: the sandbox stops while its workspace is open. */
export function stopLater(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  wait: number,
): void {
  setTimeout(() => {
    const current = org.workspaces.find((item) => item.id === workspaceId)
    if (
      !current ||
      current.state === 'archived' ||
      current.state === 'stopped'
    ) {
      return
    }
    cancelStart(org, workspaceId)
    org.starts.set(workspaceId, { start: null, error: null })
    changeWorkspace(backend, org, { ...current, state: 'stopped' })
  }, wait)
}
