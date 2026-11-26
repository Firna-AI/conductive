import type { ServiceCatalogue } from '../../shared/generated/ServiceCatalogue'
import type { ServiceCatalogueSnapshot } from '../../shared/generated/ServiceCatalogueSnapshot'
import type { ServiceControlAction } from '../../shared/generated/ServiceControlAction'
import type { ServiceTarget } from '../../shared/generated/ServiceTarget'
import type { ToolError } from '../../terminal/tool-parts/request'

/** The services of one workspace in one running period of its computer. */
export interface ServicesState {
  /** The latest answer of the period, or null before its first answer. */
  catalogue: ServiceCatalogue | null
  /** The error of a read that failed before the first answer, or null. */
  failed: ToolError | null
  /** The Stop or Restart that runs for each observed run, by `runKey`. */
  pending: ReadonlyMap<string, ServiceControlAction>
}

export type ServicesAction =
  | { type: 'loaded'; catalogue: ServiceCatalogue }
  | { type: 'load-failed'; error: ToolError }
  /** The running period ended: its list goes, and the next one reads again. */
  | { type: 'ended' }
  | { type: 'control'; key: string; action: ServiceControlAction }
  | { type: 'controlled'; key: string }

export const initialServices: ServicesState = {
  catalogue: null,
  failed: null,
  pending: new Map(),
}

/**
 * The key of one observed run: the run of the computer, the service, and
 * the run of the service. A newer run of the service has another key, so it
 * takes no Stop or Restart of an older run.
 */
export function runKey(target: ServiceTarget): string {
  return JSON.stringify([target.bootId, target.serviceId, target.generation])
}

/**
 * What the Services part shows: nothing, as for older software, a stopped
 * computer, or a list that loads; the list of a report; or the notice of a
 * first read that failed.
 */
export type ServicesView =
  | { kind: 'none' }
  | { kind: 'list'; snapshot: ServiceCatalogueSnapshot }
  | { kind: 'failed'; error: ToolError }

export function servicesView(state: ServicesState): ServicesView {
  const { catalogue } = state
  if (catalogue?.state === 'ready')
    return { kind: 'list', snapshot: catalogue.snapshot }
  if (catalogue === null && state.failed !== null)
    return { kind: 'failed', error: state.failed }
  return { kind: 'none' }
}

const noPorts: ReadonlySet<number> = new Set()

/** The ports that the shown rows list. Servers leaves them out. */
export function ownedPorts(state: ServicesState): ReadonlySet<number> {
  const view = servicesView(state)
  if (view.kind !== 'list') return noPorts
  return new Set(view.snapshot.services.flatMap((row) => row.ports))
}

function withPending(
  state: ServicesState,
  change: (pending: Map<string, ServiceControlAction>) => void,
): ServicesState {
  const pending = new Map(state.pending)
  change(pending)
  return { ...state, pending }
}

/**
 * Each answer replaces the list. A read that fails keeps a list that shows,
 * with no notice, as the other lists of the app do. Only a read that fails
 * before the first answer shows its error.
 */
export function servicesReducer(
  state: ServicesState,
  action: ServicesAction,
): ServicesState {
  switch (action.type) {
    case 'loaded':
      return { ...state, catalogue: action.catalogue, failed: null }
    case 'load-failed':
      return state.catalogue === null
        ? { ...state, failed: action.error }
        : state
    case 'ended':
      if (state.catalogue === null && state.failed === null) return state
      return { ...state, catalogue: null, failed: null }
    case 'control':
      return withPending(state, (pending) =>
        pending.set(action.key, action.action),
      )
    case 'controlled':
      return withPending(state, (pending) => pending.delete(action.key))
  }
}
