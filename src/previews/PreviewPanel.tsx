import { CircleAlert } from 'lucide-react'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { ToolRoot } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from '../terminal/tool-parts/ToolStates'
import { PortsNotice } from './PortsNotice'
import { PreviewOpenForm } from './PreviewOpenForm'
import {
  panelPortList,
  visiblePreviews,
  type PreviewsAction,
  type PreviewsState,
} from './previewsState'
import { useServicesState, type PreviewServices } from './services/servicesPart'
import { ownedPorts } from './services/servicesState'

export interface PreviewPanelProps {
  state: PreviewsState
  dispatch: (action: PreviewsAction) => void
  /** The port whose Preview tab shows in the centre, or null. */
  current: number | null
  /** The ports of the Preview tabs of the row, in their order. */
  tabPorts: readonly number[]
  /**
   * Shows the Preview tab of a port, or opens one. The tab opens the
   * preview of the port when it has none.
   */
  onShow: (port: number) => void
  /** The time now, for the age of the notice of a failed repair. */
  now?: () => number
  /** The services of the workspace, above the servers. */
  services?: PreviewServices
}

/**
 * The Preview tool of the desktop (decisions 290 and 291). Each port has its
 * own Preview tab in the centre row, which holds the page, Reload, and Open.
 * So the tool has no bar and no frame. It always shows the port form: each
 * server of the report, then each port with a tab or an open preview that
 * the report does not name. A click on a port, or a typed port, shows its
 * Preview tab, or opens one. The row of the shown tab is the current one.
 * Nothing in the tool ends a preview (decision 292).
 */
export function PreviewPanel(props: PreviewPanelProps) {
  const { state, dispatch } = props
  const servicesState = useServicesState(props.services)
  let content
  if (state.load?.state === 'loading') {
    content = <ToolWaiting label="Loading previews" />
  } else if (state.load?.state === 'failed') {
    content = (
      <ToolMessage
        action={
          <ToolButton onPress={() => dispatch({ type: 'load' })}>
            Try again
          </ToolButton>
        }
        alert
        body={state.load.error.message}
        icon={CircleAlert}
        title="The previews couldn't load"
      />
    )
  } else {
    const visible = visiblePreviews(state)
    content = (
      <>
        <PreviewOpenForm
          current={props.current}
          error={state.openError}
          list={panelPortList(
            state,
            visible,
            props.tabPorts,
            ownedPorts(servicesState),
          )}
          onOpen={props.onShow}
          opening={state.opening}
          services={
            props.services?.section(servicesState, {
              current: props.current,
              opening: state.opening,
              onOpen: props.onShow,
            }) ?? null
          }
        />
        {state.portsFailedAt === null ? null : (
          <PortsNotice at={state.portsFailedAt} now={props.now ?? Date.now} />
        )}
      </>
    )
  }
  return <ToolRoot touch={false}>{content}</ToolRoot>
}
