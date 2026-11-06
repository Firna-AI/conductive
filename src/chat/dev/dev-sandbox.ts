import type { UserMessage } from '../../shared/messages'
import type {
  StartStep,
  WorkspaceResponse,
  WorkspaceState,
} from '../../shared/workspaces'
import type { DevBackend } from './dev-backend'

function setState(backend: DevBackend, state: WorkspaceState): void {
  backend.workspace = {
    ...backend.workspace,
    state,
    updatedAt: backend.clock.now(),
  }
  backend.stream.emit({
    type: 'workspace.updated',
    workspace: backend.workspace,
  })
  backend.sync()
}

function later(backend: DevBackend, delay: number, run: () => void): void {
  backend.timers.push(window.setTimeout(run, delay))
}

/** Resume: the sandbox starts again with its files, then becomes ready. */
export function resume(backend: DevBackend): WorkspaceResponse {
  const now = backend.clock.now()
  backend.start = {
    kind: 'resume',
    startedAt: now,
    steps: [
      {
        id: 'restore',
        label: 'Resuming with your files as you left them',
        state: 'running',
        startedAt: now,
        completedAt: null,
      },
    ],
  }
  setState(backend, 'starting')
  backend.stream.emit({ type: 'start.updated', start: backend.start })
  later(backend, 2_500, () => makeReady(backend))
  return { workspace: backend.workspace, start: backend.start, error: null }
}

function addStep(backend: DevBackend, id: string, label: string): void {
  const start = backend.start
  if (!start) return
  const now = backend.clock.now()
  const done = start.steps.map((step): StartStep => ({
    ...step,
    state: 'completed',
    completedAt: now,
  }))
  const step: StartStep = {
    id,
    label,
    state: 'running',
    startedAt: now,
    completedAt: null,
  }
  backend.start = { ...start, steps: [...done, step] }
  backend.stream.emit({ type: 'start.updated', start: backend.start })
  backend.sync()
}

/**
 * Finishes the start: the steps of a new workspace one by one, then a ready
 * sandbox, which gives each queued message to the agent.
 */
export function makeReady(backend: DevBackend): void {
  if (backend.start?.kind === 'create') {
    later(backend, 0, () =>
      addStep(backend, 'fetch', 'Fetching main of acme/storefront'),
    )
    later(backend, 900, () =>
      addStep(backend, 'branch', `Creating branch ${backend.workspace.branch}`),
    )
  }
  later(backend, backend.start?.kind === 'create' ? 1_800 : 0, () => {
    setState(backend, 'ready')
    const bySession = new Map<string, UserMessage[]>()
    for (const message of backend.queue) {
      bySession.set(message.sessionId, [
        ...(bySession.get(message.sessionId) ?? []),
        message,
      ])
    }
    backend.queue = []
    for (const [sessionId, messages] of bySession) {
      backend.agent.start(sessionId, messages)
    }
  })
}

export function stopSandbox(backend: DevBackend): void {
  setState(backend, 'stopped')
}

export function failStart(backend: DevBackend): void {
  setState(backend, 'error')
}

/** The title that the agent writes after its first answer in a new workspace. */
export function writeTitle(backend: DevBackend, name: string): void {
  backend.workspace = { ...backend.workspace, name }
  backend.stream.emit({ type: 'workspace.title', name })
  backend.sync()
}
