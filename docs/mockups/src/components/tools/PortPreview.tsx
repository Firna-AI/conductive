import { Plus, RotateCw } from 'lucide-react'
import {
  detectedServers,
  openPort,
  openPorts,
  previewUrl,
  serversUnavailable,
} from '../../fixtures/previews'
import { paths } from '../../paths'
import { LostUpdateRow } from '../chat/LostUpdate'
import { IconButton } from '../common/actions'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { PortMessage, ServerList } from './PortForm'
import { PreviewTabs } from './PreviewTabs'
import { portFormCopy, previewTabLabel, serverDescription } from './previewCopy'
import { StorefrontPage } from './StorefrontPage'
import styles from './PortPreview.module.css'

/**
 * The states of the Preview tool: open previews, or on a phone "+" beside
 * their tabs. A phone shows the open preview in a frame of the tool, and
 * the desktop in the Preview tab of the centre row. With no preview open,
 * the port form lists
 * the servers that the runner detects, says that it reports none, or reads
 * as before when the app has no report, as for an older image. After a
 * failed repair of the list, the form keeps its last list under a notice.
 */
export const previewStates = [
  'open',
  'adding',
  'detected',
  'no-servers',
  'no-report',
  'repair-failed',
] as const

export type PreviewState = (typeof previewStates)[number]

/**
 * A tab for each open preview: the port and the cut name of its server.
 * The tooltip and the spoken name give the full name and the folder.
 * `current` is the port of the preview that shows, or null for none.
 */
function previewTabs(current: number | null) {
  return openPorts.map((port) => {
    const server = detectedServers.find((each) => each.port === port)
    return {
      label: previewTabLabel(port, server),
      title: server ? serverDescription(server) : undefined,
      to: paths.preview,
      selected: port === current,
    }
  })
}

/**
 * Reload and Open of the page that shows. Open opens `href` in a new tab:
 * by default the launch address of the open port preview.
 */
export function PreviewActions(props: { href?: string }) {
  return (
    <>
      <IconButton icon={RotateCw} label="Reload" />
      <span className={styles.link}>
        <ExternalLink href={props.href ?? previewUrl} label="Open in new tab">
          Open
        </ExternalLink>
      </span>
    </>
  )
}

/**
 * The open previews on a phone. A preview shows in a frame, with a link to
 * a new tab. Each tab closes its preview with the Close button beside its
 * label. After "+", no tab is current, and the port form lists the servers
 * that have no preview yet.
 */
function PhonePreview(props: { adding: boolean }) {
  const { adding } = props
  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        {/* Beside the actions of the frame, two named tabs do not fit. */}
        <PreviewTabs
          fadeEnd={!adding}
          tabs={previewTabs(adding ? null : openPort)}
        />
        {adding ? (
          <IconButton icon={Plus} label="Preview another port" pressed />
        ) : (
          <ScreenLink asChild to={paths.previewAnotherPort}>
            <IconButton icon={Plus} label="Preview another port" />
          </ScreenLink>
        )}
        <span className={styles.spacer} />
        {adding ? null : <PreviewActions />}
      </div>
      {adding ? (
        <ServerList servers={unopened()} />
      ) : (
        <div className={styles.frame}>
          <StorefrontPage />
        </div>
      )}
    </div>
  )
}

/**
 * The tool in the tools panel of the desktop (decisions 290 and 291). It
 * has no bar: each port has its own Preview tab in the centre row, with
 * Reload and Open in the bar of that tab. The tool lists each port, also
 * the ports that have a tab. A click on a port shows its tab, or opens one.
 * The row of the shown tab is the current one. The user does not end a
 * preview: it ends by itself when the cloud computer stops (decisions 292
 * and 294).
 */
function PanelPreview(props: { shown: number | null }) {
  return (
    <div className={styles.preview}>
      <ServerList current={props.shown} servers={detectedServers} />
    </div>
  )
}

/** The servers that have no preview yet, in the order of their ports. */
function unopened() {
  return detectedServers.filter((server) => !openPorts.includes(server.port))
}

/**
 * The Preview tool in one of its states. `frame` draws the page in the
 * tool, as a phone does. Without it, the page shows in the Preview tab of
 * its port in the centre row. On desktop, "+" and its `adding` state do not exist, so
 * `adding` draws the open previews.
 */
export function PreviewTool(props: {
  state: PreviewState
  frame: boolean
  /** The port of the Preview tab that shows on desktop, or null. */
  shownPort: number | null
}) {
  const open = props.frame ? (
    <PhonePreview adding={props.state === 'adding'} />
  ) : (
    <PanelPreview shown={props.shownPort} />
  )
  switch (props.state) {
    case 'open':
    case 'adding':
      return open
    case 'detected':
      return <ServerList servers={detectedServers} />
    case 'no-servers':
      return <PortMessage body={portFormCopy.noServers} />
    case 'no-report':
      return <PortMessage body={portFormCopy.body} />
    case 'repair-failed':
      // The notice joins the list, as the notice of a file list joins the
      // file lists. The last list and the field stay usable.
      return (
        <>
          <ServerList servers={detectedServers} />
          <LostUpdateRow repair={serversUnavailable} />
        </>
      )
  }
}
