import { useNavigation } from '../../../app/navigation'
import { useServices } from '../../../app/services'
import { PreviewPanel } from '../../../previews/PreviewPanel'
import type { PreviewServices } from '../../../previews/services/servicesPart'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { previewPortHref } from '../tools/tool-address'
import { usePreviewsState } from './kept-previews'
import { previewTabPort, previewTabsOf } from './preview-place'

/**
 * The Preview tool of the desktop over the kept previews of the workspace,
 * with its services above the servers. A click on a port goes to the
 * address of its Preview tab, which shows the tab or opens one, as the
 * address of a local address in chat does.
 */
export function PanelPreviews(props: {
  context: WorkspaceContext
  services: PreviewServices
}) {
  const { context } = props
  const navigation = useNavigation()
  const { now } = useServices()
  const { store, state } = usePreviewsState(context)
  const tabs = previewTabsOf(useSavedView(context.savedView))
  const { org, workspace } = context
  return (
    <PreviewPanel
      current={previewTabPort(context)}
      dispatch={store.dispatch}
      now={now}
      onShow={(port) =>
        navigation.push(previewPortHref(org.id, workspace.id, port))
      }
      services={props.services}
      state={state}
      tabPorts={tabs.map((tab) => tab.port)}
    />
  )
}
