import { useEffect, useMemo } from 'react'
import { routes } from '../../../../app/router'
import type { PreviewServices } from '../../../../previews/services/servicesPart'
import { servicesView } from '../../../../previews/services/servicesState'
import type { ServicesStore } from '../../../../previews/services/servicesStore'
import { useApp } from '../../../context'
import type { WorkspaceContext } from '../../features'
import { mayRestartSoftware } from '../../restart-access'
import { shownWorkspaces } from '../../tab-memory'
import { ServiceSection } from './ServiceSection'

/**
 * The kept services of the open workspace: one store for each shown
 * workspace, which the Preview tool reads. It connects nothing:
 * `useServicesConnection` of the screen connects it.
 */
function useKeptServices(context: WorkspaceContext): ServicesStore {
  const app = useApp()
  const { viewer, org, workspace } = context
  return useMemo(
    () => shownWorkspaces(app, viewer).services(org.id, workspace.id),
    [app, viewer, org.id, workspace.id],
  )
}

/**
 * The one connection of the kept services, for the whole screen. It runs
 * while the computer runs, so it is one running period: a stop ends it and
 * forgets the list, and the next start reads the list again. It takes the
 * events of the tools, so each report of the ports reads the list again.
 */
export function useServicesConnection(context: WorkspaceContext): void {
  const store = useKeptServices(context)
  const subscribe = context.toolEvents
  const runs = context.sandbox === 'ready'
  useEffect(
    () => (runs ? store.connect(subscribe) : undefined),
    [store, subscribe, runs],
  )
}

/**
 * The services of the Preview tool of the workspace. While `shown`, the
 * list reads again on the timer of the store and at each return to the
 * page. Stop and Restart follow the rule of Restart in the header.
 */
export function usePreviewServices(
  context: WorkspaceContext,
  shown: boolean,
): PreviewServices {
  const store = useKeptServices(context)
  useEffect(() => (shown ? store.watch() : undefined), [store, shown])
  const controls = mayRestartSoftware(context.readOnly, context.workspace.state)
  const { org, workspace } = context
  return useMemo(
    () => ({
      store,
      section: (state, ports) => {
        const view = servicesView(state)
        if (view.kind === 'none') return null
        return (
          <ServiceSection
            controls={controls}
            ports={ports}
            sessionHref={(sessionId) =>
              routes.session(org.id, workspace.id, sessionId)
            }
            state={state}
            store={store}
            view={view}
          />
        )
      },
    }),
    [store, controls, org.id, workspace.id],
  )
}
