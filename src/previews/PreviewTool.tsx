import { useCallback } from 'react'
import { CircleAlert } from 'lucide-react'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../app/workspace-store'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { ToolRoot } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from '../terminal/tool-parts/ToolStates'
import {
  workspaceKey,
  type ToolWorkspace,
} from '../terminal/tool-parts/workspace'
import { PortsNotice } from './PortsNotice'
import { usePreviewActions } from './previewActions'
import { PreviewFrame } from './PreviewFrame'
import { PreviewOpenForm } from './PreviewOpenForm'
import { PreviewToolbar } from './PreviewToolbar'
import { portFormList } from './previewsState'
import { createPreviewsStore, type PreviewsStore } from './previewsStore'
import { useServicesState, type PreviewServices } from './services/servicesPart'
import { ownedPorts } from './services/servicesState'
import styles from './PreviewTool.module.css'

/**
 * The app shell's addresses of the preview tabs. Tabs are links, so each
 * preview has an address in the browser history.
 */
export interface PreviewRoute {
  /** The preview that the current address names, or null. */
  previewId: string | null
  /**
   * The port of the sandbox that the current address names, or null. The
   * tool shows the open preview of the port, or opens it, then replaces
   * the address.
   */
  port: number | null
  /** The address of the tab of one preview. */
  href: (previewId: string) => string
  /** Goes to the address of one preview without a page load. */
  navigate: (previewId: string) => void
  /**
   * Puts the address of one preview, or of the tool for null, in place of
   * the current address, with no new entry in the browser history.
   */
  replace: (previewId: string | null) => void
}

export interface PreviewToolProps {
  workspace: ToolWorkspace
  route: PreviewRoute
  /** A phone layout: touch sizes. */
  touch: boolean
  /**
   * The time now, for the age of the notice of a failed repair of the list.
   * Give a stable function. The default is the clock of the browser.
   */
  now?: () => number
  /**
   * A store that the app keeps and connects for the workspace, which other
   * parts read too. The tool then reads it and connects nothing. Without
   * it, the tool makes its own store and connects it while it shows.
   */
  store?: PreviewsStore
  /**
   * The services of the workspace, which the form lists above the servers,
   * also after "+" for a port with an open preview. Without them, the tool
   * shows no services.
   */
  services?: PreviewServices
}

/** The connect of a store that the app connects itself. */
function connectNothing(): () => void {
  return () => undefined
}

/**
 * The Preview tool: the web servers of the sandbox, each in a frame with an
 * "Open" link to a new tab. The user opens a preview by its port, by a
 * click on a server that the runner reports, or by an address that names
 * the port.
 */
export function PreviewTool(props: PreviewToolProps) {
  return <PreviewToolBody key={workspaceKey(props.workspace)} {...props} />
}

function PreviewToolBody(props: PreviewToolProps) {
  const { workspace, route } = props
  const { fetch, subscribe } = workspace
  const kept = props.store
  const connectOwn = useCallback(
    (store: PreviewsStore) => store.connect({ fetch, subscribe }),
    [fetch, subscribe],
  )
  const create = useCallback(
    (identity: WorkspaceIdentity) => kept ?? createPreviewsStore(identity),
    [kept],
  )
  const { store, snapshot: state } = useWorkspaceStore(workspace, {
    create,
    connect: kept ? connectNothing : connectOwn,
  })
  const { dispatch } = store
  const { visible, selected, open, follow, add, close } = usePreviewActions(
    workspace,
    route,
    state,
    dispatch,
  )
  const servicesState = useServicesState(props.services)

  const reloadList = () => dispatch({ type: 'load' })

  let content
  if (state.load?.state === 'loading') {
    content = <ToolWaiting label="Loading previews" />
  } else if (state.load?.state === 'failed') {
    content = (
      <ToolMessage
        action={<ToolButton onPress={reloadList}>Try again</ToolButton>}
        alert
        body={state.load.error.message}
        icon={CircleAlert}
        title="The previews couldn't load"
      />
    )
  } else {
    // The notice of a failed repair stands beside the list, so it shows
    // only with the form, and never over a preview in its frame.
    const form = (
      <>
        <PreviewOpenForm
          error={state.openError}
          list={portFormList(state, visible, ownedPorts(servicesState))}
          onOpen={open}
          opening={state.opening}
          services={
            props.services?.section(servicesState, {
              current: null,
              opening: state.opening,
              onOpen: open,
            }) ?? null
          }
        />
        {state.portsFailedAt === null ? null : (
          <PortsNotice at={state.portsFailedAt} now={props.now ?? Date.now} />
        )}
      </>
    )
    // A tab closes its preview also when it is not the shown tab, so the
    // error names the port of the preview that stays open.
    const failedClose = state.closeError
    const unclosed = failedClose
      ? visible.find((preview) => preview.id === failedClose.previewId)
      : undefined
    content =
      visible.length === 0 ? (
        form
      ) : (
        <>
          <PreviewToolbar
            closing={state.closing}
            href={route.href}
            onAdd={add}
            onClose={close}
            onFollow={follow}
            onReload={() => dispatch({ type: 'reload' })}
            ports={state.ports}
            previews={visible}
            selected={selected}
          />
          {failedClose && unclosed ? (
            <p className={styles.error} role="alert">
              The preview of port {unclosed.port} couldn&apos;t close.{' '}
              {failedClose.error.message}
            </p>
          ) : null}
          {selected ? (
            <div className={styles.frame}>
              <PreviewFrame
                key={`${selected.id}:${state.reloads}`}
                preview={selected}
              />
            </div>
          ) : (
            form
          )}
        </>
      )
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
