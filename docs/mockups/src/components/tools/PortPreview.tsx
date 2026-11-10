import { Plus, RotateCw, X } from 'lucide-react'
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
import { LinkTabs } from '../common/LinkTabs'
import { ScreenLink } from '../common/ScreenLink'
import { PortMessage, ServerList } from './PortForm'
import { portFormCopy, previewTabLabel, serverDescription } from './previewCopy'
import { StorefrontPage } from './StorefrontPage'
import styles from './PortPreview.module.css'

/**
 * The states of the Preview tool: a preview in its frame, or "+" beside
 * the tabs of the open previews. With no preview open, the port form lists
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
 */
function previewTabs(adding: boolean) {
  return openPorts.map((port) => {
    const server = detectedServers.find((each) => each.port === port)
    return {
      label: previewTabLabel(port, server),
      title: server ? serverDescription(server) : undefined,
      to: paths.preview,
      selected: !adding && port === openPort,
    }
  })
}

/**
 * The open previews of the sandbox. A preview shows in a frame, with a link
 * to a new tab. After "+", no tab is current, and the port form lists the
 * servers that have no preview yet.
 */
function PortPreview(props: { adding: boolean }) {
  const { adding } = props
  const unopened = detectedServers.filter(
    (server) => !openPorts.includes(server.port),
  )
  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        {/* Beside the actions of the frame, two named tabs do not fit. */}
        <LinkTabs
          fadeEnd={!adding}
          label="Previews"
          tabs={previewTabs(adding)}
        />
        {adding ? (
          <IconButton icon={Plus} label="Preview another port" pressed />
        ) : (
          <ScreenLink asChild to={paths.previewAnotherPort}>
            <IconButton icon={Plus} label="Preview another port" />
          </ScreenLink>
        )}
        <span className={styles.spacer} />
        {adding ? null : (
          <>
            <IconButton icon={RotateCw} label="Reload" />
            <span className={styles.link}>
              <ExternalLink href={previewUrl} label="Open in new tab">
                Open
              </ExternalLink>
            </span>
            <IconButton icon={X} label="Close preview" />
          </>
        )}
      </div>
      {adding ? (
        <ServerList servers={unopened} />
      ) : (
        <div className={styles.frame}>
          <StorefrontPage />
        </div>
      )}
    </div>
  )
}

/** The Preview tool in one of its states. */
export function PreviewTool(props: { state: PreviewState }) {
  switch (props.state) {
    case 'open':
      return <PortPreview adding={false} />
    case 'adding':
      return <PortPreview adding />
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
